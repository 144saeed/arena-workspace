import { Injectable } from '@angular/core';
import { Observable, from, switchMap, finalize, tap, catchError, throwError } from 'rxjs';
import { AiRequestDto } from '../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../contracts/dtos/ai-response.dto';
import { AiRegistryService } from './ai-registry.service';
import { SecurityService } from '../security/security.service';
import { AiProfileRepository } from '../database/repositories/ai-profile-repository.repository';
import { CryptoService } from '../security/crypto.service';
import { AiConnectionMonitorService } from '../monitor/ai-connection-monitor.service';

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
   * Dispatches a request and automatically monitors the connection health.
   */
  dispatch(request: AiRequestDto, targetProfileId?: string): Observable<AiResponseDto> {
    return from(this.prepareSecureContext(targetProfileId)).pipe(
      switchMap(({ adapter, decryptedKey, model, profileId }) => {

        const finalRequest: AiRequestDto = {
          ...request,
          model: request.model || model
        };

        return adapter.generateResponse(finalRequest, decryptedKey).pipe(
          tap(() => {
            // Update UI Monitor on successful communication
            this.connectionMonitor.updateState(profileId, 'Connected');
          }),
          catchError((error) => {
            // Differentiate between auth errors and network errors
            const errorMsg = String(error).toLowerCase();
            const state = errorMsg.includes('key') || errorMsg.includes('unauthorized') || errorMsg.includes('401')
              ? 'InvalidKey'
              : 'Disconnected';

            this.connectionMonitor.updateState(profileId, state);
            return throwError(() => error);
          }),
          finalize(() => {
            decryptedKey = '';
          })
        );
      })
    );
  }

  /**
   * Manually verifies a profile's connection without executing a full prompt.
   * Useful for Settings pages to test API keys on demand.
   */
  pingProfile(profileId: string): Observable<boolean> {
    return from(this.prepareSecureContext(profileId)).pipe(
      switchMap(({ adapter, decryptedKey, profileId }) => {
        return adapter.validateKey(decryptedKey).pipe(
          tap((isValid) => {
            this.connectionMonitor.updateState(profileId, isValid ? 'Connected' : 'InvalidKey');
          }),
          catchError((error) => {
            this.connectionMonitor.updateState(profileId, 'Disconnected');
            return throwError(() => error);
          }),
          finalize(() => {
            decryptedKey = '';
          })
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

    const decryptedKey = await this.cryptoService.decrypt(
      profile.encryptedApiKey,
      profile.encryptionIv,
      masterKey
    );

    const adapter = this.aiRegistry.createAdapterInstance(profile.providerId);

    // Return profileId as well so the RxJS pipeline can update the correct monitor state
    return { adapter, decryptedKey, model: profile.selectedModel, profileId: profile.profileId };
  }
}