import { IQuery } from '../../../contracts/interfaces/query.interface';

export class GetModelsByProfileIdQuery implements IQuery<string[]> {
    public readonly isQuery = true;

    constructor(public readonly profileId: string) { }
}