import { ICommand } from '../../../contracts/interfaces/command.interface';

export class SetActiveProfileCommand implements ICommand {
    public readonly isCommand = true;

    constructor(public readonly id: string) { }
}