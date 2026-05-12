import { Injectable } from '@angular/core';
import { CoreDatabaseService } from '../database/core-database.service';
import { SecurityService } from '../security/security.service';
import { SchemaManagerService } from '../database/schema-manager.service';
import { FrameworkError } from '../exceptions/framework-error.exception';
import { CryptoService } from '../security/crypto.service';

@Injectable({
  providedIn: 'root'
})
export class SystemPortabilityService {

  constructor(
    private readonly dbEngine: CoreDatabaseService,
    private readonly securityService: SecurityService,
    private readonly schemaManager: SchemaManagerService,
    private readonly cryptoService: CryptoService
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

    const rawJson = JSON.stringify(exportData);
    const masterKey = this.securityService.getSessionKey();
    const { cipherTextHex, ivHex } = await this.cryptoService.encrypt(rawJson, masterKey);

    return JSON.stringify({ isArenaEncryptedExport: true, ivHex, data: cipherTextHex });
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

      // SECURITY FIX: Reject legacy plain-text backups to enforce security
      if (!parsedWrap.isArenaEncryptedExport || !parsedWrap.data || !parsedWrap.ivHex) {
        throw new FrameworkError('INSECURE_IMPORT', 'Plain-text or invalid backups are rejected for security reasons.', false);
      }

      const masterKey = this.securityService.getSessionKey();
      const payloadStr = await this.cryptoService.decrypt(parsedWrap.data, parsedWrap.ivHex, masterKey);
      const parsedData: Record<string, any[]> = JSON.parse(payloadStr);

      // SECURITY FIX: Prevent Prototype Pollution and DOS via malformed structures
      if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
        throw new Error('Invalid export format structure.');
      }
      if ('__proto__' in parsedData || 'constructor' in parsedData) {
        throw new Error('Malicious prototype pollution payload detected.');
      }

      const systemTables = this.schemaManager.systemTables;
      const safeTablesToImport = this.dbEngine.tables.filter(t => !systemTables.includes(t.name));

      await this.dbEngine.transaction('rw', safeTablesToImport, async () => {
        for (const table of safeTablesToImport) {
          if (parsedData[table.name] && Array.isArray(parsedData[table.name])) {
            await table.clear();
            await table.bulkPut(parsedData[table.name]);
          }
        }
      });

      console.log('[Portability] Ecosystem imported and restored successfully.');
    } catch (error) {
      console.error('[Portability] Failed to import ecosystem:', error);
      throw new FrameworkError('IMPORT_FAILED', 'Import failed. Invalid file format, structural corruption, or wrong encryption key.', false, error);
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