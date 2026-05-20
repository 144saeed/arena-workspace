import { FrameworkError } from '../../exceptions/framework-error.exception';

export class VaultLockedException extends FrameworkError {
    constructor(actionName: string) {
        super(
            'VAULT_LOCKED',
            `[Security Guard] Access Denied. Cannot execute action '${actionName}' while the vault is locked.`,
            false
        );
        this.name = 'VaultLockedException';
        Object.setPrototypeOf(this, VaultLockedException.prototype);
    }
}