import { IQuery } from '../../../contracts/interfaces/query.interface';

export class GetProviderModelsQuery implements IQuery<string[]> {
    public readonly isQuery = true;

    constructor(
        public readonly providerId: string,
        public readonly rawApiKey: string
    ) { }
}