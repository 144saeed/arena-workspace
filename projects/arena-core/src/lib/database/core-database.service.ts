import { Injectable, Inject, Optional } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { IDbSchema } from './types/db-schema.type';
import { SchemaManagerService } from './schema-manager.service';
import { ARENA_APP_IDENTITY } from '../engine/core-engine.service';
import { AppIdentity } from '../contracts/interfaces/app-identity.interface';
import { FrameworkError } from '../exceptions/framework-error.exception';

/**
 * Validates the provided identity and generates a physically isolated database prefix.
 * Throws a FrameworkError immediately if the identity is missing or invalid,
 * preventing silent creation of malformed databases in the constructor.
 */
export function resolveAndValidateDbPrefix(identity: AppIdentity | null): string {
  if (!identity) {
    throw new FrameworkError('INVALID_APP_IDENTITY', 'Critical Error: AppIdentity configuration is strictly required in provideArenaCore().', true);
  }

  const strictRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  const versionRegex = /^[a-zA-Z0-9._-]{1,20}$/;

  if (!identity.developerId || !strictRegex.test(identity.developerId)) {
    throw new FrameworkError('INVALID_APP_IDENTITY', `Critical Error: developerId '${identity.developerId}' is invalid. Must be 3-50 characters, alphanumeric, dashes, or underscores.`, true);
  }
  if (!identity.appName || !strictRegex.test(identity.appName)) {
    throw new FrameworkError('INVALID_APP_IDENTITY', `Critical Error: appName '${identity.appName}' is invalid. Must be 3-50 characters, alphanumeric, dashes, or underscores.`, true);
  }
  if (!identity.version || !versionRegex.test(identity.version)) {
    throw new FrameworkError('INVALID_APP_IDENTITY', `Critical Error: version '${identity.version}' is invalid. Must be 1-20 characters.`, true);
  }

  let baseSuffix = '';
  // Safe check for SSR (Server-Side Rendering) and Web Workers environments
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const baseElement = document.querySelector('base');
    const baseHref = baseElement ? baseElement.getAttribute('href') : '/';
    baseSuffix = (baseHref || '/').replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
  }

  const identityPrefix = `${identity.developerId}_${identity.appName}_${identity.version}`;
  return baseSuffix ? `${identityPrefix}_${baseSuffix}` : identityPrefix;
}

@Injectable({
  providedIn: 'root'
})
export class CoreDatabaseService extends Dexie {

  constructor(
    private readonly schemaManager: SchemaManagerService,
    @Optional() @Inject(ARENA_APP_IDENTITY) private readonly appIdentity: AppIdentity | null
  ) {
    // Validation runs here, before super() is called. 
    // If invalid, the DI container throws and prevents Dexie initialization.
    const dbPrefix = resolveAndValidateDbPrefix(appIdentity);
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