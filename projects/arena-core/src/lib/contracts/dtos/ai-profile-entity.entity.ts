/**
 * Represents a stored AI provider configuration.
 */
export interface AiProfileEntity {
    /** * The primary key (e.g., 'gemini', 'openai') */
    readonly providerId: string;
    /** * The AES-256-GCM encrypted API Key */
    readonly encryptedApiKey: string;
    /** * Initialization Vector used for encryption, required for decryption */
    readonly encryptionIv: string;
    /** * The last selected model by the user for this provider */
    readonly selectedModel: string;
    /** * Flag indicating if this is the currently active AI provider */
    readonly isActive: boolean;
}