import { AiMessageDto } from './ai-message.dto';
import { AiToolDto } from './ai-tool.dto';

/**
 * Standardized request payload to be sent to any AI adapter.
 * Upgraded to fully support AI Agents through Tool Declarations.
 */
export interface AiRequestDto {
    readonly messages: AiMessageDto[];

    /** * The specific model to use (e.g., 'gemini-1.5-pro'). If omitted, adapter uses the default. */
    readonly model?: string;

    /** * Controls the randomness of the response. */
    readonly temperature?: number;

    /** * Instructs the AI to return the response strictly in JSON format if supported. */
    readonly expectJson?: boolean;

    /** * An array of tools (functions) that the AI agent is allowed to decide to call. */
    readonly tools?: AiToolDto[];
}