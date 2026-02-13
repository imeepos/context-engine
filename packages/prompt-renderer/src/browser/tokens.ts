import { InjectionToken } from "@sker/core";
import type { Browser } from "./browser";

export const BROWSER = new InjectionToken<Browser>('BROWSER');

/**
 * 渲染快照处理器接口
 * 渲染成功后将 prompt 持久化存储
 */
export interface RenderSnapshotHandler {
  saveSnapshot(url: string, prompt: string): Promise<void>;
}

export const RENDER_SNAPSHOT_HANDLER = new InjectionToken<RenderSnapshotHandler>('RENDER_SNAPSHOT_HANDLER');