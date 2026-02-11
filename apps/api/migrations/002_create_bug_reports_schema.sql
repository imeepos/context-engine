-- Migration: Create Bug Reports Schema
-- Description: Adds bug_reports table for AI-discovered bugs
-- Date: 2026-02-11

CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT NOT NULL DEFAULT 'manual',
  reporter_id TEXT,
  ai_context TEXT,
  stack_trace TEXT,
  environment TEXT,
  tags TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (reporter_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_source ON bug_reports(source);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter ON bug_reports(reporter_id);
