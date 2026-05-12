import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { IAiAdapter } from '../../contracts/interfaces/ai-adapter.interface';
import { AiRequestDto } from '../../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../../contracts/dtos/ai-response.dto';

/**
 * The official AI Adapter for Google Gemini APIs.
 * Supports native REST interactions, streaming equivalents, and Tool Calling (Agents).
 * Operates without external heavy SDK dependencies to guarantee zero-friction framework migrations.
 */
@Injectable({
  providedIn: 'root'
})
export class GoogleGeminiAdapter implements IAiAdapter {

  // Static metadata required by the AiRegistryService (Factory Pattern)
  public static readonly providerId = 'google-gemini';
  public static readonly displayName = 'Google Gemini';

  private readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  /**
   * Validates the provided API key by attempting to fetch the model list.
   */
  validateKey(apiKey: string): Observable<boolean> {
    return from(
      fetch(`${this.BASE_URL}?key=${apiKey}`, { method: 'GET' })
    ).pipe(
      map(response => response.status === 200)
    );
  }

  /**
   * Fetches all available generative models (filtering out non-text/generation models).
   */
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

  /**
   * Executes a prompt and handles Function Calling (Tools) mapping.
   */
  generateResponse(request: AiRequestDto, apiKey: string): Observable<AiResponseDto> {
    const endpoint = `${this.BASE_URL}/${request.model}:generateContent?key=${apiKey}`;
    const payload = this.mapRequestToGeminiFormat(request);

    return from(
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || '[Gemini Adapter] Unknown execution error.');
        }
        return data;
      })
    ).pipe(
      map((geminiResponse: any) => this.mapGeminiResponseToStandard(geminiResponse))
    );
  }

  // --- Internal Data Mapping Utilities ---

  private mapRequestToGeminiFormat(request: AiRequestDto): any {
    const payload: any = {
      contents: request.messages.map(msg => {

        // Handle standard roles
        let role = 'user';
        if (msg.role === 'assistant') role = 'model';
        if (msg.role === 'tool') role = 'function'; // Gemini specific mapping

        const parts: any[] = [];

        if (msg.role === 'tool' && msg.toolCallId) {
          // Send tool execution results back to Gemini
          parts.push({
            functionResponse: {
              name: msg.toolCallId,
              response: { result: msg.content }
            }
          });
        } else if (msg.toolCalls && msg.toolCalls.length > 0) {
          // Assistant requesting tool execution
          msg.toolCalls.forEach(call => {
            parts.push({
              functionCall: {
                name: call.name,
                args: call.arguments
              }
            });
          });
        } else {
          // Standard text message
          parts.push({ text: msg.content });
        }

        return { role, parts };
      }),
      generationConfig: {
        temperature: request.temperature || 0.7
      }
    };

    // Inject Tool Declarations if the framework provided them
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
      if (part.text) {
        content += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: part.functionCall.name, // Gemini relies on the name for correlation
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