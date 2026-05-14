import { Injectable, signal, Inject, Optional, InjectionToken } from '@angular/core';
import { IAppPlugin } from '../contracts/interfaces/app-plugin.interface';
import { AiAdapterConstructor } from '../contracts/interfaces/ai-adapter.interface';
import { CoreDatabaseService } from '../database/core-database.service';
import { CoreBus } from '../mediator/core-bus.service';
import { SecurityService } from '../security/security.service';
import { ProcessMonitorMiddleware } from '../monitor/middlewares/process-monitor.middleware';
import { SecurityGuardMiddleware } from '../security/middlewares/security-guard.middleware';
import { AiRegistryService } from '../ai/ai-registry.service';
import { OS_MANDATORY_SCHEMAS } from '../database/constants/os-schemas.constant';
import { AppIdentity } from '../contracts/interfaces/app-identity.interface';

export const ARENA_APP_IDENTITY = new InjectionToken<AppIdentity>('ARENA_APP_IDENTITY');

@Injectable({
  providedIn: 'root'
})
export class CoreEngineService {

  private readonly _isBooted = signal<boolean>(false);
  public readonly isBooted = this._isBooted.asReadonly();

  constructor(
    private readonly databaseEngine: CoreDatabaseService,
    private readonly coreBus: CoreBus,
    private readonly securityService: SecurityService,
    private readonly securityGuard: SecurityGuardMiddleware,
    private readonly processMonitor: ProcessMonitorMiddleware,
    private readonly aiRegistry: AiRegistryService,
    @Optional() @Inject(ARENA_APP_IDENTITY) private readonly appIdentity: AppIdentity | null
  ) { }

  async boot(plugins: IAppPlugin[], aiAdapters: AiAdapterConstructor[] = []): Promise<void> {
    if (this.isBooted()) return;

    try {
      const pluginSchemas = plugins.flatMap(p => p.requiredDbSchemas);

      await this.databaseEngine.initializeDatabase(pluginSchemas, OS_MANDATORY_SCHEMAS);
      await this.securityService.initializeState();

      aiAdapters.forEach(adapterClass => this.aiRegistry.registerAdapter(adapterClass));

      this.coreBus.useMiddleware(this.processMonitor);
      this.coreBus.useMiddleware(this.securityGuard);

      plugins.forEach(plugin => plugin.registerHandlers(this.coreBus));

      if (!this.securityService.isVaultUnlocked()) {
        console.warn('[Core Engine] System is running, but Vault is locked.');
      }

      this._isBooted.set(true);
      // Identity is guaranteed to be valid here because CoreDatabaseService instantiated successfully
      const id = this.appIdentity!;
      console.log(`[Core Engine] Framework booted securely for: ${id.developerId}/${id.appName}@${id.version}`);
    } catch (error) {
      console.error('[Core Engine] Boot Failure:', error);
      this._isBooted.set(false);
      throw error;
    }
  }
}