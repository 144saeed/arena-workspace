import { Injectable, Inject, Optional } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IDbSchema } from './types/db-schema.type';
import { FrameworkError } from '../exceptions/framework-error.exception';
import { ARENA_APP_NAME } from '../engine/core-engine.service';

interface DbMetaRecord {
  id: number;
  version: number;
  schemaHash: string;
}

class MetaDatabase extends Dexie {
  public metaStore!: Table<DbMetaRecord, number>;
  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({ metaStore: 'id' });
  }
}

@Injectable({
  providedIn: 'root'
})
export class SchemaManagerService {

  private metaDb!: MetaDatabase;
  private _systemTables: string[] = [];

  constructor(@Optional() @Inject(ARENA_APP_NAME) private readonly appName: string | null) {}

  public get systemTables(): string[] {
    return [...this._systemTables];
  }

  public get metaDbName(): string {
    return this.metaDb.name;
  }

  async processSchemas(pluginSchemas: IDbSchema[], coreSchemas: IDbSchema[]): Promise<{ version: number; dexieSchema: Record<string, string> }> {
    const dbPrefix = this.appName ? `${this.appName}_` : 'ArenaCore_';
    this.metaDb = new MetaDatabase(`${dbPrefix}MetaDb`);

    const combinedSchema: Record<string, string> = {};
    const allSchemas = [...coreSchemas, ...pluginSchemas];

    this._systemTables = allSchemas.filter(s => s.isSystem).map(s => s.tableName);

    allSchemas.forEach(schema => {
      if (combinedSchema[schema.tableName]) {
        throw new FrameworkError(
          'DB_SCHEMA_COLLISION',
          `Critical Error: Table collision detected for '${schema.tableName}'.`,
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
    }

    await this.metaDb.metaStore.put({
      id: 1,
      version: currentVersion,
      schemaHash: currentSchemaString
    });

    return { version: currentVersion, dexieSchema: sortedSchema };
  }
}