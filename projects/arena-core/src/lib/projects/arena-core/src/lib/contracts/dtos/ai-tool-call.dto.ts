/**
 * Represents an execution request from the AI Agent to run a specific tool.
 */
export interface AiToolCallDto {
    /** * The unique identifier for this specific tool execution request */
    readonly id: string;

    /** * The exact name of the tool (function) the AI wants to execute */
    readonly name: string;

    /** * The parsed JSON arguments provided by the AI to pass into the function */
    readonly arguments: Record<string, any>;
}