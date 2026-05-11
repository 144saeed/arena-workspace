import { Injectable, Injector, Type } from '@angular/core';
import { IMessage } from '../contracts/interfaces/message.interface';
import { IMessageHandler } from '../contracts/interfaces/message-handler.interface';
import { IMiddleware } from '../contracts/interfaces/middleware.interface';

/**
 * The Central Command/Query Bus of the OS.
 * Completely Type-Safe: Routes messages using their Class Constructor reference.
 */
@Injectable({
  providedIn: 'root'
})
export class CoreBus {

  // The registry mapping a Message Class to its Handler Class
  private readonly handlers = new Map<Type<IMessage>, Type<IMessageHandler<any, any>>>();

  // The execution pipeline
  private readonly middlewares: IMiddleware[] = [];

  constructor(private readonly injector: Injector) { }

  /**
   * Registers a global middleware to intercept all bus traffic.
   */
  useMiddleware(middleware: IMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Binds a Message Class strictly to its Handler Class.
   */
  registerHandler<TMessage extends IMessage, TResult>(
    messageType: Type<TMessage>,
    handlerType: Type<IMessageHandler<TMessage, TResult>>
  ): void {
    if (this.handlers.has(messageType)) {
      console.warn(`[Core Bus] Overwriting existing handler for message: ${messageType.name}`);
    }
    this.handlers.set(messageType, handlerType);
  }

  /**
   * Dispatches the message through the middleware pipeline and ultimately to the handler.
   */
  async dispatch<TResult>(message: IMessage): Promise<TResult> {
    // Extract the exact Class reference of the incoming message instance
    const messageType = message.constructor as Type<IMessage>;
    const HandlerType = this.handlers.get(messageType);

    if (!HandlerType) {
      throw new Error(`[Core Bus] Critical Error: No handler registered for message type '${messageType.name}'.`);
    }

    // Lazy instantiation using Angular's DI container
    const handlerInstance = this.injector.get(HandlerType);

    // Build and execute the chain dynamically
    let index = 0;
    const executePipeline = async (): Promise<TResult> => {
      if (index < this.middlewares.length) {
        const currentMiddleware = this.middlewares[index++];
        return await currentMiddleware.handle(message, executePipeline);
      }

      // Pipeline exhausted, execute the actual business logic
      return await handlerInstance.handle(message);
    };

    return await executePipeline();
  }
}