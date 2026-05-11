import { Injectable } from '@angular/core';
import { BaseRepository } from '../base-repository.class';
import { CoreDatabaseService } from '../core-database.service';
import { AiProfileEntity } from '../../contracts/dtos/ai-profile-entity.entity';

/**
 * Data access layer for the 'os_ai_profiles' table.
 */
@Injectable({
  providedIn: 'root'
})
export class AiProfileRepository extends BaseRepository<AiProfileEntity, string> {
  constructor(dbEngine: CoreDatabaseService) {
    super(dbEngine, 'os_ai_profiles');
  }

  async getActiveProfile(): Promise<AiProfileEntity | undefined> {
    const activeProfiles = await this.table.where({ isActive: true }).toArray();
    return activeProfiles[0];
  }

  async wipeAllEncryptedKeys(): Promise<void> {
    const allProfiles = await this.getAll();
    await this.dbEngine.transaction('rw', this.table, async () => {
      for (const profile of allProfiles) {
        await this.update(profile.providerId, {
          encryptedApiKey: '',
          encryptionIv: ''
        });
      }
    });
  }
}