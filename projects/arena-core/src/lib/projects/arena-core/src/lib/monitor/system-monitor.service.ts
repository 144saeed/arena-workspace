import { Injectable, signal, WritableSignal } from '@angular/core';

/**
 * The Central Nervous System of the framework.
 * Tracks global processing states using Angular Signals.
 * UI components can subscribe to these signals seamlessly.
 */
@Injectable({
  providedIn: 'root'
})
export class SystemMonitorService {

  /** Represents if the Core Bus is currently actively processing a request */
  public readonly isProcessing: WritableSignal<boolean> = signal(false);

  /** Holds the latest global error message, if any */
  public readonly latestError: WritableSignal<string | null> = signal(null);

  /**
   * Marks the system as busy and clears previous errors.
   */
  public startProcess(): void {
    this.isProcessing.set(true);
    this.latestError.set(null);
  }

  /**
   * Marks the system as idle.
   */
  public endProcess(): void {
    this.isProcessing.set(false);
  }

  /**
   * Broadcasts an error to the entire application.
   * @param error The error object or message thrown during a process.
   */
  public reportError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[System Monitor] Critical Error Intercepted:', errorMessage);
    this.latestError.set(errorMessage);
  }

  /**
   * Manually clears the error state.
   */
  public clearError(): void {
    this.latestError.set(null);
  }
}