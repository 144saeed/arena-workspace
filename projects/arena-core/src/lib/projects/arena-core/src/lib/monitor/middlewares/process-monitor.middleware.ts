import { Injectable } from '@angular/core';
import { IMiddleware } from '../../contracts/interfaces/middleware.interface';
import { IMessage } from '../../contracts/interfaces/message.interface';
import { SystemMonitorService } from '../system-monitor.service';

/**
 * Global Middleware that wraps every action passing through the Core Bus.
 * It manages the global loading state and acts as a generic try-catch block 
 * to propagate unhandled exceptions to the UI safely.
 */
@Injectable({
  providedIn: 'root'
})
export class ProcessMonitorMiddleware implements IMiddleware {

  constructor(private readonly monitor: SystemMonitorService) { }

  async handle<TResult>(message: IMessage, next: () => Promise<TResult>): Promise<TResult> {
    this.monitor.startProcess();
    try {
      const result = await next();
      return result;
    } catch (error) {
      this.monitor.reportError(error);
      // Re-throw so the specific caller also knows it failed, 
      // but the UI has already been notified globally.
      throw error;
    } finally {
      this.monitor.endProcess();
    }
  }
}