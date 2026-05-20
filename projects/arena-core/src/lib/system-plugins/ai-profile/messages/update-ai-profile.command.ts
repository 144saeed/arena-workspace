import { ICommand } from '../../../contracts/interfaces/command.interface';

export class UpdateAiProfileCommand implements ICommand {
    public readonly isCommand = true;

    constructor(
        public readonly id: string,
        public readonly name?: string,
        public readonly selectedModel?: string,
        public readonly rawApiKey?: string
    ) { }
}