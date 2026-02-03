import { Context } from 'hono';
import { SyncService } from '../services/git';
import { GitService } from '../services/git.service';

export async function connectRepository(c: Context) {
  const injector = c.get('injector');
  const gitService = injector.get(GitService);

  const body = await c.req.json();
  const connection = await gitService.connectRepository(body);

  return c.json({ success: true, data: connection });
}

export async function syncRepository(c: Context) {
  const injector = c.get('injector');
  const syncService = injector.get(SyncService);

  const connectionId = c.req.param('connectionId');
  await syncService.syncRepository(connectionId);

  return c.json({ success: true, message: 'Sync started' });
}

export async function getSyncStatus(c: Context) {
  const injector = c.get('injector');
  const syncService = injector.get(SyncService);

  const connectionId = c.req.param('connectionId');
  const tasks = await syncService.getSyncStatus(connectionId);

  return c.json({ success: true, data: tasks });
}

export async function handleWebhook(c: Context) {
  const providerId = c.req.param('providerId');
  const payload = await c.req.json();
  const signature = c.req.header('x-hub-signature-256');

  // TODO: Verify webhook signature
  // TODO: Process webhook event

  return c.json({ status: 'ok' });
}

export async function getConnections(c: Context) {
  const injector = c.get('injector');
  const gitService = injector.get(GitService);

  const repositoryId = c.req.param('repositoryId');
  const connections = await gitService.getConnections(repositoryId);

  return c.json({ success: true, data: connections });
}
