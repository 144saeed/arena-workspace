import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IMessageHandler } from '../../../contracts/interfaces/message-handler.interface';
import { AiProfileRepository } from '../../../database/repositories/ai-profile-repository.repository';
import { CryptoService } from '../../../security/crypto.service';
import { SecurityService } from '../../../security/security.service';
import { AiRegistryService } from '../../../ai/ai-registry.service';
import { AiProfileEntity } from '../../../contracts/dtos/ai-profile-entity.entity';
import { FrameworkError } from '../../../exceptions/framework-error.exception';

import { AddAiProfileCommand } from '../messages/add-ai-profile.command';
import { DeleteAiProfileCommand } from '../messages/delete-ai-profile.command';
import { GetAiProfilesQuery, SafeAiProfileDto } from '../messages/get-ai-profiles.query';
import { GetProviderModelsQuery } from '../messages/get-provider-models.query';

@Injectable({ providedIn: 'root' })
export class AddAiProfileHandler implements IMessageHandler<AddAiProfileCommand, string> {
  private readonly aiProfileRepo = inject(AiProfileRepository);
  private readonly cryptoService = inject(CryptoService);
  private readonly securityService = inject(SecurityService);
  private readonly aiRegistry = inject(AiRegistryService);

  async handle(message: AddAiProfileCommand): Promise<string> {
    // Strict live validation before any cryptographic operation
    const adapter = this.aiRegistry.createAdapterInstance(message.provider);
    const isValid = await firstValueFrom(adapter.validateKey(message.rawApiKey));

    if (!isValid) {
      throw new FrameworkError('INVALID_API_KEY', 'The provided API key is invalid or lacks sufficient permissions.', false);
    }

    const masterKey = this.securityService.getSessionKey();
    const { cipherTextHex, ivHex } = await this.cryptoService.encrypt(message.rawApiKey, masterKey);

    const profileId = crypto.randomUUID();
    const newProfile: AiProfileEntity = {
      profileId,
      profileName: message.name,
      providerId: message.provider,
      encryptedApiKey: cipherTextHex,
      encryptionIv: ivHex,
      selectedModel: message.selectedModel,
      isActive: false
    };

    await this.aiProfileRepo.create(newProfile);
    return profileId;
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteAiProfileHandler implements IMessageHandler<DeleteAiProfileCommand, void> {
  private readonly aiProfileRepo = inject(AiProfileRepository);

  async handle(message: DeleteAiProfileCommand): Promise<void> {
    await this.aiProfileRepo.delete(message.id);
  }
}

@Injectable({ providedIn: 'root' })
export class GetAiProfilesHandler implements IMessageHandler<GetAiProfilesQuery, SafeAiProfileDto[]> {
  private readonly aiProfileRepo = inject(AiProfileRepository);

  async handle(message: GetAiProfilesQuery): Promise<SafeAiProfileDto[]> {
    const profiles = await this.aiProfileRepo.getAll();

    return profiles.map(p => ({
      id: p.profileId,
      name: p.profileName,
      provider: p.providerId,
      isActive: p.isActive,
      selectedModel: p.selectedModel
    }));
  }
}

@Injectable({ providedIn: 'root' })
export class GetProviderModelsHandler implements IMessageHandler<GetProviderModelsQuery, string[]> {
  private readonly aiRegistry = inject(AiRegistryService);

  async handle(message: GetProviderModelsQuery): Promise<string[]> {
    const adapter = this.aiRegistry.createAdapterInstance(message.providerId);

    try {
      // Fetching models inherently validates the API key. 
      // A single network request prevents redundant latency.
      const models = await firstValueFrom(adapter.fetchModels(message.rawApiKey));
      return models;
    } catch (error) {
      // Preserve specific framework errors (like AI_NETWORK_ERROR for offline status)
      if (error instanceof FrameworkError) {
        throw error;
      }
      throw new FrameworkError('INVALID_API_KEY', 'The provided API key is invalid or lacks sufficient permissions.', false, error);
    }
  }
}