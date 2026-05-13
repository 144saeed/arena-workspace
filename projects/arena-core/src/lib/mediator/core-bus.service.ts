import { Injectable, Injector, Type } from '@angular/core';
import { IMessage } from '../contracts/interfaces/message.interface';
import { IMessageHandler } from '../contracts/interfaces/message-handler.interface';
import { IMiddleware } from '../contracts/interfaces/middleware.interface';
import { FrameworkError } from '../exceptions/framework-error.exception';

@Injectable({
  providedIn: 'root'
})
export class CoreBus {

  private readonly handlers = new Map<Type<IMessage>, Type<IMessageHandler<any, any>>>();
  private readonly middlewares: IMiddleware[] = [];

  constructor(private readonly injector: Injector) { }

  useMiddleware(middleware: IMiddleware): void {
    this.middlewares.push(middleware);
  }

  registerHandler<TMessage extends IMessage, TResult>(
    messageType: Type<TMessage>,
    handlerType: Type<IMessageHandler<TMessage, TResult>>
  ): void {
    if (this.handlers.has(messageType)) {
      throw new FrameworkError('REGISTRY_COLLISION', `Collision detected for handler ${messageType.name}`, false);
    }
    this.handlers.set(messageType, handlerType);
  }

  async dispatch<TResult>(message: IMessage): Promise<TResult> {
    const messageType = message.constructor as Type<IMessage>;
    const HandlerType = this.handlers.get(messageType);

    if (!HandlerType) {
      throw new FrameworkError('HANDLER_NOT_FOUND', `No handler registered for message type '${messageType.name}'.`, false);
    }

    const handlerInstance = this.injector.get(HandlerType);

    const executePipeline = async (idx: number): Promise<TResult> => {
      if (idx < this.middlewares.length) {
        const currentMiddleware = this.middlewares[idx];
        return await currentMiddleware.handle(message, () => executePipeline(idx + 1));
      }
      return await handlerInstance.handle(message);
    };

    return await executePipeline(0);
  }
}