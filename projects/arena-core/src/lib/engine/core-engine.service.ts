import { Injectable, signal } from '@angular/core';
import { IAppPlugin } from '../contracts/interfaces/app-plugin.interface';
import { AiAdapterConstructor } from '../contracts/interfaces/ai-adapter.interface';
import { CoreDatabaseService } from '../database/core-database.service';
import { CoreBus } from '../mediator/core-bus.service';
import { SecurityService } from '../security/security.service';
import { ProcessMonitorMiddleware } from '../monitor/middlewares/process-monitor.middleware';
import { SecurityGuardMiddleware } from '../security/middlewares/security-guard.middleware';
import { AiRegistryService } from '../ai/ai-registry.service';
import { OS_MANDATORY_SCHEMAS } from '../database/constants/os-schemas.constant';

/**
 * The Main Kernel of the Framework.
 * Orchestrates the full boot sequence: Database evolution, Security verification, 
 * Middleware mounting, Plugin handler registration, and AI Factory setup.
 */
@Injectable({
  providedIn: 'root'
})
export class CoreEngineService {

  // SECURITY FIX: Encapsulate boot state
  private readonly _isBooted = signal<boolean>(false);
  public readonly isBooted = this._isBooted.asReadonly();

  constructor(
    private readonly databaseEngine: CoreDatabaseService,
    private readonly coreBus: CoreBus,
    private readonly securityService: SecurityService,
    private readonly securityGuard: SecurityGuardMiddleware,
    private readonly processMonitor: ProcessMonitorMiddleware,
    private readonly aiRegistry: AiRegistryService
  ) { }

  async boot(plugins: IAppPlugin[], aiAdapters: AiAdapterConstructor[] = []): Promise<void> {
    if (this.isBooted()) {
      console.warn('[Core Engine] System is already booted. Ignoring duplicate boot request.');
      return;
    }

    try {
      console.log('[Core Engine] Boot sequence started...');

      const pluginSchemas = plugins.flatMap(p => p.requiredDbSchemas);
      await this.databaseEngine.initializeDatabase(pluginSchemas, OS_MANDATORY_SCHEMAS);
      console.log('[Core Engine] Phase 1: Database initialized with core and plugin schemas.');

      aiAdapters.forEach(adapterClass => {
        this.aiRegistry.registerAdapter(adapterClass);
      });
      console.log(`[Core Engine] Phase 2: Registered ${aiAdapters.length} AI Adapters.`);

      this.coreBus.useMiddleware(this.processMonitor);
      this.coreBus.useMiddleware(this.securityGuard);
      console.log('[Core Engine] Phase 3: System Monitor and Security Guard mounted.');

      plugins.forEach(plugin => {
        plugin.registerHandlers(this.coreBus);
        console.log(`[Core Engine] Registered handlers for plugin: ${plugin.appId}`);
      });
      console.log('[Core Engine] Phase 4: All plugin handlers mounted.');

      if (!this.securityService.isVaultUnlocked()) {
        console.warn('[Core Engine] Phase 5: System is running, but Vault is LOCKED.');
      } else {
        console.log('[Core Engine] Phase 5: Security verified. Vault is unlocked.');
      }

      this._isBooted.set(true);
      console.log('[Core Engine] Framework is fully operational.');

    } catch (error) {
      console.error('[Core Engine] Critical Boot Failure:', error);
      this._isBooted.set(false);
      throw error;
    }
  }
}