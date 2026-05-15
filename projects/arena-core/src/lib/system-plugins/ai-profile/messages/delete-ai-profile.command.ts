import { ICommand } from '../../../contracts/interfaces/command.interface';

export class DeleteAiProfileCommand implements ICommand {
    public readonly isCommand = true;

    // Profile IDs in AiProfileEntity are UUID strings, not numbers.
    constructor(public readonly id: string) { }
}