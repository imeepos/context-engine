import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { createLogger } from '@sker/core';

const logger = createLogger('CredentialStorage');

interface StoredCredential {
  email: string;
  password: string;
  apiKey?: string;
  baseUrl: string;
  lastLogin: string;
}

interface CredentialStorageData {
  version: number;
  credentials: Record<string, StoredCredential>;
}

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class CredentialStorage {
  private storagePath: string;
  private encryptionKey: Buffer;

  constructor(baseUrl: string) {
    // Store credentials in ~/.sker/credentials.json
    const skerDir = path.join(os.homedir(), '.sker');
    if (!fs.existsSync(skerDir)) {
      fs.mkdirSync(skerDir, { recursive: true });
    }
    this.storagePath = path.join(skerDir, 'credentials.json');

    // Generate encryption key from machine ID
    this.encryptionKey = this.deriveKey(baseUrl);
  }

  /**
   * Derive encryption key from base URL
   */
  private deriveKey(baseUrl: string): Buffer {
    const hash = crypto.createHash('sha256');
    hash.update(baseUrl + 'sker-credential-key');
    return hash.digest().slice(0, KEY_LENGTH);
  }

  /**
   * Encrypt data
   */
  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt data
   */
  private decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Read storage file
   */
  private readStorage(): CredentialStorageData {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return { version: 1, credentials: {} };
      }
      const data = fs.readFileSync(this.storagePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.warn('Failed to read credential storage, creating new one');
      return { version: 1, credentials: {} };
    }
  }

  /**
   * Write storage file
   */
  private writeStorage(data: CredentialStorageData): void {
    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
    // Set file permissions to 600 (owner only)
    fs.chmodSync(this.storagePath, 0o600);
  }

  /**
   * Save credentials for a profile
   */
  saveCredentials(profile: string, credentials: StoredCredential): void {
    const storage = this.readStorage();

    // Encrypt sensitive fields
    storage.credentials[profile] = {
      ...credentials,
      password: this.encrypt(credentials.password),
      apiKey: credentials.apiKey ? this.encrypt(credentials.apiKey) : undefined,
    };

    this.writeStorage(storage);
    logger.info(`Credentials saved for profile: ${profile}`);
  }

  /**
   * Load credentials for a profile
   */
  loadCredentials(profile: string): StoredCredential | null {
    const storage = this.readStorage();
    const encrypted = storage.credentials[profile];

    if (!encrypted) {
      return null;
    }

    try {
      return {
        ...encrypted,
        password: this.decrypt(encrypted.password),
        apiKey: encrypted.apiKey ? this.decrypt(encrypted.apiKey) : undefined,
      };
    } catch (error) {
      logger.error('Failed to decrypt credentials:', error);
      return null;
    }
  }

  /**
   * Delete credentials for a profile
   */
  deleteCredentials(profile: string): boolean {
    const storage = this.readStorage();
    if (storage.credentials[profile]) {
      delete storage.credentials[profile];
      this.writeStorage(storage);
      logger.info(`Credentials deleted for profile: ${profile}`);
      return true;
    }
    return false;
  }

  /**
   * List all profiles
   */
  listProfiles(): string[] {
    const storage = this.readStorage();
    return Object.keys(storage.credentials);
  }

  /**
   * Check if credentials exist for a profile
   */
  hasCredentials(profile: string): boolean {
    const storage = this.readStorage();
    return profile in storage.credentials;
  }

  /**
   * Update API key for a profile
   */
  updateApiKey(profile: string, apiKey: string): void {
    const storage = this.readStorage();
    if (storage.credentials[profile]) {
      storage.credentials[profile].apiKey = this.encrypt(apiKey);
      this.writeStorage(storage);
    }
  }
}
