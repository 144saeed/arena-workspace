import { Injectable, signal } from '@angular/core';

/**
 * The Central Nervous System of the framework.
 * Tracks global processing states using Angular Signals.
 * UI components can subscribe to these signals seamlessly.
 */
@Injectable({
  providedIn: 'root'
})
export class SystemMonitorService {

  // SECURITY FIX: Expose signals as readonly to prevent unauthorized mutations
  private readonly _isProcessing = signal<boolean>(false);
  public readonly isProcessing = this._isProcessing.asReadonly();

  private readonly _latestError = signal<string | null>(null);
  public readonly latestError = this._latestError.asReadonly();

  public startProcess(): void {
    this._isProcessing.set(true);
    this._latestError.set(null);
  }

  public endProcess(): void {
    this._isProcessing.set(false);
  }

  public reportError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // SECURITY FIX: Abstracted error logging to prevent leaking stack traces or sensitive data
    console.warn('[System Monitor] An internal error occurred and was captured by the monitor.');
    this._latestError.set(errorMessage);
  }

  public clearError(): void {
    this._latestError.set(null);
  }
}