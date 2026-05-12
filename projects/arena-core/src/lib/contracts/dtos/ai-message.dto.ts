import { AiMessagePartDto } from './ai-message-part.dto';

/**
 * Standardized multimodal message format for AI Agent interactions.
 * Upgraded from a simple string 'content' to a robust array of 'parts',
 * fully supporting Vision, Tools, and complex contextual reasoning.
 */
export interface AiMessageDto {
    readonly role: 'system' | 'user' | 'assistant' | 'tool';

    /** * The multimodal payload of the message. 
     * Replaces the legacy flat string 'content'. 
     */
    readonly parts: AiMessagePartDto[];
}