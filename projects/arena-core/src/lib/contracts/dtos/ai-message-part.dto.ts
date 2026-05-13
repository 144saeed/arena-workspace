import { AiToolCallDto } from './ai-tool-call.dto';

export type AiMessagePartType = 'text' | 'image' | 'tool-call' | 'tool-result';

export interface AiMessagePartDto {
    readonly type: AiMessagePartType;
    readonly text?: string;
    readonly imageUrl?: string;
    readonly toolCall?: AiToolCallDto;
    readonly toolCallId?: string;

    /** * The actual name of the function executed. Crucial for strict AI schemas. */
    readonly toolCallName?: string;

    readonly toolResult?: string;
}