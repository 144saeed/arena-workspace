import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SystemMonitorService {

  private readonly _isProcessing = signal<boolean>(false);
  public readonly isProcessing = this._isProcessing.asReadonly();

  private readonly _latestError = signal<string | null>(null);
  public readonly latestError = this._latestError.asReadonly();

  private activeProcesses = 0;

  public startProcess(): void {
    this.activeProcesses++;
    this._isProcessing.set(true);
    /** Preserves existing unread errors from being overwritten during concurrent process initializations. */
  }

  public endProcess(): void {
    this.activeProcesses = Math.max(0, this.activeProcesses - 1);
    if (this.activeProcesses === 0) {
      this._isProcessing.set(false);
    }
  }

  public reportError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[System Monitor] An internal error occurred and was captured by the monitor.');
    this._latestError.set(errorMessage);
  }

  public clearError(): void {
    this._latestError.set(null);
  }
}