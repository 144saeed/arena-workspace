import { Injectable, signal } from '@angular/core';
import { CryptoService } from './crypto.service';
import { VaultRepository } from '../database/repositories/vault-repository.repository';
import { AiProfileRepository } from '../database/repositories/ai-profile-repository.repository';
import { CoreDatabaseService } from '../database/core-database.service';
import { FrameworkError } from '../exceptions/framework-error.exception';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {

  private readonly _isVaultUnlocked = signal<boolean>(false);
  public readonly isVaultUnlocked = this._isVaultUnlocked.asReadonly();

  private readonly _isVaultConfigured = signal<boolean>(false);
  public readonly isVaultConfigured = this._isVaultConfigured.asReadonly();

  private sessionMasterKey: CryptoKey | null = null;
  private isUnlocking = false;

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly vaultRepo: VaultRepository,
    private readonly aiProfileRepo: AiProfileRepository,
    private readonly dbEngine: CoreDatabaseService
  ) { }

  /**
   * Initializes the vault configuration state.
   * Called by the CoreEngine during the boot sequence.
   */
  async initializeState(): Promise<void> {
    const vault = await this.vaultRepo.getMasterVault();
    this._isVaultConfigured.set(!!vault);
  }

  async setupVault(password: string): Promise<void> {
    let vault;
    try {
      vault = await this.vaultRepo.getMasterVault();
    } catch (e) {
      throw new FrameworkError('NOT_BOOTED', 'Cannot access vault. Ensure CoreEngine is booted first.', false);
    }
    if (vault) throw new FrameworkError('VAULT_EXISTS', 'Vault is already initialized.', false);

    const complexRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!password || !complexRegex.test(password)) {
      throw new FrameworkError('WEAK_PASSWORD', 'Master password must be at least 8 characters long and contain both letters and numbers.', false);
    }

    const loginSalt = this.cryptoService.generateSalt();
    const encryptionSalt = this.cryptoService.generateSalt();

    const hashedPassword = await this.cryptoService.hashPassword(password, loginSalt);

    await this.vaultRepo.create({
      id: 1,
      loginSalt,
      encryptionSalt,
      hashedPassword,
      vaultVersion: 1,
      failedAttempts: 0,
      lastFailedAttempt: 0
    });

    this.sessionMasterKey = await this.cryptoService.deriveMasterKey(password, encryptionSalt);
    this._isVaultUnlocked.set(true);
    this._isVaultConfigured.set(true);
  }

  async unlockVault(password: string): Promise<boolean> {
    if (this.isUnlocking) {
      return false;
    }

    this.isUnlocking = true;

    try {
      const vault = await this.vaultRepo.getMasterVault();
      if (!vault) throw new FrameworkError('VAULT_MISSING', 'No vault found. Setup required.', false);

      const loginHash = await this.cryptoService.hashPassword(password, vault.loginSalt);

      if (!this.cryptoService.constantTimeCompare(loginHash, vault.hashedPassword)) {
        const currentAttempts = (vault.failedAttempts || 0) + 1;
        await this.vaultRepo.update(1, { failedAttempts: currentAttempts, lastFailedAttempt: Date.now() });

        const delayMs = Math.min(Math.pow(2, currentAttempts) * 100, 5000);
        await new Promise(r => setTimeout(r, delayMs));
        return false;
      }

      if (vault.failedAttempts && vault.failedAttempts > 0) {
        await this.vaultRepo.update(1, { failedAttempts: 0, lastFailedAttempt: 0 });
      }

      this.sessionMasterKey = await this.cryptoService.deriveMasterKey(password, vault.encryptionSalt);
      this._isVaultUnlocked.set(true);

      return true;
    } finally {
      this.isUnlocking = false;
    }
  }

  lockVault(): void {
    this.sessionMasterKey = null;
    this._isVaultUnlocked.set(false);
  }

  /**
   * Cryptographically shreds the vault and all dead AI profiles.
   * Executed within an ACID transaction to prevent orphaned data.
   */
  async destroyVault(): Promise<void> {
    await this.dbEngine.transaction('rw', 'os_vault', 'os_ai_profiles', async () => {
      // 1. Destroy the master lock
      await this.vaultRepo.delete(1);

      // 2. Shred all orphaned profiles
      const profiles = await this.aiProfileRepo.getAll();
      for (const profile of profiles) {
        await this.aiProfileRepo.delete(profile.profileId);
      }
    });

    // 3. Reset runtime state after successful transaction
    this.sessionMasterKey = null;
    this._isVaultUnlocked.set(false);
    this._isVaultConfigured.set(false);

    console.warn('[Security Service] Vault and all associated profiles have been cryptographically shredded.');
  }

  getSessionKey(): CryptoKey {
    if (!this.isVaultUnlocked() || !this.sessionMasterKey) {
      throw new FrameworkError('VAULT_LOCKED', 'Cannot access session key: Vault is locked.', false);
    }
    return this.sessionMasterKey;
  }
}