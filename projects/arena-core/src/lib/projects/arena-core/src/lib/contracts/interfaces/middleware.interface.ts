import { IMessage } from './message.interface';

/**
 * Contract for intercepted operations in the Core Bus pipeline.
 * Middlewares can modify the message, block it, or react to its success/failure.
 */
export interface IMiddleware {
    /**
     * Executes the middleware logic.
     * @param message The incoming command or query.
     * @param next A function that passes control to the next middleware or the final handler.
     */
    handle<TResult>(message: IMessage, next: () => Promise<TResult>): Promise<TResult>;
}