import { Injectable } from '@angular/core';
import { Observable, from, switchMap, finalize } from 'rxjs';
import { AiRequestDto } from '../contracts/dtos/ai-request.dto';
import { AiResponseDto } from '../contracts/dtos/ai-response.dto';
import { AiRegistryService } from './ai-registry.service';
import { SecurityService } from '../security/security.service';
import { AiProfileRepository } from '../database/repositories/ai-profile-repository.repository';
import { CryptoService } from '../security/crypto.service';

/**
 * The Central Communication Hub for all AI operations.
 * Fetches the requested or active profile, decrypts the API key securely into RAM, 
 * routes the request via the Factory, and ensures memory scrubbing post-execution.
 */
@Injectable({
  providedIn: 'root'
})
export class AiGatewayService {

  constructor(
    private readonly aiRegistry: AiRegistryService,
    private readonly securityService: SecurityService,
    private readonly profileRepo: AiProfileRepository,
    private readonly cryptoService: CryptoService
  ) { }

  /**
   * Dispatches a request to the specified AI profile or the default active provider.
   * @param request The standard AI request payload.
   * @param targetProfileId Optional. If provided, bypasses the active profile and uses this specific identity.
   */
  dispatch(request: AiRequestDto, targetProfileId?: string): Observable<AiResponseDto> {
    return from(this.prepareSecureContext(targetProfileId)).pipe(
      switchMap(({ adapter, decryptedKey, model }) => {

        const finalRequest: AiRequestDto = {
          ...request,
          model: request.model || model
        };

        return adapter.generateResponse(finalRequest, decryptedKey).pipe(
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

    return { adapter, decryptedKey, model: profile.selectedModel };
  }
}