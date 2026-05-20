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
    await this.dbEngine.transaction('rw', this.table, async () => {
      const allProfiles = await this.table.toArray();
      for (const profile of allProfiles) {
        await this.table.update(profile.profileId, {
          encryptedApiKey: '',
          encryptionIv: ''
        } as any);
      }
    });
  }

  // Encapsulating the transaction logic for atomic active profile toggling.
  async setAsActive(profileId: string): Promise<void> {
    await this.dbEngine.transaction('rw', this.table, async () => {
      const allProfiles = await this.table.toArray();
      for (const profile of allProfiles) {
        const isActive = profile.profileId === profileId;
        await this.table.update(profile.profileId, { isActive } as any);
      }
    });
  }
}