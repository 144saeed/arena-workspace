import { Injectable } from '@angular/core';
import { CoreDatabaseService } from '../database/core-database.service';
import { SecurityService } from '../security/security.service';
import { SchemaManagerService } from '../database/schema-manager.service';
import { FrameworkError } from '../exceptions/framework-error.exception';

/**
 * Manages the import, export, and destruction of the entire OS ecosystem.
 * Enables local-first portability ensuring the user owns their data.
 */
@Injectable({
  providedIn: 'root'
})
export class SystemPortabilityService {

  constructor(
    private readonly dbEngine: CoreDatabaseService,
    private readonly securityService: SecurityService,
    private readonly schemaManager: SchemaManagerService
  ) { }

  async exportEcosystem(): Promise<string> {
    if (!this.securityService.isVaultUnlocked()) {
      throw new FrameworkError('VAULT_LOCKED', '[Portability] Cannot export data while the vault is locked.', false);
    }

    const exportData: Record<string, any[]> = {};
    const tables = this.dbEngine.tables;

    for (const table of tables) {
      exportData[table.name] = await table.toArray();
    }

    console.log(`[Portability] Successfully exported ${tables.length} tables.`);
    return JSON.stringify(exportData);
  }

  async importEcosystem(jsonString: string): Promise<void> {
    if (!this.securityService.isVaultUnlocked()) {
      throw new FrameworkError('VAULT_LOCKED', '[Portability] Cannot import data while the vault is locked.', false);
    }

    try {
      const parsedData: Record<string, any[]> = JSON.parse(jsonString);

      // SECURITY FIX: Filter out strictly protected OS tables so a malicious 
      // backup file cannot overwrite the Master Vault or AI Profiles.
      const systemTables = this.schemaManager.systemTables;
      const safeTablesToImport = this.dbEngine.tables.filter(t => !systemTables.includes(t.name));

      await this.dbEngine.transaction('rw', safeTablesToImport, async () => {
        for (const table of safeTablesToImport) {
          if (parsedData[table.name]) {
            await table.clear();
            await table.bulkPut(parsedData[table.name]);
          }
        }
      });

      console.log('[Portability] Ecosystem imported and restored successfully (System tables were protected).');
    } catch (error) {
      console.error('[Portability] Failed to import ecosystem. Data might be corrupted.', error);
      throw new FrameworkError('IMPORT_FAILED', '[Portability] Import failed. Invalid file format or database error.', false, error);
    }
  }

  async softReset(): Promise<void> {
    if (!this.securityService.isVaultUnlocked()) {
      throw new FrameworkError('VAULT_LOCKED', '[Portability] Cannot perform a soft reset while the vault is locked.', false);
    }

    const systemTables = this.schemaManager.systemTables;
    const tablesToClear = this.dbEngine.tables.filter(t => !systemTables.includes(t.name));

    await this.dbEngine.transaction('rw', tablesToClear, async () => {
      for (const table of tablesToClear) {
        await table.clear();
      }
    });

    console.log('[Portability] Soft reset complete. Plugin data wiped. OS state retained.');
  }

  async factoryReset(): Promise<void> {
    console.warn('[Portability] INITIATING FACTORY RESET...');
    this.securityService.lockVault();

    try {
      if (this.dbEngine.isOpen()) {
        this.dbEngine.close();
      }
      await this.dbEngine.delete();

      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('ArenaMetaDb');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
      });

      localStorage.clear();
      sessionStorage.clear();

      console.log('[Portability] Factory reset complete. Reloading environment...');
      window.location.reload();
    } catch (error) {
      console.error('[Portability] Critical error during factory reset:', error);
      throw new FrameworkError('FACTORY_RESET_FAILED', 'Critical error during factory reset', false, error);
    }
  }
}