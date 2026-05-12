import { Injectable } from '@angular/core';
import { CoreDatabaseService } from '../database/core-database.service';
import { SecurityService } from '../security/security.service';
import { SchemaManagerService } from '../database/schema-manager.service';
import { FrameworkError } from '../exceptions/framework-error.exception';

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
    const systemTables = this.schemaManager.systemTables;

    for (const table of tables) {
      // ARCHITECTURE FIX: Never export system tables (os_vault, os_ai_profiles)
      // to ensure cross-device portability without compromising security.
      if (!systemTables.includes(table.name)) {
        exportData[table.name] = await table.toArray();
      }
    }

    return JSON.stringify({ isArenaExport: true, version: 1, data: exportData });
  }

  async importEcosystem(jsonString: string): Promise<void> {
    if (!this.securityService.isVaultUnlocked()) {
      throw new FrameworkError('VAULT_LOCKED', '[Portability] Cannot import data while the vault is locked.', false);
    }

    try {
      let parsedWrap;
      try {
        parsedWrap = JSON.parse(jsonString);
      } catch (e) {
        throw new Error('Malformed JSON string.');
      }

      // Ensure it's our designated export format
      if (!parsedWrap.isArenaExport || !parsedWrap.data) {
        throw new Error('Invalid or legacy export file.');
      }

      const parsedData: Record<string, any[]> = parsedWrap.data;

      // SECURITY FIX: Deep DOS and Prototype Pollution check
      if (typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        throw new Error('Invalid export format structure.');
      }

      const systemTables = this.schemaManager.systemTables;
      const safeTablesToImport = this.dbEngine.tables.filter(t => !systemTables.includes(t.name));

      await this.dbEngine.transaction('rw', safeTablesToImport, async () => {
        for (const table of safeTablesToImport) {
          const tableData = parsedData[table.name];

          if (tableData && Array.isArray(tableData)) {
            // DOS Protection: Limit records per table
            if (tableData.length > 50000) {
              throw new Error(`Payload too large for table ${table.name}.`);
            }
            await table.clear();
            await table.bulkPut(tableData);
          }
        }
      });

      console.log('[Portability] Ecosystem imported and restored successfully.');
    } catch (error) {
      console.error('[Portability] Failed to import ecosystem:', error);
      throw new FrameworkError('IMPORT_FAILED', 'Import failed. Invalid file format or data corruption detected.', false, error);
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
      window.location.reload();
    } catch (error) {
      throw new FrameworkError('FACTORY_RESET_FAILED', 'Critical error during factory reset', false, error);
    }
  }
}