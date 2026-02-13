-- Migration: Create messages and api_keys tables
-- Version: 001
-- Date: 2026-02-13

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'notification',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    read_at TEXT
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- Create index for user_id and key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
