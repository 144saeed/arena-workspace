import { Injectable } from '@angular/core';
import { IAppPlugin } from '../../contracts/interfaces/app-plugin.interface';
import { IDbSchema } from '../../database/types/db-schema.type';
import { CoreBus } from '../../mediator/core-bus.service';

import { AddAiProfileCommand } from './messages/add-ai-profile.command';
import { DeleteAiProfileCommand } from './messages/delete-ai-profile.command';
import { GetAiProfilesQuery } from './messages/get-ai-profiles.query';
import { GetProviderModelsQuery } from './messages/get-provider-models.query';
import { AddAiProfileHandler, DeleteAiProfileHandler, GetAiProfilesHandler, GetProviderModelsHandler } from './handlers/ai-profile-handler.service';

@Injectable({
    providedIn: 'root'
})
export class SystemAiProfilePlugin implements IAppPlugin {
    public readonly appId = 'system-ai-profile';
    public readonly name = 'SystemAiProfilePlugin';
    public readonly version = '1.0.0';

    public get requiredDbSchemas(): IDbSchema[] {
        // os_ai_profiles is natively managed by OS_MANDATORY_SCHEMAS
        return [];
    }

    public registerHandlers(bus: CoreBus): void {
        bus.registerHandler(AddAiProfileCommand, AddAiProfileHandler);
        bus.registerHandler(DeleteAiProfileCommand, DeleteAiProfileHandler);
        bus.registerHandler(GetAiProfilesQuery, GetAiProfilesHandler);
        bus.registerHandler(GetProviderModelsQuery, GetProviderModelsHandler);
    }
}