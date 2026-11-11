import { sanitizeAppData } from './migrate';
import type { AppData } from './schema';

export interface ExportFile {
  app: 'binocular-play';
  formatVersion: 1;
  exportedAt: string;
  data: AppData;
}

export function exportData(data: AppData, now: Date = new Date()): string {
  const file: ExportFile = {
    app: 'binocular-play',
    formatVersion: 1,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

export type ImportResult =
  | { ok: true; data: AppData; added: number; replaced: number; fromOtherDevice: boolean }
  | { ok: false; error: string };

/**
 * Merges an export file into the current data by profile id: a profile with the same id
 * is replaced, others are added. Calibration belongs to a screen, so profiles that come
 * from another device are marked "check colours on this screen".
 */
export function importData(current: AppData, text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  const file = parsed as Partial<ExportFile> | null;
  if (!file || typeof file !== 'object' || file.app !== 'binocular-play' || !file.data) {
    return { ok: false, error: 'That file was not exported from Binocular Play.' };
  }
  if (file.formatVersion !== 1) {
    return { ok: false, error: 'That file comes from a newer version of Binocular Play.' };
  }
  const incoming = sanitizeAppData(file.data);
  if (incoming.profiles.length === 0) {
    return { ok: false, error: 'That file has no players in it.' };
  }
  const rawDevice = (file.data as { deviceId?: unknown }).deviceId;
  const fromOtherDevice = rawDevice !== current.deviceId;

  const merged: AppData = JSON.parse(JSON.stringify(current)) as AppData;
  let added = 0;
  let replaced = 0;
  for (const p of incoming.profiles) {
    if (fromOtherDevice) p.calibration.needsCheck = true;
    const i = merged.profiles.findIndex((x) => x.id === p.id);
    if (i >= 0) {
      merged.profiles[i] = p;
      replaced++;
    } else {
      merged.profiles.push(p);
      added++;
    }
  }
  const data = sanitizeAppData(merged);
  return { ok: true, data, added, replaced, fromOtherDevice };
}
