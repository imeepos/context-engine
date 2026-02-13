import { createLogger } from '@sker/core';

const logger = createLogger('MessageApiClient');

export type MessageType = 'notification' | 'task' | 'system' | 'chat';
export type MessageStatus = 'pending' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  user_id: string;
  type: MessageType;
  title: string;
  content: string;
  status: MessageStatus;
  metadata: string | null;
  created_at: string;
  read_at: string | null;
}

export interface GetMessagesOptions {
  status?: MessageStatus;
  type?: MessageType;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface MessagesResult {
  messages: Message[];
  total: number;
  unreadCount: number;
}

export interface SendMessageOptions {
  type?: MessageType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
  warning: string;
}

export interface MessagePollerOptions {
  interval?: number;
  onMessages?: (messages: Message[]) => void;
  onError?: (error: Error) => void;
}

export class MessageApiClient {
  private baseUrl: string;
  private apiKey: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Clear API key
   */
  clearApiKey(): void {
    this.apiKey = null;
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Send a message
   */
  async sendMessage(options: SendMessageOptions): Promise<Message> {
    return this.request<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Get messages
   */
  async getMessages(options: GetMessagesOptions = {}): Promise<MessagesResult> {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.type) params.set('type', options.type);
    if (options.limit) params.set('limit', String(options.limit));
    if (options.offset) params.set('offset', String(options.offset));
    if (options.unreadOnly) params.set('unreadOnly', 'true');

    const query = params.toString();
    return this.request<MessagesResult>(`/api/messages${query ? `?${query}` : ''}`);
  }

  /**
   * Get a single message
   */
  async getMessage(id: string): Promise<Message> {
    return this.request<Message>(`/api/messages/${id}`);
  }

  /**
   * Mark message as read
   */
  async markAsRead(id: string): Promise<Message> {
    return this.request<Message>(`/api/messages/${id}/read`, {
      method: 'POST',
    });
  }

  /**
   * Mark all messages as read
   */
  async markAllAsRead(): Promise<{ markedAsRead: number }> {
    return this.request<{ markedAsRead: number }>('/api/messages/read-all', {
      method: 'POST',
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(id: string): Promise<void> {
    await this.request(`/api/messages/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return this.request<{ unreadCount: number }>('/api/messages/unread-count');
  }

  /**
   * List API keys
   */
  async listApiKeys(): Promise<{ keys: ApiKeyInfo[] }> {
    return this.request<{ keys: ApiKeyInfo[] }>('/api/api-keys');
  }

  /**
   * Create API key
   */
  async createApiKey(
    name: string,
    permissions: string[],
    expiresAt?: string
  ): Promise<CreateApiKeyResult> {
    return this.request<CreateApiKeyResult>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, permissions, expiresAt }),
    });
  }

  /**
   * Delete API key
   */
  async deleteApiKey(id: string): Promise<void> {
    await this.request(`/api/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Create a message poller
   */
  createPoller(options: MessagePollerOptions = {}): MessagePoller {
    return new MessagePoller(this, options);
  }
}

/**
 * Message poller for continuous message fetching
 */
export class MessagePoller {
  private client: MessageApiClient;
  private interval: number;
  private onMessages?: (messages: Message[]) => void;
  private onError?: (error: Error) => void;
  private timerId: NodeJS.Timeout | null = null;
  private lastCheckTime: string | null = null;
  private isRunning = false;
  private failureCount = 0;

  constructor(client: MessageApiClient, options: MessagePollerOptions = {}) {
    this.client = client;
    this.interval = options.interval ?? 10000; // Default 10 seconds
    this.onMessages = options.onMessages;
    this.onError = options.onError;
  }

  /**
   * Start polling
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Poller is already running');
      return;
    }

    this.isRunning = true;
    this.failureCount = 0;
    this.poll();
    logger.info(`Message poller started with interval ${this.interval}ms`);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    logger.info('Message poller stopped');
  }

  /**
   * Perform poll
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const result = await this.client.getMessages({
        unreadOnly: true,
        limit: 50,
      });

      // Filter messages newer than last check
      let newMessages = result.messages;
      if (this.lastCheckTime) {
        newMessages = result.messages.filter(
          (m) => m.created_at > this.lastCheckTime!
        );
      }

      this.lastCheckTime = new Date().toISOString();
      this.failureCount = 0;

      if (newMessages.length > 0 && this.onMessages) {
        this.onMessages(newMessages);
      }
    } catch (error) {
      this.failureCount++;
      logger.error(`Poll failed (attempt ${this.failureCount}):`, error);

      if (this.onError) {
        this.onError(error as Error);
      }
    }

    // Schedule next poll with exponential backoff on failures
    const nextInterval = this.calculateNextInterval();
    this.timerId = setTimeout(() => this.poll(), nextInterval);
  }

  /**
   * Calculate next poll interval with exponential backoff
   */
  private calculateNextInterval(): number {
    if (this.failureCount === 0) {
      return this.interval;
    }

    // Exponential backoff: interval * 2^failureCount, max 5 minutes
    const backoff = Math.min(
      this.interval * Math.pow(2, this.failureCount),
      5 * 60 * 1000
    );
    return backoff;
  }

  /**
   * Update poll interval
   */
  setInterval(interval: number): void {
    this.interval = interval;
  }
}
