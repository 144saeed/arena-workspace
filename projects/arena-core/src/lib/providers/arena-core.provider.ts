import { EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer, inject, Provider } from '@angular/core';

import { ARENA_APP_IDENTITY, CoreEngineService } from '../engine/core-engine.service';
import { IAppPlugin } from '../contracts/interfaces/app-plugin.interface';
import { AiAdapterConstructor } from '../contracts/interfaces/ai-adapter.interface';
import { AppIdentity } from '../contracts/interfaces/app-identity.interface';
import { SystemAiProfilePlugin } from '../system-plugins/ai-profile/system-ai-profile.plugin';

export interface ArenaCoreConfig {
    identity: AppIdentity;
    adapters?: AiAdapterConstructor[];
    plugins?: IAppPlugin[];
}

/**
 * Enterprise standard wiring function to bootstrap Arena Core.
 */
export function provideArenaCore(config: ArenaCoreConfig): EnvironmentProviders {
    const manualProviders: Provider[] = [];

    manualProviders.push({ provide: ARENA_APP_IDENTITY, useValue: config.identity });

    // Explicitly provide the system plugin so the DI container knows about it here
    manualProviders.push(SystemAiProfilePlugin);

    return makeEnvironmentProviders([
        ...manualProviders,
        provideAppInitializer(() => {
            const coreEngine = inject(CoreEngineService);
            const aiProfilePlugin = inject(SystemAiProfilePlugin);

            // Seamlessly inject built-in plugins alongside user plugins
            const allPlugins = [aiProfilePlugin, ...(config.plugins || [])];

            return coreEngine.boot(allPlugins, config.adapters || []);
        })
    ]);
}