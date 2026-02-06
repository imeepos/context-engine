import { LoggerLevel } from '@sker/core';

export type ApiLogLevel = 'error' | 'summary' | 'debug';

export function resolveApiLoggerLevel(raw: string | undefined | null): LoggerLevel {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === 'error') return LoggerLevel.error;
  if (value === 'debug') return LoggerLevel.debug;
  return LoggerLevel.info; // summary (default)
}

export function isDebugLevel(level: LoggerLevel): boolean {
  return level <= LoggerLevel.debug;
}
