/**
 * The unified base exception for all Core Framework errors.
 * Enables the Agent Executor and Middlewares to make smart decisions 
 * based on the 'isRetryable' flag instead of parsing string messages.
 */
export class FrameworkError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly isRetryable: boolean = false,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'FrameworkError';

        // Maintain proper prototype chain for instance checks (instanceof)
        Object.setPrototypeOf(this, FrameworkError.prototype);
    }
}