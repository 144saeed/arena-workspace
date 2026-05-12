import { IMessage } from './message.interface';

/**
 * Base contract for processing a specific message type.
 * @template TMessage The specific command or query class.
 * @template TResult The expected return type (void for most commands).
 */
export interface IMessageHandler<TMessage extends IMessage, TResult> {
    /**
     * Executes the business logic for the dispatched message.
     * @param message The strongly-typed incoming message instance.
     */
    handle(message: TMessage): Promise<TResult>;
}