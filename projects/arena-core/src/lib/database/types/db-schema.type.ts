/**
 * Represents a dynamic table schema to be injected into the Core Database (Dexie).
 * This allows applications to define their own isolated tables.
 */
export interface IDbSchema {
    /** * The name of the table (e.g., 'vocabulary', 'resumes') */
    readonly tableName: string;

    /**
     * The Dexie schema definition string.
     * Example: '++id, term, mastery' or 'profileId, isActive'
     */
    readonly schemaDefinition: string;

    /**
     * Flags the table as an internal OS table.
     * System tables are securely protected from soft resets.
     */
    readonly isSystem?: boolean;
}