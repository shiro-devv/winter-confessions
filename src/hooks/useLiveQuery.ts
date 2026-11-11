import { useMemo, useSyncExternalStore, type DependencyList } from 'react';
import { db } from '../db';

/**
 * Runs a database query and re-runs it whenever any table changes
 * (in this tab or another one). Pass the values the query reads as `deps`.
 */
export function useLiveQuery<T>(query: () => T, deps: DependencyList = []): T {
  const version = useSyncExternalStore(db.subscribe, db.getVersion, db.getVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(query, [version, ...deps]);
}
