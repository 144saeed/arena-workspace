import { IQuery } from '../../../contracts/interfaces/query.interface';
import { AiCapabilitiesDto } from '../../../contracts/dtos/ai-capabilities.dto';

export class GetActiveProfileCapabilitiesQuery implements IQuery<AiCapabilitiesDto | undefined> {
    public readonly isQuery = true;
}