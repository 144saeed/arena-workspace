import { Injectable, inject } from '@angular/core';
import { Table } from 'dexie';
import { CoreDatabaseService } from './core-database.service';
import { FrameworkError } from '../exceptions/framework-error.exception';

/**
 * Public Data Store Service
 * This is the ONLY database service exported to developers building applications on ArenaCore.
 * It provides full, unhindered Dexie functionality for their own tables, 
 * while strictly blocking access to internal OS tables.
 */
@Injectable({
  providedIn: 'root'
})
export class PublicDataStoreService {
  private readonly coreDb = inject(CoreDatabaseService);

  /**
   * Retrieves a Dexie Table instance for application-space operations.
   * Throws a security error if an attempt is made to access 'os_' system tables.
   * * @param tableName The name of the registered application table.
   * @returns Dexie.Table instance with full IntelliSense support.
   */
  public getTable<TEntity, TKey = any>(tableName: string): Table<TEntity, TKey> {
    if (tableName.startsWith('os_')) {
      throw new FrameworkError(
        'SECURITY_VIOLATION',
        `Access Denied: Attempted to directly access the system table '${tableName}'. System tables must be accessed via their respective Command/Query interfaces.`,
        false
      );
    }

    return this.coreDb.getTable<TEntity, TKey>(tableName);
  }
}