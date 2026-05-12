/**
 * Represents a stored AI provider configuration (Multi-Profile Support).
 */
export interface AiProfileEntity {
    /** * The unique identifier for this specific profile (Primary Key) */
    readonly profileId: string;

    /** * The display name given by the user (e.g., 'My Paid Gemini', 'Free ChatGPT') */
    readonly profileName: string;

    /** * The adapter ID this profile uses (e.g., 'google-gemini') */
    readonly providerId: string;

    /** * The AES-256-GCM encrypted API Key */
    readonly encryptedApiKey: string;

    /** * Initialization Vector used for encryption, required for decryption */
    readonly encryptionIv: string;

    /** * The last selected model by the user for this profile */
    readonly selectedModel: string;

    /** * Flag indicating if this is the global default AI provider */
    readonly isActive: boolean;
}