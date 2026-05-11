import { Injectable, signal, WritableSignal } from '@angular/core';
import { IAppPlugin } from '../contracts/interfaces/app-plugin.interface';
import { CoreDatabaseService } from '../database/core-database.service';
import { CoreBus } from '../mediator/core-bus.service';
import { SecurityService } from '../security/security.service';
import { ProcessMonitorMiddleware } from '../monitor/middlewares/process-monitor.middleware';
import { SecurityGuardMiddleware } from '../security/middlewares/security-guard.middleware';

/**
 * The Main Kernel of the Framework.
 * Orchestrates the full boot sequence: Database evolution, Security verification, 
 * Middleware mounting, and Plugin handler registration.
 */
@Injectable({
  providedIn: 'root'
})
export class CoreEngineService {

  public readonly isBooted: WritableSignal<boolean> = signal(false);

  constructor(
    private readonly databaseEngine: CoreDatabaseService,
    private readonly coreBus: CoreBus,
    private readonly securityService: SecurityService,
    private readonly securityGuard: SecurityGuardMiddleware,
    private readonly processMonitor: ProcessMonitorMiddleware
  ) { }

  /**
   * Bootstraps the OS with the provided applications.
   * @param plugins Applications (like LanguageApp or ResumeApp) to install.
   */
  async boot(plugins: IAppPlugin[]): Promise<void> {
    if (this.isBooted()) {
      console.warn('[Core Engine] System is already booted. Ignoring duplicate boot request.');
      return;
    }

    try {
      console.log('[Core Engine] Boot sequence started...');

      // PHASE 1: Database Initialization
      const pluginSchemas = plugins.flatMap(p => p.requiredDbSchemas);
      // We pass empty array for coreSchemas currently, as OS tables are hardcoded in repos
      await this.databaseEngine.initializeDatabase(pluginSchemas, []);
      console.log('[Core Engine] Phase 1: Database initialized.');

      // PHASE 2: Mount Global Middlewares on the Core Bus
      this.coreBus.useMiddleware(this.processMonitor);
      this.coreBus.useMiddleware(this.securityGuard);
      console.log('[Core Engine] Phase 2: System Monitor and Security Guard mounted.');

      // PHASE 3: Plugin Handler Registration
      plugins.forEach(plugin => {
        plugin.registerHandlers(this.coreBus);
        console.log(`[Core Engine] Registered handlers for plugin: ${plugin.appId}`);
      });
      console.log('[Core Engine] Phase 3: All plugin handlers mounted.');

      // PHASE 4: Security Status Check
      // Note: We don't block the boot if locked, we just log it. The SecurityGuard will block specific commands.
      if (!this.securityService.isVaultUnlocked()) {
        console.warn('[Core Engine] Phase 4: System is running, but Vault is LOCKED.');
      } else {
        console.log('[Core Engine] Phase 4: Security verified. Vault is unlocked.');
      }

      // PHASE 5: System Online
      this.isBooted.set(true);
      console.log('[Core Engine] Framework is fully operational.');

    } catch (error) {
      console.error('[Core Engine] Critical Boot Failure:', error);
      this.isBooted.set(false);
      throw error;
    }
  }
}