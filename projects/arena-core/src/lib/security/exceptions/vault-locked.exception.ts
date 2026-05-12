export class VaultLockedException extends Error {
    constructor(actionName: string) {
        super(`[Security Guard] Access Denied. Cannot execute action '${actionName}' while the vault is locked.`);
        this.name = 'VaultLockedException';
        Object.setPrototypeOf(this, VaultLockedException.prototype);
    }
}