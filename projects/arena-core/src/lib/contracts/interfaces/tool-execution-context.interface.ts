import { Injector } from '@angular/core';

/**
 * Context injected into every executed Tool Handler.
 * Resolves JavaScript 'this' binding traps by providing native Angular 
 * Dependency Injection and execution lifecycle controls directly to the tool.
 */
export interface IToolExecutionContext {
    /** * Allows the tool to dynamically resolve required Angular Services (e.g., Repositories) */
    readonly injector: Injector;

    /** * Allows the tool to gracefully abort long-running tasks if the parent stream is cancelled */
    readonly abortSignal?: AbortSignal;
}