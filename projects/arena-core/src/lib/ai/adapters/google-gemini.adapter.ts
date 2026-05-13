import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { IAiAdapter } from '../../contracts/interfaces/ai-adapter.interface';
import { AiRequestDto } from '../../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../../contracts/dtos/ai-response.dto';
import { AiEventDto } from '../../contracts/dtos/ai-event.dto';
import { AiCapabilitiesDto } from '../../contracts/dtos/ai-capabilities.dto';
import { FrameworkError } from '../../exceptions/framework-error.exception';

@Injectable({
  providedIn: 'root'
})
export class GoogleGeminiAdapter implements IAiAdapter {

  public static readonly providerId = 'google-gemini';
  public static readonly displayName = 'Google Gemini';

  public static readonly capabilities: AiCapabilitiesDto = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsJsonMode: true
  };

  private readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  validateKey(apiKey: string): Observable<boolean> {
    return from(
      fetch(this.BASE_URL, { method: 'GET', headers: { 'x-goog-api-key': apiKey } })
    ).pipe(map(response => response.status === 200));
  }

  fetchModels(apiKey: string): Observable<string[]> {
    return from(
      fetch(this.BASE_URL, { method: 'GET', headers: { 'x-goog-api-key': apiKey } })
        .then(res => {
          if (!res.ok) this.handleHttpError(res.status, null, 'Failed to fetch models.');
          return res.json();
        })
    ).pipe(
      map((data: { models: { name: string, supportedGenerationMethods: string[] }[] }) => {
        return data.models
          .filter(m => m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
      })
    );
  }

  generateResponse(request: AiRequestDto, apiKey: string, abortSignal?: AbortSignal): Observable<AiResponseDto> {
    const endpoint = `${this.BASE_URL}/${request.model}:generateContent`;
    const payload = this.mapRequestToGeminiFormat(request);

    return from(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload),
        signal: abortSignal
      }).then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) this.handleHttpError(res.status, data, 'Execution error.');
        return data;
      })
    ).pipe(
      map((geminiResponse: Record<string, unknown>) => this.mapGeminiResponseToStandard(geminiResponse))
    );
  }

  generateStream(request: AiRequestDto, apiKey: string, abortSignal?: AbortSignal): Observable<AiEventDto> {
    return new Observable<AiEventDto>(subscriber => {
      const endpoint = `${this.BASE_URL}/${request.model}:streamGenerateContent?alt=sse`;
      const payload = this.mapRequestToGeminiFormat(request);
      const abortController = new AbortController();

      const onAbort = () => abortController.abort();
      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort);
      }

      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload),
        signal: abortController.signal
      }).then(async response => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          this.handleHttpError(response.status, errData, 'Streaming execution error.');
        }
        if (!response.body) throw new FrameworkError('STREAM_BODY_MISSING', 'No response body for streaming.', true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice('data: '.length).trim();
              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);
                const candidate = parsed.candidates?.[0];
                if (!candidate) continue;

                const parts = candidate.content?.parts || [];
                let chunkText = '';
                const toolCalls: Record<string, unknown>[] = [];

                parts.forEach((part: any) => {
                  if (part.text) chunkText += part.text;
                  if (part.functionCall) {
                    toolCalls.push({
                      id: crypto.randomUUID(),
                      name: part.functionCall.name,
                      arguments: part.functionCall.args
                    });
                  }
                });

                if (chunkText) {
                  subscriber.next({ type: 'chunk', content: chunkText });
                }
                if (toolCalls.length > 0) {
                  // Cast required to align loosely typed stream parsing with strict DTO
                  subscriber.next({ type: 'tool-call', toolCalls: toolCalls as any });
                }
              } catch (e) {
                console.warn('[Gemini Adapter] Failed to parse stream chunk');
              }
            }
          }
        }
        subscriber.next({ type: 'complete' });
        subscriber.complete();
      }).catch(error => {
        if (error.name !== 'AbortError') {
          subscriber.error(error);
        } else {
          subscriber.complete();
        }
      });

      return () => {
        abortController.abort();
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
      };
    });
  }

  private handleHttpError(status: number, errorData: any, defaultMessage: string): never {
    const code = status === 401 || status === 403 ? 'AI_AUTH_FAILED' : 'AI_NETWORK_ERROR';
    const message = errorData?.error?.message || defaultMessage;
    throw new FrameworkError(code, message, status >= 500);
  }

  private mapRequestToGeminiFormat(request: AiRequestDto): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      contents: [],
      generationConfig: { temperature: request.temperature ?? 0.7 }
    };

    const systemMessages = request.messages.filter(m => m.role === 'system');
    const conversationalMessages = request.messages.filter(m => m.role !== 'system');

    if (systemMessages.length > 0) {
      payload['systemInstruction'] = {
        parts: systemMessages.flatMap(m =>
          m.parts.filter(p => p.type === 'text').map(p => ({ text: p.text }))
        )
      };
    }

    payload['contents'] = conversationalMessages.map(msg => {
      let role = 'user';
      if (msg.role === 'assistant') role = 'model';
      if (msg.role === 'tool') role = 'function';

      const parts: Record<string, unknown>[] = [];

      msg.parts.forEach(p => {
        if (p.type === 'text' && p.text) {
          parts.push({ text: p.text });
        } else if (p.type === 'tool-call' && p.toolCall) {
          parts.push({ functionCall: { name: p.toolCall.name, args: p.toolCall.arguments } });
        } else if (p.type === 'tool-result') {
          let parsedResponse = {};
          try {
            parsedResponse = p.toolResult ? JSON.parse(p.toolResult) : {};
          } catch (e) {
            parsedResponse = { message: p.toolResult };
          }
          const targetName = p.toolCallName || p.toolCallId || 'unknown_function';
          parts.push({ functionResponse: { name: targetName, response: parsedResponse } });
        } else if (p.type === 'image' && p.imageUrl) {
          const match = p.imageUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        }
      });
      return { role, parts };
    });

    if (request.tools && request.tools.length > 0) {
      payload['tools'] = [{
        functionDeclarations: request.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }

    if (request.expectJson) {
      (payload['generationConfig'] as any).responseMimeType = 'application/json';
    }

    return payload;
  }

  private mapGeminiResponseToStandard(geminiResponse: any): AiResponseDto {
    const candidate = geminiResponse.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let content = '';
    const toolCalls: Record<string, unknown>[] = [];

    parts.forEach((part: any) => {
      if (part.text) content += part.text;
      if (part.functionCall) {
        toolCalls.push({
          id: crypto.randomUUID(),
          name: part.functionCall.name,
          arguments: part.functionCall.args
        });
      }
    });

    return {
      content: content.trim(),
      tokensUsed: geminiResponse.usageMetadata?.totalTokenCount || 0,
      providerId: GoogleGeminiAdapter.providerId,
      // Cast required to align dynamic response parsing with strict DTO
      toolCalls: toolCalls.length > 0 ? (toolCalls as any) : undefined
    };
  }
}