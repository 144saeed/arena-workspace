import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IDbSchema } from './types/db-schema.type';
import { SchemaManagerService } from './schema-manager.service';

/**
 * The Central Database Engine of the Framework.
 * Configures tables dynamically based on registered applications.
 */
@Injectable({
  providedIn: 'root'
})
export class CoreDatabaseService extends Dexie {

  constructor(private readonly schemaManager: SchemaManagerService) {
    super('ArenaFrameworkDb');
  }

  /**
   * Initializes the database with schemas. Must be called during bootstrap.
   * @param appSchemas Schemas collected from registered applications.
   * @param coreSchemas Mandatory internal OS schemas.
   */
  async initializeDatabase(appSchemas: IDbSchema[], coreSchemas: IDbSchema[] = []): Promise<void> {
    if (this.isOpen()) {
      this.close();
    }

    const { version, dexieSchema } = await this.schemaManager.processSchemas(appSchemas, coreSchemas);

    this.version(version).stores(dexieSchema);

    try {
      await this.open();
      console.log(`[Core Database] Initialized successfully at version ${version}.`);
    } catch (error) {
      console.error('[Core Database] Critical Initialization Failure:', error);
      throw error;
    }
  }

  /**
   * Generic access to any dynamic table.
   */
  getTable<T = any, TKey = any>(tableName: string): Table<T, TKey> {
    return this.table(tableName);
  }
}