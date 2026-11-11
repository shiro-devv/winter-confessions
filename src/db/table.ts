import { AppError } from './errors';
import { newId } from './ids';
import type { BaseRow, NewRow } from './types';
import type { StorageAdapter } from './storage';

/**
 * A typed table persisted as one JSON array per table.
 * Every write goes through `persist`, which notifies subscribers.
 */
export class Table<T extends BaseRow> {
  private readonly key: string;

  constructor(
    private readonly name: string,
    private readonly storage: StorageAdapter,
    private readonly onChange: () => void,
    prefix: string,
  ) {
    this.key = `${prefix}${name}`;
  }

  /** All rows, in insertion order. Returns [] if stored data is unreadable. */
  all(): T[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  get(id: string): T | undefined {
    return this.all().find((row) => row.id === id);
  }

  find(predicate: (row: T) => boolean): T | undefined {
    return this.all().find(predicate);
  }

  where(predicate: (row: T) => boolean): T[] {
    return this.all().filter(predicate);
  }

  count(predicate?: (row: T) => boolean): number {
    const rows = this.all();
    return predicate ? rows.filter(predicate).length : rows.length;
  }

  insert(data: NewRow<T>): T {
    const row = { ...data, id: newId(), createdAt: Date.now() } as unknown as T;
    this.persist([...this.all(), row]);
    return row;
  }

  update(id: string, patch: Partial<NewRow<T>>): T | undefined {
    let updated: T | undefined;
    const next = this.all().map((row) => {
      if (row.id !== id) return row;
      updated = { ...row, ...patch } as T;
      return updated;
    });
    if (updated) this.persist(next);
    return updated;
  }

  remove(id: string): boolean {
    return this.removeWhere((row) => row.id === id) > 0;
  }

  removeWhere(predicate: (row: T) => boolean): number {
    const rows = this.all();
    const kept = rows.filter((row) => !predicate(row));
    const removed = rows.length - kept.length;
    if (removed > 0) this.persist(kept);
    return removed;
  }

  private persist(rows: T[]): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(rows));
    } catch {
      throw new AppError(
        'storage',
        `We couldn't save your changes because browser storage is full or blocked. Free some space or allow site data, then try again. (table: ${this.name})`,
      );
    }
    this.onChange();
  }
}
