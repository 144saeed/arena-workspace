/**
 * Base marker interface for all messages traversing the Core Bus.
 * In a type-safe mediator, the class reference itself acts as the unique identifier,
 * eliminating the need for string-based action types.
 */
export interface IMessage {
    // Purposefully left empty. 
    // Implementations will define their own specific payload properties.
}