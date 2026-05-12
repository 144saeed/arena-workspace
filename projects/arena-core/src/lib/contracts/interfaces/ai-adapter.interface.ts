import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';

/**
 * The strict contract that every AI Provider instance MUST follow.
 * Uses RxJS Observables to handle asynchronous network requests, retries, and cancellations.
 */
export interface IAiAdapter {
    validateKey(apiKey: string): Observable<boolean>;
    fetchModels(apiKey: string): Observable<string[]>;
    generateResponse(request: AiRequestDto, apiKey: string): Observable<AiResponseDto>;
}

/**
 * Constructor contract ensuring the class itself holds static metadata for the Factory.
 */
export interface AiAdapterConstructor extends Type<IAiAdapter> {
    readonly providerId: string;
    readonly displayName: string;
}