import { IMessage } from './message.interface';

/**
 * Represents a side-effect-free data retrieval operation (Read).
 * Handled by IQueryHandler.
 * @template TResult The expected return type of the query.
 */
export interface IQuery<TResult> extends IMessage {
    /** * Strict runtime marker to bypass command-specific middlewares
     * ensuring maximum read performance.
     */
    readonly isQuery: true;
}