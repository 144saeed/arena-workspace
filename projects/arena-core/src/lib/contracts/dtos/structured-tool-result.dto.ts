/**
 * The strict return signature required from all registered AI tools.
 * Prevents "Blind Error Loops" by clearly separating logical business errors 
 * from successful executions, guiding the Agent on how to proceed.
 */
export interface StructuredToolResultDto {
    readonly status: 'success' | 'retryable_error' | 'fatal_error';

    /** * The resulting data if successful. Will be stringified internally for the AI. */
    readonly data?: any;

    /** * A clear error message intended for the AI to read and understand what went wrong. */
    readonly errorMessage?: string;
}