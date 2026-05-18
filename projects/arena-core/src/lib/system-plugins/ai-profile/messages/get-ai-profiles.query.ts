import { IQuery } from '../../../contracts/interfaces/query.interface';

export interface SafeAiProfileDto {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
    selectedModel: string;
}

export class GetAiProfilesQuery implements IQuery<SafeAiProfileDto[]> {
    public readonly isQuery = true;
}