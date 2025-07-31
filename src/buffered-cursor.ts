import Denque from 'denque'
import type { CursorStrategy, Direction } from './strategies/strategy.js'

export interface BufferedCursorOptions<T, K> {
  strategy: CursorStrategy<T, K>;

  /**
   * How many items are in each page.
   */
  pageSize: number;
  /**
   * How many pages to keep around total. Total size of the cursor is `retentionPages * pageSize`.
   */
  retentionPages?: number;
}

export type AbortOptions = {
  signal?: AbortSignal;
}

export class BufferedCursor<T, K> {
  private buf: Denque<{ key: K; value: T }>
  private reachedEnd: Record<Direction, boolean> = {
    before: false,
    after: false
  }
  private retentionPages: number
  private pageSize: number
  private windowStart: number = 0 // absolute index of first item in buf

  constructor (private opts: BufferedCursorOptions<T, K>) {
    this.retentionPages = this.opts.retentionPages ?? 2
    this.pageSize = this.opts.pageSize
    this.buf = new Denque<{ key: K; value: T }>([], { capacity: this.retentionPages * this.pageSize })
  }

  /**
   * Bootstrap around strategy.initialKey or null
   * (fills the "after" direction once)
   */
  public async bootstrap (direction: Direction = 'after'): Promise<void> {
    const key = this.opts.strategy.initialKey ?? null
    await this.load(direction, key)
    // After bootstrap, windowStart should match index of first item in buf (if known)
    if (this.buf.length > 0 && typeof this.buf.peekFront()?.key === 'number') {
      this.windowStart = this.buf.peekFront()!.key as number
    } else {
      this.windowStart = this.opts.strategy.getWindowStart?.() ?? 0
    }
  }

  /**
   * Load `limit` items in `direction` from `cursorKey` (or from ends)
   */
  private async load (direction: Direction, cursorKey: K | null, options: AbortOptions = {}): Promise<void> {
    if (this.reachedEnd[direction]) { return }
    const fetchStartKey = this.buf.peekFront()?.key ?? null
    const fetchEndKey = this.buf.peekBack()?.key ?? null

    const batch = await this.opts.strategy.fetch(
      cursorKey,
      {
        direction,
        limit: this.pageSize,
        currentStartKey: fetchStartKey,
        currentEndKey: fetchEndKey,
        ...options
      }
    )

    if (direction === 'after') {
      this.reachedEnd.before = false
    } else {
      this.reachedEnd.after = false
    }

    if (batch.length < this.pageSize) {
      this.reachedEnd[direction] = true
    }

    // insert into deque and update windowStart as appropriate
    const maxLength = this.retentionPages * this.pageSize
    const beforeLength = this.buf.length
    if (direction === 'before') {
      this.buf.splice(0, 0, ...batch)
      // Decrement windowStart by number of new items
      const itemsAdded = Math.max(0, beforeLength + batch.length - maxLength)
      if (itemsAdded > 0) {
        this.windowStart -= itemsAdded
      }
    } else {
      // direction="after"
      this.buf.splice(beforeLength, 0, ...batch)
      const itemsDropped = Math.max(0, beforeLength + batch.length - maxLength)
      if (itemsDropped > 0) {
        this.windowStart += itemsDropped
      }
    }
  }

  /**
   * Public method: ask to load more before/after current item window
   */
  public async loadBefore (from: K | null = null, options: AbortOptions = {}): Promise<void> {
    await this.load('before', from ?? this.buf.peekFront()?.key ?? null, options)
  }

  public async loadAfter (from: K | null = null, options: AbortOptions = {}): Promise<void> {
    await this.load('after', from ?? this.buf.peekBack()?.key ?? null, options)
  }

  /**
   * Are we at the very beginning (considering the direction)?
   */
  public isAtStart (): boolean {
    return this.reachedEnd.before
  }

  /**
   * Are we at the very end (considering the direction)?
   */
  public isAtEnd (): boolean {
    return this.reachedEnd.after
  }

  /**
   * Get the in‑memory window as an array
   */
  public toArray (): Array<{ key: K; value: T }> {
    return this.buf.toArray()
  }

  /**
   * Absolute index of first item in buffer.
   */
  public getWindowStart(): number {
    return this.windowStart
  }

  /**
   * Absolute index of last item in buffer.
   */
  public getWindowEnd(): number {
    return this.windowStart + this.buf.length - 1
  }

  /**
   * Check if a key is loaded in the buffer.
   *
   * Helper method for react-virtualized's isRowLoaded function.
   */
  public isKeyLoaded(key: K): boolean {
    return this.buf.toArray().some(item => item.key === key)
  }

  /**
   * Ensures that the range [startIndex, stopIndex] is loaded in the buffer.
   * If not, loads the required pages and replaces buffer.
   * (Assumes K is number for index-based fetch. Adapt as needed for custom keys.)
   *
   * This is a helper method for react-virtualized's loadMoreRows function.
   */
  public async ensureRange(startIndex: number, stopIndex: number): Promise<void> {
    if (startIndex > stopIndex) [startIndex, stopIndex] = [stopIndex, startIndex];

    const bufLen = this.buf.length;
    const windowStart = this.windowStart;
    const windowEnd = windowStart + bufLen - 1;
    if (bufLen > 0 && startIndex >= windowStart && stopIndex <= windowEnd) return;

    // If need newer logs:
    if (stopIndex > windowEnd) {
      // Determine a key that corresponds to windowEnd (or just use current back key)
      let fromKey: K | null = this.buf.peekBack()?.key ?? null;

      // Optionally: if you can resolve the key at stopIndex directly (e.g., via strategy or index->key cache), use that instead.
      while (stopIndex > (this.windowStart + this.buf.length - 1) && !this.isAtEnd()) {
        await this.loadAfter(fromKey);
        fromKey = this.buf.peekBack()?.key ?? null;
      }
    }

    // If need older logs:
    if (startIndex < windowStart) {
      let fromKey: K | null = this.buf.peekFront()?.key ?? null;
      while (startIndex < this.windowStart && !this.isAtStart()) {
        await this.loadBefore(fromKey);
        fromKey = this.buf.peekFront()?.key ?? null;
      }
    }

    // If still not covered (big jump), you need to resolve a key near startIndex:
    if (!(startIndex >= this.windowStart && stopIndex <= this.getWindowEnd())) {
      // Example fallback: compute page containing startIndex and use its key as cursor
      const fetchStart = Math.max(0, startIndex);
      const page = Math.floor(fetchStart / this.pageSize);
      const pageKey = (page as unknown) as K; // adapt if your strategy interprets key differently
      await this.loadAfter(pageKey); // or loadBefore depending on how your strategy bootstraps
      this.windowStart = page * this.pageSize; // adjust if needed based on fetched batch
    }
  }
}
