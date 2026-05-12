import { Injectable, signal } from '@angular/core';
import { CryptoService } from './crypto.service';
import { VaultRepository } from '../database/repositories/vault-repository.repository';
import { FrameworkError } from '../exceptions/framework-error.exception';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {

  private readonly _isVaultUnlocked = signal<boolean>(false);
  public readonly isVaultUnlocked = this._isVaultUnlocked.asReadonly();

  private sessionMasterKey: CryptoKey | null = null;

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly vaultRepo: VaultRepository
  ) { }

  async setupVault(password: string): Promise<void> {
    const vault = await this.vaultRepo.getMasterVault();
    if (vault) throw new FrameworkError('VAULT_EXISTS', '[Security] Vault is already initialized.', false);

    // SECURITY FIX: Require at least 8 characters, combining letters and numbers
    const complexRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!password || !complexRegex.test(password)) {
      throw new FrameworkError('WEAK_PASSWORD', `Master password must be at least 8 characters long and contain both letters and numbers.`, false);
    }

    const salt = this.cryptoService.generateSalt();
    const hashedPassword = await this.cryptoService.hashPassword(password, salt);

    await this.vaultRepo.create({
      id: 1, salt, hashedPassword, vaultVersion: 1, failedAttempts: 0, lastFailedAttempt: 0
    });
    this.sessionMasterKey = await this.cryptoService.deriveMasterKey(password, salt);
    this._isVaultUnlocked.set(true);

    console.log('[Security] Vault securely initialized and unlocked.');
  }

  async unlockVault(password: string): Promise<boolean> {
    const vault = await this.vaultRepo.getMasterVault();
    if (!vault) throw new FrameworkError('VAULT_MISSING', '[Security] No vault found. Setup required.', false);

    const loginHash = await this.cryptoService.hashPassword(password, vault.salt);

    if (!this.cryptoService.constantTimeCompare(loginHash, vault.hashedPassword)) {
      // SECURITY FIX: Persisted anti-brute-force mechanism
      const currentAttempts = (vault.failedAttempts || 0) + 1;
      await this.vaultRepo.update(1, { failedAttempts: currentAttempts, lastFailedAttempt: Date.now() });

      const delayMs = Math.min(Math.pow(2, currentAttempts) * 100, 5000); // Max 5 seconds delay
      console.warn(`[Security] Invalid master password attempt. Throttling for ${delayMs}ms.`);
      await new Promise(r => setTimeout(r, delayMs));
      return false;
    }

    // Reset counter on success
    if (vault.failedAttempts && vault.failedAttempts > 0) {
      await this.vaultRepo.update(1, { failedAttempts: 0, lastFailedAttempt: 0 });
    }

    this.sessionMasterKey = await this.cryptoService.deriveMasterKey(password, vault.salt);
    this._isVaultUnlocked.set(true);

    console.log('[Security] Vault unlocked successfully.');
    return true;
  }

  lockVault(): void {
    this.sessionMasterKey = null;
    this._isVaultUnlocked.set(false);
    console.log('[Security] Vault locked and RAM purged.');
  }

  getSessionKey(): CryptoKey {
    if (!this.isVaultUnlocked() || !this.sessionMasterKey) {
      throw new FrameworkError('VAULT_LOCKED', '[Security] Cannot access session key: Vault is locked.', false);
    }
    return this.sessionMasterKey;
  }
}