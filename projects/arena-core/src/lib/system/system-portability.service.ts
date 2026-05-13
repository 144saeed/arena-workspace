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
      throw new FrameworkError('VAULT_LOCKED', 'Cannot export data while the vault is locked.', false);
    }

    const exportData: Record<string, any[]> = {};
    const tables = this.dbEngine.tables;
    const systemTables = this.schemaManager.systemTables;

    for (const table of tables) {
      if (!systemTables.includes(table.name)) {
        exportData[table.name] = await table.toArray();
      }
    }

    return JSON.stringify({ isArenaExport: true, version: 1, data: exportData });
  }

  async importEcosystem(jsonString: string): Promise<void> {
    if (!this.securityService.isVaultUnlocked()) {
      throw new FrameworkError('VAULT_LOCKED', 'Cannot import data while the vault is locked.', false);
    }

    try {
      let parsedWrap;
      try {
        parsedWrap = JSON.parse(jsonString);
      } catch (e) {
        throw new FrameworkError('IMPORT_PARSE_ERROR', 'Malformed JSON string.', false);
      }

      if (!parsedWrap.isArenaExport || !parsedWrap.data) {
        throw new FrameworkError('IMPORT_INVALID_FORMAT', 'Invalid or legacy export file.', false);
      }

      const parsedData: Record<string, any[]> = parsedWrap.data;

      if (typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        throw new FrameworkError('IMPORT_STRUCTURAL_ERROR', 'Invalid export format structure.', false);
      }

      const systemTables = this.schemaManager.systemTables;
      const safeTablesToImport = this.dbEngine.tables.filter(t => !systemTables.includes(t.name));

      await this.dbEngine.transaction('rw', safeTablesToImport, async () => {
        for (const table of safeTablesToImport) {
          const tableData = parsedData[table.name];

          if (tableData && Array.isArray(tableData)) {
            if (tableData.length > 50000) {
              throw new FrameworkError('IMPORT_DOS_RISK', `Payload too large for table ${table.name}.`, false);
            }
            await table.clear();
            await table.bulkPut(tableData);
          }
        }
      });

      console.log('[Portability] Ecosystem imported and restored successfully.');
    } catch (error) {
      const isFrameworkError = error instanceof FrameworkError;
      throw isFrameworkError ? error : new FrameworkError('IMPORT_FAILED', 'Import failed due to data corruption.', false, error);
    }
  }

  async softReset(): Promise<void> {
    if (!this.securityService.isVaultUnlocked()) {
      throw new FrameworkError('VAULT_LOCKED', 'Cannot perform a soft reset while the vault is locked.', false);
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
    console.warn('[Portability] Initiating factory reset...');
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

      // Removed aggressive localStorage/sessionStorage clearing to protect unrelated apps
      window.location.reload();
    } catch (error) {
      throw new FrameworkError('FACTORY_RESET_FAILED', 'Error during factory reset', false, error);
    }
  }
}