import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IMessageHandler } from '../../../contracts/interfaces/message-handler.interface';
import { AiProfileRepository } from '../../../database/repositories/ai-profile-repository.repository';
import { CryptoService } from '../../../security/crypto.service';
import { SecurityService } from '../../../security/security.service';
import { AiRegistryService } from '../../../ai/ai-registry.service';
import { AiProfileEntity } from '../../../contracts/dtos/ai-profile-entity.entity';
import { AiCapabilitiesDto } from '../../../contracts/dtos/ai-capabilities.dto';
import { FrameworkError } from '../../../exceptions/framework-error.exception';

import { AddAiProfileCommand } from '../messages/add-ai-profile.command';
import { DeleteAiProfileCommand } from '../messages/delete-ai-profile.command';
import { UpdateAiProfileCommand } from '../messages/update-ai-profile.command';
import { SetActiveProfileCommand } from '../messages/set-active-profile.command';
import { GetAiProfilesQuery, SafeAiProfileDto } from '../messages/get-ai-profiles.query';
import { GetProviderModelsQuery } from '../messages/get-provider-models.query';
import { GetModelsByProfileIdQuery } from '../messages/get-models-by-profile-id.query';
import { GetActiveProfileCapabilitiesQuery } from '../messages/get-active-profile-capabilities.query';

@Injectable({ providedIn: 'root' })
export class AddAiProfileHandler implements IMessageHandler<AddAiProfileCommand, string> {
  private readonly aiProfileRepo = inject(AiProfileRepository);
  private readonly cryptoService = inject(CryptoService);
  private readonly securityService = inject(SecurityService);
  private readonly aiRegistry = inject(AiRegistryService);

  async handle(message: AddAiProfileCommand): Promise<string> {
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
export class UpdateAiProfileHandler implements IMessageHandler<UpdateAiProfileCommand, void> {
  private readonly aiProfileRepo = inject(AiProfileRepository);
  private readonly cryptoService = inject(CryptoService);
  private readonly securityService = inject(SecurityService);
  private readonly aiRegistry = inject(AiRegistryService);

  async handle(message: UpdateAiProfileCommand): Promise<void> {
    const profile = await this.aiProfileRepo.getById(message.id);
    if (!profile) {
      throw new FrameworkError('PROFILE_NOT_FOUND', `AI Profile with ID '${message.id}' not found.`, false);
    }

    const updates: Record<string, any> = {};

    if (message.name !== undefined) updates['profileName'] = message.name;
    if (message.selectedModel) updates['selectedModel'] = message.selectedModel;

    if (message.rawApiKey) {
      const adapter = this.aiRegistry.createAdapterInstance(profile.providerId);
      const isValid = await firstValueFrom(adapter.validateKey(message.rawApiKey));

      if (!isValid) {
        throw new FrameworkError('INVALID_API_KEY', 'The provided API key is invalid or lacks sufficient permissions.', false);
      }

      const masterKey = this.securityService.getSessionKey();
      const { cipherTextHex, ivHex } = await this.cryptoService.encrypt(message.rawApiKey, masterKey);

      updates['encryptedApiKey'] = cipherTextHex;
      updates['encryptionIv'] = ivHex;
    }

    if (Object.keys(updates).length > 0) {
      await this.aiProfileRepo.update(message.id, updates as Partial<AiProfileEntity>);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class SetActiveProfileHandler implements IMessageHandler<SetActiveProfileCommand, void> {
  private readonly aiProfileRepo = inject(AiProfileRepository);

  async handle(message: SetActiveProfileCommand): Promise<void> {
    const targetProfile = await this.aiProfileRepo.getById(message.id);
    if (!targetProfile) {
      throw new FrameworkError('PROFILE_NOT_FOUND', `AI Profile with ID '${message.id}' not found.`, false);
    }

    // Delegating the transaction entirely to the Repository to respect encapsulation
    await this.aiProfileRepo.setAsActive(message.id);
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
      const models = await firstValueFrom(adapter.fetchModels(message.rawApiKey));
      return models;
    } catch (error) {
      if (error instanceof FrameworkError) {
        throw error;
      }
      throw new FrameworkError('INVALID_API_KEY', 'The provided API key is invalid or lacks sufficient permissions.', false, error);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class GetModelsByProfileIdHandler implements IMessageHandler<GetModelsByProfileIdQuery, string[]> {
  private readonly aiProfileRepo = inject(AiProfileRepository);
  private readonly cryptoService = inject(CryptoService);
  private readonly securityService = inject(SecurityService);
  private readonly aiRegistry = inject(AiRegistryService);

  async handle(message: GetModelsByProfileIdQuery): Promise<string[]> {
    const profile = await this.aiProfileRepo.getById(message.profileId);
    if (!profile) {
      throw new FrameworkError('PROFILE_NOT_FOUND', `AI Profile with ID '${message.profileId}' not found.`, false);
    }

    const masterKey = this.securityService.getSessionKey();
    const decryptedKey = await this.cryptoService.decrypt(profile.encryptedApiKey, profile.encryptionIv, masterKey);

    const adapter = this.aiRegistry.createAdapterInstance(profile.providerId);

    try {
      const models = await firstValueFrom(adapter.fetchModels(decryptedKey));
      return models;
    } catch (error) {
      if (error instanceof FrameworkError) {
        throw error;
      }
      throw new FrameworkError('INVALID_API_KEY', 'The stored API key is invalid or lacks sufficient permissions.', false, error);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class GetActiveProfileCapabilitiesHandler implements IMessageHandler<GetActiveProfileCapabilitiesQuery, AiCapabilitiesDto | undefined> {
  private readonly aiProfileRepo = inject(AiProfileRepository);
  private readonly aiRegistry = inject(AiRegistryService);

  async handle(message: GetActiveProfileCapabilitiesQuery): Promise<AiCapabilitiesDto | undefined> {
    const activeProfile = await this.aiProfileRepo.getActiveProfile();
    if (!activeProfile) return undefined;

    // Leveraging the new interface method to safely retrieve static capabilities
    const adapter = this.aiRegistry.createAdapterInstance(activeProfile.providerId);
    return adapter.getCapabilities();
  }
}