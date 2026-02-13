import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CredentialStorage } from './credential-storage';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  chmodSync: vi.fn(),
}));

describe('CredentialStorage', () => {
  let storage: CredentialStorage;
  const testBaseUrl = 'https://test.example.com';
  const mockStoragePath = path.join(os.homedir(), '.sker', 'credentials.json');

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new CredentialStorage(testBaseUrl);

    // Default mocks
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(
      JSON.stringify({ version: 1, credentials: {} })
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('saveCredentials', () => {
    it('should save and encrypt credentials', () => {
      const credentials = {
        email: 'test@example.com',
        password: 'secret123',
        apiKey: 'sker_test123456789012345678901234',
        baseUrl: testBaseUrl,
        lastLogin: '2024-01-01T00:00:00Z',
      };

      storage.saveCredentials('default', credentials);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockStoragePath,
        expect.any(String),
        'utf-8'
      );

      // Verify the password is encrypted (not plaintext)
      const writeCall = (fs.writeFileSync as any).mock.calls[0];
      const savedData = JSON.parse(writeCall[1]);
      expect(savedData.credentials.default.password).not.toBe('secret123');
      expect(savedData.credentials.default.email).toBe('test@example.com');
    });

    it('should create storage directory if not exists', () => {
      (fs.existsSync as any).mockReturnValue(false);

      const newStorage = new CredentialStorage(testBaseUrl);
      newStorage.saveCredentials('default', {
        email: 'test@example.com',
        password: 'secret',
        baseUrl: testBaseUrl,
        lastLogin: '2024-01-01T00:00:00Z',
      });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(os.homedir(), '.sker'),
        { recursive: true }
      );
    });

    it('should set file permissions to 600', () => {
      storage.saveCredentials('default', {
        email: 'test@example.com',
        password: 'secret',
        baseUrl: testBaseUrl,
        lastLogin: '2024-01-01T00:00:00Z',
      });

      expect(fs.chmodSync).toHaveBeenCalledWith(mockStoragePath, 0o600);
    });
  });

  describe('loadCredentials', () => {
    it('should load and decrypt credentials', () => {
      // First save to get encrypted values
      const credentials = {
        email: 'test@example.com',
        password: 'secret123',
        baseUrl: testBaseUrl,
        lastLogin: '2024-01-01T00:00:00Z',
      };

      // Create a real storage instance to encrypt
      const realStorage = new CredentialStorage(testBaseUrl);
      const encrypted = realStorage['encrypt']('secret123');

      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          version: 1,
          credentials: {
            default: {
              email: 'test@example.com',
              password: encrypted,
              baseUrl: testBaseUrl,
              lastLogin: '2024-01-01T00:00:00Z',
            },
          },
        })
      );

      const loaded = storage.loadCredentials('default');

      expect(loaded).not.toBeNull();
      expect(loaded!.email).toBe('test@example.com');
      expect(loaded!.password).toBe('secret123');
    });

    it('should return null if profile not found', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({ version: 1, credentials: {} })
      );

      const result = storage.loadCredentials('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on read error', () => {
      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = storage.loadCredentials('default');

      expect(result).toBeNull();
    });
  });

  describe('deleteCredentials', () => {
    it('should delete credentials for a profile', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          version: 1,
          credentials: {
            default: { email: 'test@example.com', password: 'encrypted' },
            other: { email: 'other@example.com', password: 'encrypted' },
          },
        })
      );

      const result = storage.deleteCredentials('default');

      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return false if profile not found', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({ version: 1, credentials: {} })
      );

      const result = storage.deleteCredentials('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('listProfiles', () => {
    it('should list all profiles', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          version: 1,
          credentials: {
            default: {},
            work: {},
            personal: {},
          },
        })
      );

      const profiles = storage.listProfiles();

      expect(profiles).toEqual(['default', 'work', 'personal']);
    });

    it('should return empty array if no profiles', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({ version: 1, credentials: {} })
      );

      const profiles = storage.listProfiles();

      expect(profiles).toEqual([]);
    });
  });

  describe('hasCredentials', () => {
    it('should return true if credentials exist', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          version: 1,
          credentials: { default: {} },
        })
      );

      expect(storage.hasCredentials('default')).toBe(true);
    });

    it('should return false if credentials do not exist', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({ version: 1, credentials: {} })
      );

      expect(storage.hasCredentials('default')).toBe(false);
    });
  });

  describe('updateApiKey', () => {
    it('should update API key for existing profile', () => {
      const realStorage = new CredentialStorage(testBaseUrl);
      const encryptedPassword = realStorage['encrypt']('secret');

      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          version: 1,
          credentials: {
            default: {
              email: 'test@example.com',
              password: encryptedPassword,
              baseUrl: testBaseUrl,
              lastLogin: '2024-01-01T00:00:00Z',
            },
          },
        })
      );

      storage.updateApiKey('default', 'sker_newkey123456789012345678901234');

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = (fs.writeFileSync as any).mock.calls[0];
      const savedData = JSON.parse(writeCall[1]);

      // API key should be encrypted, not plaintext
      expect(savedData.credentials.default.apiKey).not.toBe(
        'sker_newkey123456789012345678901234'
      );
    });

    it('should not update if profile does not exist', () => {
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({ version: 1, credentials: {} })
      );

      storage.updateApiKey('nonexistent', 'sker_key');

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('encryption', () => {
    it('should produce different ciphertext for same plaintext', () => {
      const realStorage = new CredentialStorage(testBaseUrl);
      const plaintext = 'my-secret-password';

      const encrypted1 = realStorage['encrypt'](plaintext);
      const encrypted2 = realStorage['encrypt'](plaintext);

      // Due to random IV, ciphertext should be different
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should be able to decrypt encrypted data', () => {
      const realStorage = new CredentialStorage(testBaseUrl);
      const plaintext = 'my-secret-password';

      const encrypted = realStorage['encrypt'](plaintext);
      const decrypted = realStorage['decrypt'](encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
