import { AiToolCallDto } from './ai-tool-call.dto';

/**
 * Standardized message format for AI interactions, completely supporting Agent workflows.
 */
export interface AiMessageDto {
    /** * The role of the message author. 'tool' is used when providing function execution results. */
    readonly role: 'system' | 'user' | 'assistant' | 'tool';

    /** * The text content of the message. Can be empty if the message is purely a tool call. */
    readonly content: string;

    /** * Present if the assistant is requesting to execute one or more tools. */
    readonly toolCalls?: AiToolCallDto[];

    /** * Present ONLY if the role is 'tool'. Links the result back to the specific execution request. */
    readonly toolCallId?: string;
}