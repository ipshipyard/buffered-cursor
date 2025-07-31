import type { AbortOptions } from '../buffered-cursor.js'

export type Direction = 'before' | 'after'

export interface FetchOptions<K> extends AbortOptions {
  direction: Direction;
  limit: number;
  currentStartKey: K | null;
  currentEndKey: K | null;
}

/**
 * A Generic cursor strategy to implement for your data.
 */
export interface CursorStrategy<T, K> {
  /**
   * Given a cursor key K and a direction, fetch up to `limit` items.
   * - direction="before": items *older* than `cursorKey`, in descending order
   * - direction="after":  items *newer* than `cursorKey`, in ascending order
   */
  fetch(
    cursorKey: K | null,
    opts: FetchOptions<K>
  ): Promise<Array<{ key: K; value: T }>>;

  /**
   * Optional: a “null” key meaning “start here” (e.g. “now” for timestamps, or 0 for indexes).
   * If you don’t provide one, GenericCursor will bootstrap by calling fetch(null, after).
   */
  initialKey?: K | null;
}
