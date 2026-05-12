import { Injectable } from '@angular/core';

/**
 * The Cryptographic Engine of the OS.
 * Implements AES-256-GCM for encryption and PBKDF2 for key derivation AND hashing.
 * Operates purely on the browser's native Web Crypto API.
 */
@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  private readonly ITERATIONS = 100000;
  private readonly ENCRYPTION_ALGO = 'AES-GCM';

  generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return this.bufferToHex(salt.buffer);
  }

  async hashPassword(password: string, saltHex: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const saltBuffer = this.hexToBuffer(saltHex);

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return this.bufferToHex(hashBuffer);
  }

  async deriveMasterKey(password: string, saltHex: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const saltBuffer = this.hexToBuffer(saltHex);

    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuffer, iterations: this.ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: this.ENCRYPTION_ALGO, length: 256 },
      false, // Key becomes non-extractable (stays strictly in RAM)
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(plaintext: string, key: CryptoKey): Promise<{ cipherTextHex: string; ivHex: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(plaintext);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: this.ENCRYPTION_ALGO, iv: iv },
      key,
      encodedText
    );

    return {
      cipherTextHex: this.bufferToHex(cipherBuffer),
      ivHex: this.bufferToHex(iv.buffer)
    };
  }

  async decrypt(cipherTextHex: string, ivHex: string, key: CryptoKey): Promise<string> {
    const cipherBuffer = this.hexToBuffer(cipherTextHex);
    const ivBuffer = this.hexToBuffer(ivHex);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: this.ENCRYPTION_ALGO, iv: ivBuffer },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private hexToBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
  }
}