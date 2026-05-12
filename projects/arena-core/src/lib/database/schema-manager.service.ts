import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IDbSchema } from './types/db-schema.type';

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

  async processSchemas(pluginSchemas: IDbSchema[], coreSchemas: IDbSchema[]): Promise<{ version: number; dexieSchema: Record<string, string> }> {
    const combinedSchema: Record<string, string> = {};
    const allSchemas = [...coreSchemas, ...pluginSchemas];

    allSchemas.forEach(schema => {
      if (combinedSchema[schema.tableName]) {
        console.warn(`[Schema Manager] Warning: Overwriting existing table schema for: ${schema.tableName}`);
      }
      combinedSchema[schema.tableName] = schema.schemaDefinition;
    });

    // Sort keys alphabetically to guarantee deterministic JSON.stringify output
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