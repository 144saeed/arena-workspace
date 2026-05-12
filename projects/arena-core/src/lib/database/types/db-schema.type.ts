/**
 * Represents a dynamic table schema to be injected into the Core Database (Dexie).
 * This allows applications to define their own isolated tables.
 */
export interface IDbSchema {
    /** * The name of the table (e.g., 'vocabulary', 'resumes') 
     */
    readonly tableName: string;

    /**
     * The Dexie schema definition string.
     * Example: '++id, term, mastery' or '++id, profileId'
     */
    readonly schemaDefinition: string;
}