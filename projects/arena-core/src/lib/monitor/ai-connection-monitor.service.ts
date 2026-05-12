import { Injectable, signal } from '@angular/core';

export type ConnectionState = 'Connected' | 'Disconnected' | 'InvalidKey' | 'Unknown';

export interface ProfileConnectionState {
  profileId: string;
  state: ConnectionState;
  lastChecked: Date;
}

/**
 * Monitors and retains the real-time connection status of all AI Profiles.
 * Utilizes Angular Signals to provide reactive, immediate updates to the UI.
 */
@Injectable({
  providedIn: 'root'
})
export class AiConnectionMonitorService {

  // SECURITY FIX: Expose map as readonly to prevent external component mutations
  private readonly _connectionStates = signal<Map<string, ProfileConnectionState>>(new Map());
  public readonly connectionStates = this._connectionStates.asReadonly();

  updateState(profileId: string, state: ConnectionState): void {
    const currentMap = new Map(this._connectionStates());
    currentMap.set(profileId, {
      profileId,
      state,
      lastChecked: new Date()
    });
    this._connectionStates.set(currentMap);
  }

  getState(profileId: string): ConnectionState {
    const stateObj = this._connectionStates().get(profileId);
    return stateObj ? stateObj.state : 'Unknown';
  }
}