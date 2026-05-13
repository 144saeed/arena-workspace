import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  private readonly ITERATIONS = 600000;
  private readonly SALT_SIZE_BYTES = 32;
  private readonly ENCRYPTION_ALGO = 'AES-GCM';

  generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_SIZE_BYTES));
    return this.bufferToHex(salt.buffer);
  }

  constantTimeCompare(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const arrA = encoder.encode(a);
    const arrB = encoder.encode(b);

    const maxLength = Math.max(arrA.length, arrB.length);
    let mismatch = arrA.length ^ arrB.length;

    for (let i = 0; i < maxLength; i++) {
      const byteA = i < arrA.length ? arrA[i] : 0;
      const byteB = i < arrB.length ? arrB[i] : 0;
      mismatch |= byteA ^ byteB;
    }

    return mismatch === 0;
  }

  async hashPassword(password: string, saltHex: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const saltBuffer = this.hexToBuffer(saltHex);
    const hashBuffer = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBuffer, iterations: this.ITERATIONS, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return this.bufferToHex(hashBuffer);
  }

  async deriveMasterKey(password: string, saltHex: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
    );
    const saltBuffer = this.hexToBuffer(saltHex);
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBuffer, iterations: this.ITERATIONS, hash: 'SHA-256' },
      keyMaterial, { name: this.ENCRYPTION_ALGO, length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  async encrypt(plaintext: string, key: CryptoKey): Promise<{ cipherTextHex: string; ivHex: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(plaintext);
    const cipherBuffer = await crypto.subtle.encrypt({ name: this.ENCRYPTION_ALGO, iv: iv }, key, encodedText);
    return { cipherTextHex: this.bufferToHex(cipherBuffer), ivHex: this.bufferToHex(iv.buffer) };
  }

  async decrypt(cipherTextHex: string, ivHex: string, key: CryptoKey): Promise<string> {
    const cipherBuffer = this.hexToBuffer(cipherTextHex);
    const ivBuffer = this.hexToBuffer(ivHex);
    const decryptedBuffer = await crypto.subtle.decrypt({ name: this.ENCRYPTION_ALGO, iv: ivBuffer }, key, cipherBuffer);
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