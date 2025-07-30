import type Denque from 'denque'

export type Direction = 'before' | 'after'

export type TrimOptions<K> = {
  /**
   * The number of items to fetch in a single batch.
   */
  pageSize: number;
  /**
   * The number of pages to keep around the current page.
   */
  retentionPages: number;

  /**
   * The key of the first item in the current view.
   */
  currentStartKey: K;

  /**
   * The key of the last item in the current view.
   */
  currentEndKey: K;

  /**
   * The key of the first item prior to fetching.
   */
  fetchStartKey: K | null;

  /**
   * The key of the last item prior to fetching.
   */
  fetchEndKey: K | null;
}

export type FetchOptions<K> = {
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
   * Optional: trim the buffer based on the strategy. By default, the buffer is trimmed to keep only the “middle” N pages worth of items around the “center” key.
   */
  trim?(
    buf: Denque<{ key: K; value: T }>,
    direction: Direction,
    opts: TrimOptions<K>
  ): void;

  // /**
  //  * Optional: get the index of an item in the buffer.
  //  */
  // getIndex?(buf: Denque<{ key: K; value: T }>, key: K): number;

  /**
   * Does `a` come strictly before `b`? (for ordering in the deque)
   * e.g. for timestamps: a < b; for indexes: a < b
   */
  isBefore(a: K, b: K): boolean;

  /**
   * Optional: a “null” key meaning “start here” (e.g. “now” for timestamps, or 0 for indexes).
   * If you don’t provide one, GenericCursor will bootstrap by calling fetch(null, after).
   */
  initialKey?: K | null;
}
