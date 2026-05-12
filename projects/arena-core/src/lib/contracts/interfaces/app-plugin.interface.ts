import { IDbSchema } from '../../database/types/db-schema.type';
import { CoreBus } from '../../mediator/core-bus.service';

/**
 * The standard contract for any Application (Plugin) running on the Framework.
 * Forces applications to provide their schemas and register their command/query handlers.
 */
export interface IAppPlugin {
    readonly appId: string;
    readonly requiredDbSchemas: IDbSchema[];

    /**
     * Called by the Core Engine during the boot sequence.
     * The app MUST register all its Handlers here.
     */
    registerHandlers(coreBus: CoreBus): void;
}