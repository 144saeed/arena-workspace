import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AiGatewayService } from '../ai-gateway.service';
import { AiToolRegistryService } from './ai-tool-registry.service';
import { AiRequestDto } from '../../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../../contracts/dtos/ai-response.dto';
import { AiMessageDto } from '../../contracts/dtos/ai-message.dto';

/**
 * The Orchestrator Engine for Autonomous AI Agents.
 * Manages the "Think -> Act -> Observe -> Think" loop, executing local tools 
 * automatically and feeding the results back to the AI model.
 */
@Injectable({
  providedIn: 'root'
})
export class AgentExecutorService {

  // Default hardcoded limit to prevent infinite loops and protect user tokens
  private readonly DEFAULT_MAX_ITERATIONS = 3;

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly toolRegistry: AiToolRegistryService
  ) { }

  /**
   * Executes an autonomous agent loop to fulfill a complex user request.
   * @param request The initial request payload.
   * @param targetProfileId Optional target AI profile.
   * @param maxIterations Allows the developer to safely override the loop limit per task.
   */
  async executeTask(
    request: AiRequestDto,
    targetProfileId?: string,
    maxIterations: number = this.DEFAULT_MAX_ITERATIONS
  ): Promise<AiResponseDto> {

    // Create an isolated copy of the request to track conversational state dynamically.
    // We use 'let' and object spreading to respect the 'readonly' constraints of the DTO.
    let currentRequest: AiRequestDto = {
      ...request,
      // Auto-inject all registered local tools if the developer didn't manually specify them
      tools: (request.tools && request.tools.length > 0)
        ? request.tools
        : this.toolRegistry.getRegisteredTools()
    };

    let iterationCount = 0;

    while (iterationCount < maxIterations) {
      iterationCount++;

      // 1. Dispatch the current state to the AI Gateway
      // Using firstValueFrom to gracefully bridge RxJS streams into our async/await loop
      const response = await firstValueFrom(this.gateway.dispatch(currentRequest, targetProfileId));

      if (!response) {
        throw new Error('[Agent Executor] Execution failed: AI returned an empty response.');
      }

      // 2. Observe: Did the AI decide to call tools?
      if (response.toolCalls && response.toolCalls.length > 0) {

        // Step A: Append the AI's tool request to the conversational history
        const aiMessage: AiMessageDto = {
          role: 'assistant',
          content: response.content || '',
          toolCalls: response.toolCalls
        };

        // Re-assign creating a new object to respect readonly 'messages' array
        currentRequest = {
          ...currentRequest,
          messages: [...currentRequest.messages, aiMessage]
        };

        // Step B: Act by executing the tools locally
        const toolResultsMessages: AiMessageDto[] = [];

        for (const toolCall of response.toolCalls) {
          console.log(`[Agent Executor] Iteration ${iterationCount}: AI is executing tool '${toolCall.name}'...`);

          const resultString = await this.toolRegistry.executeTool(toolCall.name, toolCall.arguments);

          toolResultsMessages.push({
            role: 'tool',
            content: resultString,
            toolCallId: toolCall.name // Maps exactly to Gemini adapter tracking
          });
        }

        // Step C: Feed the local results back to the AI and restart the loop
        currentRequest = {
          ...currentRequest,
          messages: [...currentRequest.messages, ...toolResultsMessages]
        };

        continue;
      }

      // 3. Goal Reached: No tool calls requested, the AI has provided the final answer.
      console.log(`[Agent Executor] Task completed successfully in ${iterationCount} iterations.`);
      return response;
    }

    // Safety Net Triggered
    console.warn(`[Agent Executor] Critical Warning: Max iterations (${maxIterations}) reached. Halting execution to protect tokens.`);
    throw new Error('[Agent Executor] Task halted: Maximum agent iterations exceeded without reaching a final answer.');
  }
}