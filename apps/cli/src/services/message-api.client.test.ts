import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  MessageApiClient,
  MessagePoller,
  type Message,
} from './message-api.client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MessageApiClient', () => {
  let client: MessageApiClient;
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    client = new MessageApiClient(baseUrl);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new MessageApiClient('https://api.example.com/');
      expect(clientWithSlash['baseUrl']).toBe('https://api.example.com');
    });
  });

  describe('setApiKey / clearApiKey', () => {
    it('should set API key', () => {
      client.setApiKey('sker_test123456789012345678901234');
      expect(client['apiKey']).toBe('sker_test123456789012345678901234');
    });

    it('should clear API key', () => {
      client.setApiKey('sker_test123456789012345678901234');
      client.clearApiKey();
      expect(client['apiKey']).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      const mockMessage: Message = {
        id: 'msg-1',
        user_id: 'user-1',
        type: 'notification',
        title: 'Test',
        content: 'Test content',
        status: 'delivered',
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
        read_at: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockMessage }),
      });

      const result = await client.sendMessage({
        title: 'Test',
        content: 'Test content',
        type: 'notification',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/messages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Test',
            content: 'Test content',
            type: 'notification',
          }),
        })
      );
      expect(result).toEqual(mockMessage);
    });

    it('should include API key in Authorization header', async () => {
      client.setApiKey('sker_test123456789012345678901234');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await client.sendMessage({ title: 'Test', content: 'Test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sker_test123456789012345678901234',
          }),
        })
      );
    });
  });

  describe('getMessages', () => {
    it('should get messages with default options', async () => {
      const mockResult = {
        messages: [],
        total: 0,
        unreadCount: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResult }),
      });

      const result = await client.getMessages();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/messages',
        expect.any(Object)
      );
      expect(result).toEqual(mockResult);
    });

    it('should include query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { messages: [], total: 0, unreadCount: 0 } }),
      });

      await client.getMessages({
        status: 'unread',
        type: 'notification',
        limit: 10,
        offset: 5,
        unreadOnly: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/messages?status=unread&type=notification&limit=10&offset=5&unreadOnly=true',
        expect.any(Object)
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a message as read', async () => {
      const mockMessage: Message = {
        id: 'msg-1',
        user_id: 'user-1',
        type: 'notification',
        title: 'Test',
        content: 'Test',
        status: 'read',
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
        read_at: '2024-01-02T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockMessage }),
      });

      const result = await client.markAsRead('msg-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/messages/msg-1/read',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual(mockMessage);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { deleted: true } }),
      });

      await client.deleteMessage('msg-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/messages/msg-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('error handling', () => {
    it('should throw error on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      await expect(client.getMessage('msg-999')).rejects.toThrow('Not found');
    });

    it('should throw generic error if no error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      await expect(client.getMessage('msg-999')).rejects.toThrow('HTTP 404');
    });
  });

  describe('API Key management', () => {
    it('should list API keys', async () => {
      const mockKeys = [{ id: 'key-1', name: 'Test Key' }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { keys: mockKeys } }),
      });

      const result = await client.listApiKeys();

      expect(result.keys).toEqual(mockKeys);
    });

    it('should create API key', async () => {
      const mockResult = {
        id: 'key-1',
        name: 'New Key',
        key: 'sker_new123456789012345678901234',
        permissions: ['read', 'write'],
        warning: 'Store this key securely',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResult }),
      });

      const result = await client.createApiKey('New Key', ['read', 'write']);

      expect(result).toEqual(mockResult);
    });

    it('should delete API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { deleted: true } }),
      });

      await client.deleteApiKey('key-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/api-keys/key-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});

describe('MessagePoller', () => {
  let client: MessageApiClient;

  beforeEach(() => {
    client = new MessageApiClient('https://api.example.com');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create poller with correct options', () => {
    const onMessages = vi.fn();
    const onError = vi.fn();

    const poller = client.createPoller({
      interval: 5000,
      onMessages,
      onError,
    });

    expect(poller).toBeInstanceOf(MessagePoller);
    poller.stop();
  });

  it('should start and stop polling', () => {
    const poller = client.createPoller({ interval: 5000 });

    poller.start();
    expect(poller['isRunning']).toBe(true);

    poller.stop();
    expect(poller['isRunning']).toBe(false);
  });

  it('should not start if already running', () => {
    const poller = client.createPoller({ interval: 5000 });

    poller.start();
    poller.start(); // Second call should be ignored

    expect(poller['isRunning']).toBe(true);
    poller.stop();
  });

  it('should update interval with setInterval()', () => {
    const poller = client.createPoller({ interval: 5000 });
    expect(poller['interval']).toBe(5000);

    poller.setInterval(10000);
    expect(poller['interval']).toBe(10000);
    poller.stop();
  });

  it('should calculate backoff interval on failure', () => {
    const poller = client.createPoller({ interval: 1000 });

    // No failure, normal interval
    expect(poller['calculateNextInterval']()).toBe(1000);

    // Simulate failure
    poller['failureCount'] = 1;
    expect(poller['calculateNextInterval']()).toBe(2000);

    poller['failureCount'] = 2;
    expect(poller['calculateNextInterval']()).toBe(4000);

    // Should cap at 5 minutes
    poller['failureCount'] = 10;
    expect(poller['calculateNextInterval']()).toBe(5 * 60 * 1000);

    poller.stop();
  });
});
