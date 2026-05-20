import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AiGatewayService } from '../ai-gateway.service';
import { AiToolRegistryService } from './ai-tool-registry.service';
import { AiRequestDto } from '../../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../../contracts/dtos/ai-response.dto';
import { AiMessagePartDto } from '../../contracts/dtos/ai-message-part.dto';
import { AiEventDto } from '../../contracts/dtos/ai-event.dto';
import { AiToolCallDto } from '../../contracts/dtos/ai-tool-call.dto';
import { FrameworkError } from '../../exceptions/framework-error.exception';

@Injectable({
  providedIn: 'root'
})
export class AgentExecutorService {

  private readonly DEFAULT_MAX_ITERATIONS = 5;

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly toolRegistry: AiToolRegistryService
  ) { }

  /**
   * Executes a standard, single-turn full response task (Promise-based).
   * Best for structured data extraction or background processing where real-time UX is not required.
   */
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

        const batchAbortController = new AbortController();
        const mainAbortListener = () => batchAbortController.abort();
        if (abortSignal) abortSignal.addEventListener('abort', mainAbortListener);

        try {
          const executionPromises = response.toolCalls.map(async (toolCall) => {
            const result = await this.toolRegistry.executeTool(toolCall.name, toolCall.arguments, batchAbortController.signal);

            if (result.status === 'fatal_error') {
              if (!batchAbortController.signal.aborted) {
                batchAbortController.abort();
              }
            }
            return { toolCall, result };
          });

          const executionResults = await Promise.all(executionPromises);

          for (const { toolCall, result } of executionResults) {
            const resultPayload = result.status === 'success'
              ? result.data
              : { error: result.errorMessage };

            toolResultsParts.push({
              type: 'tool-result',
              toolCallId: toolCall.id,
              toolCallName: toolCall.name,
              toolResult: typeof resultPayload === 'string' ? resultPayload : JSON.stringify(resultPayload)
            });

            if (result.status === 'fatal_error') {
              hasFatalError = true;
              fatalErrorMessage = result.errorMessage || 'Unknown fatal tool error';
            }
          }

          if (hasFatalError) {
            throw new FrameworkError('AGENT_FATAL_TOOL_ERROR', `Agent halted due to a fatal error in tool execution: ${fatalErrorMessage}`, false);
          }

          currentRequest = {
            ...currentRequest,
            messages: [...currentRequest.messages, { role: 'tool', parts: toolResultsParts }]
          };

        } finally {
          if (abortSignal) abortSignal.removeEventListener('abort', mainAbortListener);
        }
        continue;
      }
      return response;
    }

    throw new FrameworkError('AGENT_MAX_ITERATIONS', `Task halted: Maximum agent iterations (${maxIterations}) exceeded.`, false);
  }

  /**
   * Executes a streaming agent task (Observable-based).
   * Best for real-time Chat UI. Intercepts tool calls mid-stream, executes them, and resumes the stream invisibly.
   */
  executeStreamTask(
    request: AiRequestDto, targetProfileId?: string, maxIterations: number = this.DEFAULT_MAX_ITERATIONS, abortSignal?: AbortSignal
  ): Observable<AiEventDto> {
    return new Observable<AiEventDto>(subscriber => {
      let currentRequest: AiRequestDto = {
        ...request,
        tools: (request.tools && request.tools.length > 0) ? request.tools : this.toolRegistry.getRegisteredTools()
      };

      let iterationCount = 0;
      let isSubscribed = true;

      const runIteration = async () => {
        try {
          while (iterationCount < maxIterations && isSubscribed) {
            if (abortSignal?.aborted) {
              throw new FrameworkError('AGENT_ABORTED', 'Agent execution was cancelled.', false);
            }

            iterationCount++;
            let contentAccumulator = '';
            const toolCalls: AiToolCallDto[] = [];
            let tokensUsed = 0;

            await new Promise<void>((resolve, reject) => {
              this.gateway.dispatchStream(currentRequest, targetProfileId, abortSignal).subscribe({
                next: (event) => {
                  if (event.type === 'chunk') {
                    contentAccumulator += event.content || '';
                    subscriber.next(event);
                  } else if (event.type === 'tool-call' && event.toolCalls) {
                    toolCalls.push(...event.toolCalls);
                    subscriber.next(event);
                  } else if (event.type === 'complete') {
                    tokensUsed = event.tokensUsed || 0;
                  } else if (event.type === 'error') {
                    // Convert DTO event errors directly into standard RxJS fatal stream errors
                    reject(new FrameworkError('AI_STREAM_ERROR', event.error || 'Stream encountered an error.', false));
                  }
                },
                error: (err) => reject(err),
                complete: () => resolve()
              });
            });

            if (!isSubscribed) return;

            if (toolCalls.length > 0) {
              const assistantParts: AiMessagePartDto[] = [];
              if (contentAccumulator) {
                assistantParts.push({ type: 'text', text: contentAccumulator });
              }
              toolCalls.forEach(call => assistantParts.push({ type: 'tool-call', toolCall: call }));

              currentRequest = {
                ...currentRequest,
                messages: [...currentRequest.messages, { role: 'assistant', parts: assistantParts }]
              };

              const toolResultsParts: AiMessagePartDto[] = [];
              let hasFatalError = false;
              let fatalErrorMessage = '';

              const batchAbortController = new AbortController();
              const mainAbortListener = () => batchAbortController.abort();
              if (abortSignal) abortSignal.addEventListener('abort', mainAbortListener);

              try {
                const executionPromises = toolCalls.map(async (toolCall) => {
                  const result = await this.toolRegistry.executeTool(toolCall.name, toolCall.arguments, batchAbortController.signal);
                  if (result.status === 'fatal_error' && !batchAbortController.signal.aborted) {
                    batchAbortController.abort();
                  }
                  return { toolCall, result };
                });

                const executionResults = await Promise.all(executionPromises);

                for (const { toolCall, result } of executionResults) {
                  const resultPayload = result.status === 'success' ? result.data : { error: result.errorMessage };
                  toolResultsParts.push({
                    type: 'tool-result',
                    toolCallId: toolCall.id,
                    toolCallName: toolCall.name,
                    toolResult: typeof resultPayload === 'string' ? resultPayload : JSON.stringify(resultPayload)
                  });

                  if (result.status === 'fatal_error') {
                    hasFatalError = true;
                    fatalErrorMessage = result.errorMessage || 'Unknown fatal tool error';
                  }
                }

                if (hasFatalError) {
                  throw new FrameworkError('AGENT_FATAL_TOOL_ERROR', `Agent halted due to a fatal error in tool execution: ${fatalErrorMessage}`, false);
                }

                currentRequest = {
                  ...currentRequest,
                  messages: [...currentRequest.messages, { role: 'tool', parts: toolResultsParts }]
                };

              } finally {
                if (abortSignal) abortSignal.removeEventListener('abort', mainAbortListener);
              }

              continue;
            }

            subscriber.next({ type: 'complete', tokensUsed });
            subscriber.complete();
            return;
          }

          // If the loop exits without completing, maxIterations was exceeded.
          if (isSubscribed) {
            subscriber.error(new FrameworkError('AGENT_MAX_ITERATIONS', `Task halted: Maximum agent iterations (${maxIterations}) exceeded.`, false));
          }

        } catch (error) {
          if (isSubscribed) {
            subscriber.error(error);
          }
        }
      };

      runIteration();

      return () => {
        isSubscribed = false;
      };
    });
  }
}