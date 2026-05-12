import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { IAiAdapter } from '../../contracts/interfaces/ai-adapter.interface';
import { AiRequestDto } from '../../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../../contracts/dtos/ai-response.dto';
import { AiEventDto } from '../../contracts/dtos/ai-event.dto';
import { AiCapabilitiesDto } from '../../contracts/dtos/ai-capabilities.dto';

/**
 * The official AI Adapter for Google Gemini APIs.
 * Supports native REST interactions, streaming equivalents, and Tool Calling (Agents).
 * Operates without external heavy SDK dependencies to guarantee zero-friction framework migrations.
 */
@Injectable({
  providedIn: 'root'
})
export class GoogleGeminiAdapter implements IAiAdapter {

  public static readonly providerId = 'google-gemini';
  public static readonly displayName = 'Google Gemini';

  public static readonly capabilities: AiCapabilitiesDto = {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsJsonMode: true
  };

  private readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  validateKey(apiKey: string): Observable<boolean> {
    return from(
      fetch(`${this.BASE_URL}?key=${apiKey}`, { method: 'GET' })
    ).pipe(map(response => response.status === 200));
  }

  fetchModels(apiKey: string): Observable<string[]> {
    return from(
      fetch(`${this.BASE_URL}?key=${apiKey}`, { method: 'GET' })
        .then(res => {
          if (!res.ok) throw new Error('[Gemini Adapter] Failed to fetch models.');
          return res.json();
        })
    ).pipe(
      map((data: any) => {
        return data.models
          .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));
      })
    );
  }

  generateResponse(request: AiRequestDto, apiKey: string, abortSignal?: AbortSignal): Observable<AiResponseDto> {
    const endpoint = `${this.BASE_URL}/${request.model}:generateContent?key=${apiKey}`;
    const payload = this.mapRequestToGeminiFormat(request);

    return from(
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortSignal
      }).then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || '[Gemini Adapter] Unknown execution error.');
        return data;
      })
    ).pipe(
      map((geminiResponse: any) => this.mapGeminiResponseToStandard(geminiResponse))
    );
  }

  generateStream(request: AiRequestDto, apiKey: string, abortSignal?: AbortSignal): Observable<AiEventDto> {
    return new Observable<AiEventDto>(subscriber => {
      const endpoint = `${this.BASE_URL}/${request.model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const payload = this.mapRequestToGeminiFormat(request);
      const abortController = new AbortController();

      // FIX: Bind the external generic abortSignal to the internal native abortController
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => abortController.abort());
      }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal
      }).then(async response => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || '[Gemini Adapter] Streaming execution error.');
        }
        if (!response.body) throw new Error('[Gemini Adapter] No response body for streaming.');

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
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);
                const candidate = parsed.candidates?.[0];
                if (!candidate) continue;

                const parts = candidate.content?.parts || [];
                let chunkText = '';
                const toolCalls: any[] = [];

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
                  subscriber.next({ type: 'tool-call', toolCalls });
                }
              } catch (e) {
                console.warn('[Gemini Adapter] Failed to parse stream chunk', e);
              }
            }
          }
        }
        subscriber.next({ type: 'complete' });
        subscriber.complete();
      }).catch(error => {
        if (error.name !== 'AbortError') {
          subscriber.error(error);
        }
      });

      return () => abortController.abort();
    });
  }

  private mapRequestToGeminiFormat(request: AiRequestDto): any {
    const payload: any = {
      contents: [],
      generationConfig: { temperature: request.temperature || 0.7 }
    };

    const systemMessages = request.messages.filter(m => m.role === 'system');
    const conversationalMessages = request.messages.filter(m => m.role !== 'system');

    if (systemMessages.length > 0) {
      payload.systemInstruction = {
        parts: systemMessages.flatMap(m =>
          m.parts.filter(p => p.type === 'text').map(p => ({ text: p.text }))
        )
      };
    }

    payload.contents = conversationalMessages.map(msg => {
      let role = 'user';
      if (msg.role === 'assistant') role = 'model';
      if (msg.role === 'tool') role = 'function';

      const parts: any[] = [];

      msg.parts.forEach(p => {
        if (p.type === 'text' && p.text) {
          parts.push({ text: p.text });
        } else if (p.type === 'tool-call' && p.toolCall) {
          parts.push({ functionCall: { name: p.toolCall.name, args: p.toolCall.arguments } });
        } else if (p.type === 'tool-result' && p.toolCallId) {
          let parsedResponse = {};
          try {
            parsedResponse = p.toolResult ? JSON.parse(p.toolResult) : {};
          } catch (e) {
            parsedResponse = { message: p.toolResult };
          }
          parts.push({ functionResponse: { name: p.toolCallId, response: parsedResponse } });
        } else if (p.type === 'image' && p.imageUrl) {
          const match = p.imageUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          } else {
            console.warn('[Gemini Adapter] Invalid image URL format. Expected Base64 Data URI.');
          }
        }
      });
      return { role, parts };
    });

    if (request.tools && request.tools.length > 0) {
      payload.tools = [{
        functionDeclarations: request.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }

    if (request.expectJson) {
      payload.generationConfig.responseMimeType = 'application/json';
    }

    return payload;
  }

  private mapGeminiResponseToStandard(geminiResponse: any): AiResponseDto {
    const candidate = geminiResponse.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let content = '';
    const toolCalls: any[] = [];
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
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }
}