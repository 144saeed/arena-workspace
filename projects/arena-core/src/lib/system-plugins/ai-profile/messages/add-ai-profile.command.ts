import { ICommand } from '../../../contracts/interfaces/command.interface';

export class AddAiProfileCommand implements ICommand {
    public readonly isCommand = true;

    constructor(
        public readonly name: string,
        public readonly provider: string,
        public readonly rawApiKey: string,
        public readonly selectedModel: string
    ) { }
}