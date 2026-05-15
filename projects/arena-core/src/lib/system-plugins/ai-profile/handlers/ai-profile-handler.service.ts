import { Injectable, inject } from '@angular/core';
import { IMessageHandler } from '../../../contracts/interfaces/message-handler.interface';
import { AiProfileRepository } from '../../../database/repositories/ai-profile-repository.repository';
import { CryptoService } from '../../../security/crypto.service';
import { SecurityService } from '../../../security/security.service';
import { AiProfileEntity } from '../../../contracts/dtos/ai-profile-entity.entity';

import { AddAiProfileCommand } from '../messages/add-ai-profile.command';
import { DeleteAiProfileCommand } from '../messages/delete-ai-profile.command';
import { GetAiProfilesQuery, SafeAiProfileDto } from '../messages/get-ai-profiles.query';

@Injectable({ providedIn: 'root' })
export class AddAiProfileHandler implements IMessageHandler<AddAiProfileCommand, string> {
  private readonly aiProfileRepo = inject(AiProfileRepository);
  private readonly cryptoService = inject(CryptoService);
  private readonly securityService = inject(SecurityService);

  async handle(message: AddAiProfileCommand): Promise<string> {
    const masterKey = this.securityService.getSessionKey();
    const { cipherTextHex, ivHex } = await this.cryptoService.encrypt(message.rawApiKey, masterKey);

    const profileId = crypto.randomUUID();
    const newProfile: AiProfileEntity = {
      profileId,
      profileName: message.name,
      providerId: message.provider,
      encryptedApiKey: cipherTextHex,
      encryptionIv: ivHex,
      selectedModel: '',
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
      isActive: p.isActive
    }));
  }
}