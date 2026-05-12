import { Injectable, signal, WritableSignal } from '@angular/core';
import { CryptoService } from './crypto.service';
import { VaultRepository } from '../database/repositories/vault-repository.repository';

/**
 * The Security Gatekeeper.
 * Manages the memory-resident master key and controls access to the framework.
 */
@Injectable({
  providedIn: 'root'
})
export class SecurityService {

  public readonly isVaultUnlocked: WritableSignal<boolean> = signal(false);
  private sessionMasterKey: CryptoKey | null = null;

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly vaultRepo: VaultRepository
  ) { }

  async setupVault(password: string): Promise<void> {
    const vault = await this.vaultRepo.getMasterVault();
    if (vault) throw new Error('[Security] Vault is already initialized.');

    const salt = this.cryptoService.generateSalt();
    const hashedPassword = await this.cryptoService.hashPassword(password, salt);

    await this.vaultRepo.create({ id: 1, salt, hashedPassword, vaultVersion: 1 });
    this.sessionMasterKey = await this.cryptoService.deriveMasterKey(password, salt);
    this.isVaultUnlocked.set(true);

    console.log('[Security] Vault securely initialized and unlocked.');
  }

  async unlockVault(password: string): Promise<boolean> {
    const vault = await this.vaultRepo.getMasterVault();
    if (!vault) throw new Error('[Security] No vault found. Setup required.');

    const loginHash = await this.cryptoService.hashPassword(password, vault.salt);
    if (loginHash !== vault.hashedPassword) {
      console.warn('[Security] Invalid master password attempt.');
      return false;
    }

    this.sessionMasterKey = await this.cryptoService.deriveMasterKey(password, vault.salt);
    this.isVaultUnlocked.set(true);

    console.log('[Security] Vault unlocked successfully.');
    return true;
  }

  lockVault(): void {
    this.sessionMasterKey = null;
    this.isVaultUnlocked.set(false);
    console.log('[Security] Vault locked and RAM purged.');
  }

  getSessionKey(): CryptoKey {
    if (!this.isVaultUnlocked() || !this.sessionMasterKey) {
      throw new Error('[Security] Cannot access session key: Vault is locked.');
    }
    return this.sessionMasterKey;
  }
}