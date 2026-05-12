import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';
import { AiEventDto } from '../dtos/ai-event.dto';
import { AiCapabilitiesDto } from '../dtos/ai-capabilities.dto';

/**
 * The strict contract that every AI Provider instance MUST follow.
 * Uses RxJS Observables to handle asynchronous network requests, retries, and cancellations.
 */
export interface IAiAdapter {
    validateKey(apiKey: string): Observable<boolean>;
    fetchModels(apiKey: string): Observable<string[]>;

    /** * Executes a standard, single-turn full response (Best for JSON/Data extraction).
     * Now strictly supports AbortSignal for network-level cancellation.
     */
    generateResponse(request: AiRequestDto, apiKey: string, abortSignal?: AbortSignal): Observable<AiResponseDto>;

    /** * Executes a Server-Sent Events (SSE) stream returning continuous chunks (Best for Chat/UX) */
    generateStream(request: AiRequestDto, apiKey: string): Observable<AiEventDto>;
}

/**
 * Constructor contract ensuring the class itself holds static metadata for the Factory.
 */
export interface AiAdapterConstructor extends Type<IAiAdapter> {
    readonly providerId: string;
    readonly displayName: string;
    readonly capabilities: AiCapabilitiesDto;
}