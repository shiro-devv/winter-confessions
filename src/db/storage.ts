/** The tiny slice of the Web Storage API the database relies on. */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Keeps data in memory when localStorage is blocked (private mode, etc.). */
class MemoryStorage implements StorageAdapter {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** Picks localStorage when it works, otherwise falls back to memory. */
export function createStorage(): { adapter: StorageAdapter; persistent: boolean } {
  try {
    const probe = '__wc_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { adapter: window.localStorage, persistent: true };
  } catch {
    return { adapter: new MemoryStorage(), persistent: false };
  }
}
