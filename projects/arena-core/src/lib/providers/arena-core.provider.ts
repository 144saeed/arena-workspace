import { EnvironmentProviders, makeEnvironmentProviders, provideAppInitializer, inject, Provider } from '@angular/core';

import { ARENA_APP_IDENTITY, CoreEngineService } from '../engine/core-engine.service';
import { IAppPlugin } from '../contracts/interfaces/app-plugin.interface';
import { AiAdapterConstructor } from '../contracts/interfaces/ai-adapter.interface';
import { AppIdentity } from '../contracts/interfaces/app-identity.interface';

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

    return makeEnvironmentProviders([
        ...manualProviders,
        provideAppInitializer(() => {
            const coreEngine = inject(CoreEngineService);
            return coreEngine.boot(config.plugins || [], config.adapters || []);
        })
    ]);
}