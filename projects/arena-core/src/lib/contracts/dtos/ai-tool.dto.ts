/**
 * Represents a callable function (tool) that the AI Agent can execute.
 * This structure closely follows the JSON Schema specification standard.
 */
export interface AiToolDto {
    /** * The strict, programmatic name of the function (e.g., 'getWeather', 'saveFlashcard') */
    readonly name: string;

    /** * A clear description of what the tool does, allowing the AI to decide when to use it */
    readonly description: string;

    /**
     * A JSON Schema object defining the strict properties and types the function accepts.
     */
    readonly parameters: Record<string, any>;
}