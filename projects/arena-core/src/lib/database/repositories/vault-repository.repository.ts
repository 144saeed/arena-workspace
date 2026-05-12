import { Injectable } from '@angular/core';
import { BaseRepository } from '../base-repository.class';
import { CoreDatabaseService } from '../core-database.service';
import { VaultEntity } from '../../contracts/dtos/vault-entity.entity';

/**
 * Data access layer for the mandatory 'os_vault' table.
 */
@Injectable({
  providedIn: 'root'
})
export class VaultRepository extends BaseRepository<VaultEntity, number> {
  constructor(dbEngine: CoreDatabaseService) {
    super(dbEngine, 'os_vault');
  }

  async getMasterVault(): Promise<VaultEntity | undefined> {
    return await this.getById(1);
  }
}