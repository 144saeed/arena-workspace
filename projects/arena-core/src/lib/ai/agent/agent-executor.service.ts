import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AiGatewayService } from '../ai-gateway.service';
import { AiToolRegistryService } from './ai-tool-registry.service';
import { AiRequestDto } from '../../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../../contracts/dtos/ai-response.dto';
import { AiMessageDto } from '../../contracts/dtos/ai-message.dto';
import { AiMessagePartDto } from '../../contracts/dtos/ai-message-part.dto';
import { FrameworkError } from '../../exceptions/framework-error.exception';

/**
 * The Orchestrator Engine for Autonomous AI Agents.
 * Now fully supports multimodal parts, structured tool results, semantic error halting,
 * parallel tool execution, and secure task cancellation via AbortSignal.
 */
@Injectable({
  providedIn: 'root'
})
export class AgentExecutorService {

  private readonly DEFAULT_MAX_ITERATIONS = 3;

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly toolRegistry: AiToolRegistryService
  ) { }

  async executeTask(
    request: AiRequestDto,
    targetProfileId?: string,
    maxIterations: number = this.DEFAULT_MAX_ITERATIONS,
    abortSignal?: AbortSignal
  ): Promise<AiResponseDto> {

    let currentRequest: AiRequestDto = {
      ...request,
      tools: (request.tools && request.tools.length > 0)
        ? request.tools
        : this.toolRegistry.getRegisteredTools()
    };

    let iterationCount = 0;

    while (iterationCount < maxIterations) {
      // 1. Blackhole Check: Immediately halt if the user or system cancelled the operation
      if (abortSignal?.aborted) {
        throw new FrameworkError('AGENT_ABORTED', 'Agent execution was cancelled.', false);
      }

      iterationCount++;

      const response = await firstValueFrom(this.gateway.dispatch(currentRequest, targetProfileId));

      if (!response) {
        throw new FrameworkError('AGENT_EMPTY_RESPONSE', 'Execution failed: AI returned an empty response.', true);
      }

      if (response.toolCalls && response.toolCalls.length > 0) {

        const assistantParts: AiMessagePartDto[] = [];
        if (response.content) {
          assistantParts.push({ type: 'text', text: response.content });
        }
        response.toolCalls.forEach(call => {
          assistantParts.push({ type: 'tool-call', toolCall: call });
        });

        const aiMessage: AiMessageDto = {
          role: 'assistant',
          parts: assistantParts
        };

        currentRequest = {
          ...currentRequest,
          messages: [...currentRequest.messages, aiMessage]
        };

        const toolResultsParts: AiMessagePartDto[] = [];
        let hasFatalError = false;
        let fatalErrorMessage = '';

        // 2. Parallel Execution: Fire all tools simultaneously to prevent sequential bottlenecks
        const executionPromises = response.toolCalls.map(async (toolCall) => {
          console.log(`[Agent Executor] Iteration ${iterationCount}: Executing tool '${toolCall.name}'...`);
          // Pass the abort signal down so local tools can cancel their own long-running tasks
          const result = await this.toolRegistry.executeTool(toolCall.name, toolCall.arguments, abortSignal);
          return { toolCall, result };
        });

        // Wait for all tools in this batch to complete
        const executionResults = await Promise.all(executionPromises);

        // Process the parallel results sequentially to update the payload and check for fatal errors
        for (const { toolCall, result } of executionResults) {
          const resultPayload = result.status === 'success'
            ? result.data
            : { error: result.errorMessage, suggestion: 'Please fix the parameters or try a different approach.' };

          toolResultsParts.push({
            type: 'tool-result',
            toolCallId: toolCall.name,
            toolResult: typeof resultPayload === 'string' ? resultPayload : JSON.stringify(resultPayload)
          });

          if (result.status === 'fatal_error') {
            hasFatalError = true;
            fatalErrorMessage = result.errorMessage || 'Unknown fatal tool error';
          }
        }

        const toolMessage: AiMessageDto = {
          role: 'tool',
          parts: toolResultsParts
        };

        currentRequest = {
          ...currentRequest,
          messages: [...currentRequest.messages, toolMessage]
        };

        if (hasFatalError) {
          throw new FrameworkError('AGENT_FATAL_TOOL_ERROR', `Agent halted due to a fatal error in tool execution: ${fatalErrorMessage}`, false);
        }

        continue;
      }

      console.log(`[Agent Executor] Task completed successfully in ${iterationCount} iterations.`);
      return response;
    }

    throw new FrameworkError('AGENT_MAX_ITERATIONS', `Task halted: Maximum agent iterations (${maxIterations}) exceeded.`, false);
  }
}