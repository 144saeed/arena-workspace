import { Injectable } from '@angular/core';
import { IMiddleware } from '../../contracts/interfaces/middleware.interface';
import { IMessage } from '../../contracts/interfaces/message.interface';
import { SecurityService } from '../security.service';
import { VaultLockedException } from '../exceptions/vault-locked.exception';

/**
 * Global Security Middleware for the Core Bus.
 * Ensures the OS Vault is unlocked before allowing business logic to proceed.
 */
@Injectable({
  providedIn: 'root'
})
export class SecurityGuardMiddleware implements IMiddleware {

  constructor(private readonly securityService: SecurityService) { }

  async handle<TResult>(message: IMessage, next: () => Promise<TResult>): Promise<TResult> {
    if (!this.securityService.isVaultUnlocked()) {
      const actionName = message.constructor.name;
      console.error(`[Security Guard] Blocked unauthorized attempt to execute: ${actionName}`);
      throw new VaultLockedException(actionName);
    }
    return await next();
  }
}