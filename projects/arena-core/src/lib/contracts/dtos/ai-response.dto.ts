import { AiToolCallDto } from './ai-tool-call.dto';

/**
 * Standardized response payload returned by any AI adapter.
 */
export interface AiResponseDto {
    /** * The textual response from the AI. May be empty if the AI chose to only call a tool. */
    readonly content: string;

    readonly tokensUsed?: number;

    readonly providerId: string;

    /** * Populated if the AI decided to call one or more tools instead of answering directly. */
    readonly toolCalls?: AiToolCallDto[];
}