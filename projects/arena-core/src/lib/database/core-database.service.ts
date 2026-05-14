import { Injectable, Inject, Optional } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IDbSchema } from './types/db-schema.type';
import { SchemaManagerService } from './schema-manager.service';
import { ARENA_APP_NAME } from '../engine/core-engine.service';

/**
 * Generates a physically isolated database prefix by binding the App Name 
 * to the browser's current URL path. Prevents collision on shared domains (e.g., GitHub Pages).
 */
export function getIsolatedDbPrefix(appName: string | null): string {
  const baseName = appName || 'ArenaCore';
  if (typeof window !== 'undefined') {
    // Convert path like '/my-app/' to 'my_app'
    const pathSuffix = window.location.pathname.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
    return pathSuffix ? `${baseName}_${pathSuffix}` : baseName;
  }
  return baseName;
}

@Injectable({
  providedIn: 'root'
})
export class CoreDatabaseService extends Dexie {

  constructor(
    private readonly schemaManager: SchemaManagerService,
    @Optional() @Inject(ARENA_APP_NAME) private readonly appName: string | null
  ) {
    const dbPrefix = getIsolatedDbPrefix(appName);
    super(`${dbPrefix}_FrameworkDb`);
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