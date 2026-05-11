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
 * Fetches the active profile, decrypts the API key securely into RAM, 
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
   * Dispatches a request to the currently active AI provider using RxJS.
   */
  dispatch(request: AiRequestDto): Observable<AiResponseDto> {
    // We use RxJS 'from' to convert the Promise-based DB and Crypto calls into an Observable stream
    return from(this.prepareSecureContext()).pipe(
      switchMap(({ adapter, decryptedKey, model }) => {

        // Inject the default model if the request didn't specify one
        const finalRequest: AiRequestDto = {
          ...request,
          model: request.model || model
        };

        // Execute the AI call
        return adapter.generateResponse(finalRequest, decryptedKey).pipe(
          // Memory Scrubbing: Dereference the decrypted key immediately after the stream completes or errors
          finalize(() => {
            decryptedKey = '';
          })
        );
      })
    );
  }

  private async prepareSecureContext() {
    const activeProfile = await this.profileRepo.getActiveProfile();
    if (!activeProfile) {
      throw new Error('[AI Gateway] Cannot dispatch request: No active AI profile found.');
    }

    const masterKey = this.securityService.getSessionKey();

    // Decrypt the API key into a local variable (RAM only)
    const decryptedKey = await this.cryptoService.decrypt(
      activeProfile.encryptedApiKey,
      activeProfile.encryptionIv,
      masterKey
    );

    // Use the Factory to get the correct adapter (e.g., Gemini Adapter)
    const adapter = this.aiRegistry.createAdapterInstance(activeProfile.providerId);

    return { adapter, decryptedKey, model: activeProfile.selectedModel };
  }
}