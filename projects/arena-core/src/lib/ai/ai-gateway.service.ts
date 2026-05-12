import { Injectable } from '@angular/core';
import { Observable, from, switchMap, finalize, tap, catchError, throwError } from 'rxjs';
import { AiRequestDto } from '../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../contracts/dtos/ai-response.dto';
import { AiEventDto } from '../contracts/dtos/ai-event.dto';
import { AiRegistryService } from './ai-registry.service';
import { SecurityService } from '../security/security.service';
import { AiProfileRepository } from '../database/repositories/ai-profile-repository.repository';
import { CryptoService } from '../security/crypto.service';
import { AiConnectionMonitorService } from '../monitor/ai-connection-monitor.service';
import { FrameworkError } from '../exceptions/framework-error.exception';

/**
 * The Central Communication Hub for all AI operations.
 * Routes requests, manages memory scrubbing, and automatically updates connection states.
 */
@Injectable({
  providedIn: 'root'
})
export class AiGatewayService {

  constructor(
    private readonly aiRegistry: AiRegistryService,
    private readonly securityService: SecurityService,
    private readonly profileRepo: AiProfileRepository,
    private readonly cryptoService: CryptoService,
    private readonly connectionMonitor: AiConnectionMonitorService
  ) { }

  /**
   * Dispatches a request for a complete, single-turn response.
   */
  dispatch(request: AiRequestDto, targetProfileId?: string): Observable<AiResponseDto> {
    return from(this.prepareSecureContext(targetProfileId)).pipe(
      switchMap(({ adapter, decryptedKey, model, profileId }) => {
        const finalRequest: AiRequestDto = { ...request, model: request.model || model };
        return adapter.generateResponse(finalRequest, decryptedKey).pipe(
          tap(() => this.connectionMonitor.updateState(profileId, 'Connected')),
          catchError((error) => this.handleConnectionError(error, profileId)),
          finalize(() => { decryptedKey = ''; })
        );
      })
    );
  }

  /**
   * Dispatches a request and returns a continuous stream of AI events (SSE).
   * Excellent for real-time chat UX and interruptible operations.
   */
  dispatchStream(request: AiRequestDto, targetProfileId?: string): Observable<AiEventDto> {
    return from(this.prepareSecureContext(targetProfileId)).pipe(
      switchMap(({ adapter, decryptedKey, model, profileId }) => {
        const finalRequest: AiRequestDto = { ...request, model: request.model || model };
        return adapter.generateStream(finalRequest, decryptedKey).pipe(
          tap({
            next: (event) => {
              // Only update on meaningful chunks to avoid rapid signal firing
              if (event.type === 'chunk' || event.type === 'complete') {
                this.connectionMonitor.updateState(profileId, 'Connected');
              }
            },
            error: (error) => this.handleConnectionError(error, profileId)
          }),
          finalize(() => { decryptedKey = ''; })
        );
      })
    );
  }

  pingProfile(profileId: string): Observable<boolean> {
    return from(this.prepareSecureContext(profileId)).pipe(
      switchMap(({ adapter, decryptedKey, profileId }) => {
        return adapter.validateKey(decryptedKey).pipe(
          tap((isValid) => this.connectionMonitor.updateState(profileId, isValid ? 'Connected' : 'InvalidKey')),
          catchError((error) => this.handleConnectionError(error, profileId)),
          finalize(() => { decryptedKey = ''; })
        );
      })
    );
  }

  private async prepareSecureContext(targetProfileId?: string) {
    const profile = targetProfileId
      ? await this.profileRepo.getById(targetProfileId)
      : await this.profileRepo.getActiveProfile();

    if (!profile) {
      throw new Error(`[AI Gateway] Cannot dispatch request: No valid AI profile found${targetProfileId ? ' for ID: ' + targetProfileId : '.'}`);
    }

    const masterKey = this.securityService.getSessionKey();
    const decryptedKey = await this.cryptoService.decrypt(profile.encryptedApiKey, profile.encryptionIv, masterKey);
    const adapter = this.aiRegistry.createAdapterInstance(profile.providerId);

    return { adapter, decryptedKey, model: profile.selectedModel, profileId: profile.profileId };
  }

  // اضافه کردن این ایمپورت به بالای فایل
  // import { FrameworkError } from '../../exceptions/framework-error.exception';

  private handleConnectionError(error: any, profileId: string): Observable<never> {
    const errorMsg = String(error).toLowerCase();
    const isAuthError = errorMsg.includes('key') || errorMsg.includes('unauthorized') || errorMsg.includes('401');
    const state = isAuthError ? 'InvalidKey' : 'Disconnected';
    
    this.connectionMonitor.updateState(profileId, state);
    
    // Wrap native errors in the standardized FrameworkError
    const frameworkError = new FrameworkError(
        isAuthError ? 'AI_AUTH_FAILED' : 'AI_NETWORK_ERROR',
        error.message || 'AI Connection failed',
        !isAuthError, // Network errors are potentially retryable, Auth errors are not
        error
    );

    return throwError(() => frameworkError);
  }
}