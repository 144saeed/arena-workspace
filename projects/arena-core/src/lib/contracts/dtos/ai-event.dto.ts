import { AiToolCallDto } from './ai-tool-call.dto';

export type AiEventType = 'chunk' | 'tool-call' | 'complete' | 'error';

/**
 * Represents a single unified event in an AI streaming connection.
 * Essential for rendering real-time typing effects and intercepting mid-stream tool execution requests.
 */
export interface AiEventDto {
    readonly type: AiEventType;

    /** * Populated when type is 'chunk'. Contains the incremental text generated. */
    readonly content?: string;

    /** * Populated when type is 'tool-call'. The AI has paused generation to request function execution. */
    readonly toolCalls?: AiToolCallDto[];

    /** * Populated when type is 'error'. */
    readonly error?: string;

    /** * Populated when type is 'complete'. */
    readonly tokensUsed?: number;
}