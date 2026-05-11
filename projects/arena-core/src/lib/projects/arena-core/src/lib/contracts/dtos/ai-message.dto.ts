/**
 * Standardized message format for AI interactions.
 */
export interface AiMessageDto {
    readonly role: 'system' | 'user' | 'assistant';
    readonly content: string;
}