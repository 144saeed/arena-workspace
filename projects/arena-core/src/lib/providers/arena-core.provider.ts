import { EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer, inject, Provider } from '@angular/core';

import { ARENA_APP_NAME, CoreEngineService } from '../engine/core-engine.service';
import { IAppPlugin } from '../contracts/interfaces/app-plugin.interface';
import { AiAdapterConstructor } from '../contracts/interfaces/ai-adapter.interface';

export interface ArenaCoreConfig {
    appName?: string;
    adapters?: AiAdapterConstructor[];
    plugins?: IAppPlugin[];
}

/**
 * Enterprise standard wiring function to bootstrap Arena Core.
 */
export function provideArenaCore(config: ArenaCoreConfig = {}): EnvironmentProviders {
    // We use an array for standard Providers (Tokens/Classes)
    const manualProviders: Provider[] = [];

    if (config.appName) {
        manualProviders.push({ provide: ARENA_APP_NAME, useValue: config.appName });
    }

    return makeEnvironmentProviders([
        // First, we spread the standard providers
        ...manualProviders,
        // Then we add the App Initializer (which returns EnvironmentProviders)
        provideAppInitializer(() => {
            const coreEngine = inject(CoreEngineService);
            return coreEngine.boot(config.plugins || [], config.adapters || []);
        })
    ]);
}