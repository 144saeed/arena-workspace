import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IDbSchema } from './types/db-schema.type';
import { FrameworkError } from '../exceptions/framework-error.exception';

interface DbMetaRecord {
  id: number;
  version: number;
  schemaHash: string;
}

class MetaDatabase extends Dexie {
  public metaStore!: Table<DbMetaRecord, number>;

  constructor() {
    super('ArenaMetaDb');
    this.version(1).stores({
      metaStore: 'id'
    });
  }
}

/**
 * Manages dynamic schema injection and evolution.
 * Utilizes an isolated Meta-Database to track versioning securely.
 */
@Injectable({
  providedIn: 'root'
})
export class SchemaManagerService {

  private readonly metaDb = new MetaDatabase();
  private _systemTables: string[] = [];

  public get systemTables(): string[] {
    return this._systemTables;
  }

  async processSchemas(pluginSchemas: IDbSchema[], coreSchemas: IDbSchema[]): Promise<{ version: number; dexieSchema: Record<string, string> }> {
    const combinedSchema: Record<string, string> = {};
    const allSchemas = [...coreSchemas, ...pluginSchemas];

    this._systemTables = allSchemas.filter(s => s.isSystem).map(s => s.tableName);

    allSchemas.forEach(schema => {
      if (combinedSchema[schema.tableName]) {
        // SECURITY/DATA-INTEGRITY FIX: Throw hard error on table name collisions
        throw new FrameworkError(
          'DB_SCHEMA_COLLISION',
          `Critical Error: Multiple plugins attempted to register the same table name '${schema.tableName}'. This will cause data corruption.`,
          false
        );
      }
      combinedSchema[schema.tableName] = schema.schemaDefinition;
    });

    const sortedKeys = Object.keys(combinedSchema).sort();
    const sortedSchema: Record<string, string> = {};
    sortedKeys.forEach(key => {
      sortedSchema[key] = combinedSchema[key];
    });

    const currentSchemaString = JSON.stringify(sortedSchema);
    const metaRecord = await this.metaDb.metaStore.get(1);

    let currentVersion = metaRecord?.version || 1;
    const savedSchemaString = metaRecord?.schemaHash;

    if (savedSchemaString && savedSchemaString !== currentSchemaString) {
      currentVersion += 1;
      console.log(`[Schema Manager] Evolution detected. Auto-bumping database to version ${currentVersion}.`);
    }

    await this.metaDb.metaStore.put({
      id: 1,
      version: currentVersion,
      schemaHash: currentSchemaString
    });

    return {
      version: currentVersion,
      dexieSchema: sortedSchema
    };
  }
}