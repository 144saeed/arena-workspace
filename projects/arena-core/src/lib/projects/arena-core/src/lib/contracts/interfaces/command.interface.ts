import { IMessage } from './message.interface';

/**
 * Represents a state-mutating operation (Write).
 * Handled by ICommandHandler.
 */
export interface ICommand extends IMessage {
    /** * Strict runtime marker used by middlewares (like ValidationGuard)
     * to intercept commands without relying on fragile string enums.
     */
    readonly isCommand: true;
}