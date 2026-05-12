import { AiToolCallDto } from './ai-tool-call.dto';

export type AiMessagePartType = 'text' | 'image' | 'tool-call' | 'tool-result';

/**
 * Represents a single multimodal fragment of an AI message.
 * Completely future-proofs the architecture against new media types (e.g., audio, video).
 */
export interface AiMessagePartDto {
    readonly type: AiMessagePartType;

    /** * Present if type is 'text' */
    readonly text?: string;

    /** * Present if type is 'image'. Expected as a Base64 Data URI or external URL */
    readonly imageUrl?: string;

    /** * Present if type is 'tool-call'. Contains the AI's request to execute a function */
    readonly toolCall?: AiToolCallDto;

    /** * Present if type is 'tool-result'. Maps back to the toolCall ID */
    readonly toolCallId?: string;

    /** * Present if type is 'tool-result'. The stringified outcome of the execution */
    readonly toolResult?: string;
}