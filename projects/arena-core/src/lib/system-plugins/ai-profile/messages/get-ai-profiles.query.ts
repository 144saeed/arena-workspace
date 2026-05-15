import { IQuery } from '../../../contracts/interfaces/query.interface';

export interface SafeAiProfileDto {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
}

export class GetAiProfilesQuery implements IQuery<SafeAiProfileDto[]> {
    public readonly isQuery = true;
}