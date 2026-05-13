import { Injectable } from '@angular/core';
import { Observable, from, switchMap, tap, catchError, throwError } from 'rxjs';
import { AiRequestDto } from '../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../contracts/dtos/ai-response.dto';
import { AiEventDto } from '../contracts/dtos/ai-event.dto';
import { AiRegistryService } from './ai-registry.service';
import { SecurityService } from '../security/security.service';
import { AiProfileRepository } from '../database/repositories/ai-profile-repository.repository';
import { CryptoService } from '../security/crypto.service';
import { AiConnectionMonitorService } from '../monitor/ai-connection-monitor.service';
import { FrameworkError } from '../exceptions/framework-error.exception';

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

  dispatch(request: AiRequestDto, targetProfileId?: string, abortSignal?: AbortSignal): Observable<AiResponseDto> {
    return from(this.prepareSecureContext(targetProfileId)).pipe(
      switchMap(({ adapter, decryptedKey, model, profileId }) => {
        const finalRequest: AiRequestDto = { ...request, model: request.model || model };

        return adapter.generateResponse(finalRequest, decryptedKey, abortSignal).pipe(
          tap(() => this.connectionMonitor.updateState(profileId, 'Connected')),
          catchError((error) => this.handleConnectionError(error, profileId))
        );
      })
    );
  }

  dispatchStream(request: AiRequestDto, targetProfileId?: string, abortSignal?: AbortSignal): Observable<AiEventDto> {
    return from(this.prepareSecureContext(targetProfileId)).pipe(
      switchMap(({ adapter, decryptedKey, model, profileId }) => {
        const finalRequest: AiRequestDto = { ...request, model: request.model || model };
        return adapter.generateStream(finalRequest, decryptedKey, abortSignal).pipe(
          tap((event) => {
            if (event.type === 'chunk' || event.type === 'complete') {
              this.connectionMonitor.updateState(profileId, 'Connected');
            }
          }),
          catchError((error) => this.handleConnectionError(error, profileId))
        );
      })
    );
  }

  pingProfile(profileId: string): Observable<boolean> {
    return from(this.prepareSecureContext(profileId)).pipe(
      switchMap(({ adapter, decryptedKey, profileId }) => {
        return adapter.validateKey(decryptedKey).pipe(
          tap((isValid) => this.connectionMonitor.updateState(profileId, isValid ? 'Connected' : 'InvalidKey')),
          catchError((error) => this.handleConnectionError(error, profileId))
        );
      })
    );
  }

  private async prepareSecureContext(targetProfileId?: string) {
    const profile = targetProfileId
      ? await this.profileRepo.getById(targetProfileId)
      : await this.profileRepo.getActiveProfile();

    if (!profile) {
      throw new FrameworkError('AI_PROFILE_NOT_FOUND', `Cannot dispatch request: No valid AI profile found.`, false);
    }

    const masterKey = this.securityService.getSessionKey();
    const decryptedKey = await this.cryptoService.decrypt(profile.encryptedApiKey, profile.encryptionIv, masterKey);
    const adapter = this.aiRegistry.createAdapterInstance(profile.providerId);

    return { adapter, decryptedKey, model: profile.selectedModel, profileId: profile.profileId };
  }

  private handleConnectionError(error: any, profileId: string): Observable<never> {
    const isAuthError = error instanceof FrameworkError && error.code === 'AI_AUTH_FAILED';
    const state = isAuthError ? 'InvalidKey' : 'Disconnected';

    this.connectionMonitor.updateState(profileId, state);

    const frameworkError = error instanceof FrameworkError
      ? error
      : new FrameworkError('AI_NETWORK_ERROR', error.message || 'AI Connection failed', true, error);

    return throwError(() => frameworkError);
  }
}