import { sanitizeAppData } from './migrate';
import { STORAGE_KEY, createProfile, type AppData, type Profile } from './schema';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** In-memory storage for tests and for browsers where localStorage is blocked. */
export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * The single source of truth for settings and progress.
 * `data` is replaced (never mutated) on each update, and listeners run synchronously,
 * so a colour change reaches a running game on its next frame without a reload.
 */
export class SettingsStore {
  private state: AppData;
  private listeners = new Set<() => void>();
  /** False when the browser refused to save (private mode, storage full). */
  persistOk = true;

  constructor(private storage: StorageLike) {
    this.state = this.read();
    this.write();
  }

  private read(): AppData {
    let raw: unknown;
    try {
      const text = this.storage.getItem(STORAGE_KEY);
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = null;
    }
    return sanitizeAppData(raw);
  }

  private write(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.persistOk = true;
    } catch {
      this.persistOk = false;
    }
  }

  get data(): AppData {
    return this.state;
  }

  get activeProfile(): Profile | null {
    return this.state.profiles.find((p) => p.id === this.state.activeProfileId) ?? null;
  }

  profile(id: string): Profile | null {
    return this.state.profiles.find((p) => p.id === id) ?? null;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Re-reads storage (used by tests to prove persistence). */
  reload(): void {
    this.state = this.read();
    this.emit();
  }

  private emit(): void {
    for (const fn of [...this.listeners]) fn();
  }

  update(mutate: (draft: AppData) => void): void {
    const draft = clone(this.state);
    mutate(draft);
    this.state = sanitizeAppData(draft);
    this.write();
    this.emit();
  }

  /** Replaces everything (import). */
  replace(data: AppData): void {
    this.state = sanitizeAppData(data);
    this.write();
    this.emit();
  }

  updateProfile(id: string, mutate: (p: Profile) => void): void {
    this.update((d) => {
      const p = d.profiles.find((x) => x.id === id);
      if (p) mutate(p);
    });
  }

  updateActive(mutate: (p: Profile) => void): void {
    const id = this.state.activeProfileId;
    if (id) this.updateProfile(id, mutate);
  }

  addProfile(init: { name: string; kind: 'child' | 'adult'; avatar?: number }, activate = true): Profile {
    const p = createProfile(init);
    this.update((d) => {
      d.profiles.push(p);
      if (activate) d.activeProfileId = p.id;
    });
    return this.profile(p.id) ?? p;
  }

  deleteProfile(id: string): void {
    this.update((d) => {
      d.profiles = d.profiles.filter((p) => p.id !== id);
      if (d.activeProfileId === id) d.activeProfileId = d.profiles[0]?.id ?? null;
    });
  }

  setActive(id: string): void {
    this.update((d) => {
      if (d.profiles.some((p) => p.id === id)) d.activeProfileId = id;
    });
  }
}
