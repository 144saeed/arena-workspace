import Dexie, { Table } from 'dexie';
import { CoreDatabaseService } from './core-database.service';

/**
 * Abstract base class providing standard CRUD operations.
 * Applications extend this class to easily interact with their specific tables.
 * @template T Entity interface
 * @template TKey Primary Key type (usually string or number)
 */
export abstract class BaseRepository<T, TKey> {

    // 🚀 THE FIX: Use a getter to dynamically fetch the table ONLY when needed.
    // This prevents Dexie from throwing 'InvalidTableError' during Angular's DI phase.
    protected get table(): Table<T, TKey> {
        return this.dbEngine.getTable<T, TKey>(this.tableName);
    }

    constructor(
        protected readonly dbEngine: CoreDatabaseService,
        protected readonly tableName: string
    ) {
        // ❌ REMOVED: this.table = this.dbEngine.getTable<T, TKey>(this.tableName);
    }

    async getAll(): Promise<T[]> {
        return await this.table.toArray();
    }

    async getById(id: TKey): Promise<T | undefined> {
        return await this.table.get(id);
    }

    async create(item: T): Promise<TKey> {
        return await this.table.add(item);
    }

    async update(id: TKey, changes: Partial<T>): Promise<number> {
        // Dexie's update expects a specific format, hence the any cast internally
        return await this.table.update(id, changes as any);
    }

    async delete(id: TKey): Promise<void> {
        return await this.table.delete(id);
    }

    async bulkPut(items: T[]): Promise<TKey> {
        return await this.table.bulkPut(items);
    }
}