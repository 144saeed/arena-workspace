import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AiGatewayService } from '../ai-gateway.service';
import { AiToolRegistryService } from './ai-tool-registry.service';
import { AiRequestDto } from '../../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../../contracts/dtos/ai-response.dto';
import { AiMessageDto } from '../../contracts/dtos/ai-message.dto';
import { AiMessagePartDto } from '../../contracts/dtos/ai-message-part.dto';
import { FrameworkError } from '../../exceptions/framework-error.exception';

@Injectable({
  providedIn: 'root'
})
export class AgentExecutorService {

  // ARCHITECTURE FIX: Increased default iterations to support complex reasoning chains
  private readonly DEFAULT_MAX_ITERATIONS = 5;

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly toolRegistry: AiToolRegistryService
  ) { }

  async executeTask(
    request: AiRequestDto, targetProfileId?: string, maxIterations: number = this.DEFAULT_MAX_ITERATIONS, abortSignal?: AbortSignal
  ): Promise<AiResponseDto> {

    let currentRequest: AiRequestDto = {
      ...request,
      tools: (request.tools && request.tools.length > 0) ? request.tools : this.toolRegistry.getRegisteredTools()
    };

    let iterationCount = 0;

    while (iterationCount < maxIterations) {
      if (abortSignal?.aborted) throw new FrameworkError('AGENT_ABORTED', 'Agent execution was cancelled.', false);

      iterationCount++;
      const response = await firstValueFrom(this.gateway.dispatch(currentRequest, targetProfileId, abortSignal));

      if (!response) throw new FrameworkError('AGENT_EMPTY_RESPONSE', 'Execution failed: AI returned an empty response.', true);

      if (response.toolCalls && response.toolCalls.length > 0) {

        const assistantParts: AiMessagePartDto[] = [];
        if (response.content) assistantParts.push({ type: 'text', text: response.content });
        response.toolCalls.forEach(call => assistantParts.push({ type: 'tool-call', toolCall: call }));

        currentRequest = {
          ...currentRequest,
          messages: [...currentRequest.messages, { role: 'assistant', parts: assistantParts }]
        };

        const toolResultsParts: AiMessagePartDto[] = [];
        let hasFatalError = false;
        let fatalErrorMessage = '';

        // ARCHITECTURE FIX: Local AbortController to cancel sibling tool executions if one fails fatally
        const batchAbortController = new AbortController();
        const mainAbortListener = () => batchAbortController.abort();
        if (abortSignal) abortSignal.addEventListener('abort', mainAbortListener);

        const executionPromises = response.toolCalls.map(async (toolCall) => {
          console.log(`[Agent Executor] Iteration ${iterationCount}: Executing tool '${toolCall.name}'...`);
          const result = await this.toolRegistry.executeTool(toolCall.name, toolCall.arguments, batchAbortController.signal);

          if (result.status === 'fatal_error') {
            batchAbortController.abort(); // Cancel parallel tools
          }
          return { toolCall, result };
        });

        const executionResults = await Promise.all(executionPromises);
        if (abortSignal) abortSignal.removeEventListener('abort', mainAbortListener);

        for (const { toolCall, result } of executionResults) {
          const resultPayload = result.status === 'success' ? result.data : { error: result.errorMessage, suggestion: 'Please fix parameters.' };
          toolResultsParts.push({
            type: 'tool-result',
            toolCallId: toolCall.id,
            toolResult: typeof resultPayload === 'string' ? resultPayload : JSON.stringify(resultPayload)
          });
          if (result.status === 'fatal_error') {
            hasFatalError = true;
            fatalErrorMessage = result.errorMessage || 'Unknown fatal tool error';
          }
        }

        currentRequest = {
          ...currentRequest,
          messages: [...currentRequest.messages, { role: 'tool', parts: toolResultsParts }]
        };

        if (hasFatalError) {
          throw new FrameworkError('AGENT_FATAL_TOOL_ERROR', `Agent halted due to a fatal error in tool execution: ${fatalErrorMessage}`, false);
        }
        continue;
      }
      return response;
    }
    throw new FrameworkError('AGENT_MAX_ITERATIONS', `Task halted: Maximum agent iterations (${maxIterations}) exceeded.`, false);
  }
}