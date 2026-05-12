import { Injectable, signal, WritableSignal } from '@angular/core';

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

  /**
   * A reactive map of profile connections.
   * Key: profileId, Value: ProfileConnectionState
   */
  public readonly connectionStates: WritableSignal<Map<string, ProfileConnectionState>> = signal(new Map());

  /**
   * Updates the connection status for a specific AI Profile.
   */
  updateState(profileId: string, state: ConnectionState): void {
    const currentMap = new Map(this.connectionStates());
    currentMap.set(profileId, {
      profileId,
      state,
      lastChecked: new Date()
    });
    this.connectionStates.set(currentMap);
  }

  /**
   * Retrieves the current connection state of a profile.
   */
  getState(profileId: string): ConnectionState {
    const stateObj = this.connectionStates().get(profileId);
    return stateObj ? stateObj.state : 'Unknown';
  }
}