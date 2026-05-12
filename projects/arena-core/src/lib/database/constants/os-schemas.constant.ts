import { IDbSchema } from '../types/db-schema.type';

/**
 * Mandatory OS-level schemas required for the framework to boot securely.
 * These tables are flagged as system tables to protect them from data wipes.
 */
export const OS_MANDATORY_SCHEMAS: IDbSchema[] = [
    {
        tableName: 'os_vault',
        schemaDefinition: 'id', // 'id' is the primary key
        isSystem: true
    },
    {
        tableName: 'os_ai_profiles',
        schemaDefinition: 'profileId, isActive', // profileId is PK, isActive is indexed for querying
        isSystem: true
    }
];