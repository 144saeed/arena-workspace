/**
 * Represents the single master lock record in the local database.
 */
export interface VaultEntity {
    /** * Always 1, as there is only one master vault */
    readonly id: number;
    /** * Randomly generated salt used for hashing and key derivation */
    readonly salt: string;
    /** * SHA-256 hash of the master password + salt (used for login verification) */
    readonly hashedPassword: string;
    /** * Versioning for future cryptographic upgrades */
    readonly vaultVersion: number;
}