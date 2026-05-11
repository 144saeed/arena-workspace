import { AiMessageDto } from './ai-message.dto';

/**
 * Standardized request payload to be sent to any AI adapter.
 */
export interface AiRequestDto {
    readonly messages: AiMessageDto[];
    /** * The specific model to use (e.g., 'gemini-1.5-pro'). If omitted, adapter uses the default. */
    readonly model?: string;
    readonly temperature?: number;
    /** * Instructs the AI to return the response in JSON format if supported */
    readonly expectJson?: boolean;
}