import { Injectable, Inject, Optional } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IDbSchema } from './types/db-schema.type';
import { SchemaManagerService } from './schema-manager.service';
import { ARENA_APP_NAME } from '../engine/core-engine.service';

@Injectable({
  providedIn: 'root'
})
export class CoreDatabaseService extends Dexie {

  constructor(
    private readonly schemaManager: SchemaManagerService,
    @Optional() @Inject(ARENA_APP_NAME) private readonly appName: string | null
  ) {
    // FIX: Pass the dynamically injected name directly to Dexie's constructor
    super(appName ? `${appName}_FrameworkDb` : 'ArenaCore_FallbackDb');
  }

  async initializeDatabase(appSchemas: IDbSchema[], coreSchemas: IDbSchema[] = []): Promise<void> {
    if (this.isOpen()) {
      this.close();
    }

    const { version, dexieSchema } = await this.schemaManager.processSchemas(appSchemas, coreSchemas);

    this.version(version).stores(dexieSchema);

    try {
      await this.open();
      console.log(`[Core Database] '${this.name}' initialized successfully at version ${version}.`);
    } catch (error) {
      console.error('[Core Database] Critical Initialization Failure:', error);
      throw error;
    }
  }

  getTable<T = any, TKey = any>(tableName: string): Table<T, TKey> {
    return this.table(tableName);
  }
}