/**
 * Represents the single master lock record in the local database.
 */
export interface VaultEntity {
    readonly id: number;

    /** * Salt exclusively used for verifying the master password (Login) */
    readonly loginSalt: string;

    /** * Salt exclusively used for deriving the AES-GCM encryption key */
    readonly encryptionSalt: string;

    readonly hashedPassword: string;
    readonly vaultVersion: number;
    readonly failedAttempts?: number;
    readonly lastFailedAttempt?: number;
}