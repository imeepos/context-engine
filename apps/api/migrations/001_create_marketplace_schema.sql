-- Migration: Create Marketplace Schema
-- Description: Adds plugin marketplace tables
-- Date: 2026-02-06

CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  author_id TEXT NOT NULL,
  tags TEXT,
  category TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plugins_author ON plugins(author_id);
CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);
CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);

CREATE TABLE IF NOT EXISTS plugin_versions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  version TEXT NOT NULL,
  source_code TEXT NOT NULL,
  schema TEXT,
  changelog TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
  UNIQUE (plugin_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin ON plugin_versions(plugin_id);

CREATE TABLE IF NOT EXISTS plugin_installs (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  installed_version TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE (plugin_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_installs_user ON plugin_installs(user_id);

CREATE TABLE IF NOT EXISTS plugin_reviews (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  feedback TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE (plugin_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_reviews_plugin ON plugin_reviews(plugin_id);
