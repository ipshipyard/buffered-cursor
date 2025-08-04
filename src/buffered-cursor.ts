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
  public readonly windowSize: number

  constructor (private opts: BufferedCursorOptions<T, K>) {
    this.retentionPages = this.opts.retentionPages ?? 2
    this.pageSize = this.opts.pageSize
    this.windowSize = this.retentionPages * this.pageSize
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
    const existingKeys = new Set(this.buf.toArray().map(item => item.key))
    // remove any duplicates from the batch
    const uniqueBatch = batch.filter(item => {
      const isUnique = !existingKeys.has(item.key)
      if (!isUnique) {
        console.warn('debug BufferedCursor: Duplicate item found in batch, skipping:', item.key)
      }
      return isUnique
    })
    if (direction === 'before') {
      for (const item of uniqueBatch) {
        this.buf.unshift(item)
      }
      // Decrement windowStart by number of new items
      const itemsAdded = Math.max(0, beforeLength + batch.length - maxLength)
      if (itemsAdded > 0) {
        this.windowStart -= itemsAdded
      }
    } else {
      // direction="after"
      // this.buf.splice(beforeLength, 0, ...batch)
      for (const item of uniqueBatch) {
        this.buf.push(item)
      }
      const itemsDropped = Math.max(0, beforeLength + batch.length - maxLength)
      if (itemsDropped > 0) {
        this.windowStart += itemsDropped
      }
    }
  }

  /**
   * React-virtualized has an absolute index for a row, and we need to convert it to the virtual index in the buffer
   *
   * @param index - absolute index of the row
   * @returns the item at the given index, or null if not found
   */
  public getItem(index: number): { key: K; value: T } | null {
    const items = this.buf.toArray()
    const foundItem = items.find(item => item.key === index)
    return foundItem ?? null
  }

  private insertItems(items: Array<{key: K, value: T}>, direction: Direction): void {
    if (direction === 'before') {
      while (items.length > 0) {
        this.buf.unshift(items.pop()!)
      }
    } else {
      for (const item of items) {
        this.buf.push(item)
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
   * If not, loads and inserts the required items into the buffer.
   * (Assumes K is number for index-based fetch. Adapt as needed for custom keys.)
   *
   * This is a helper method for react-virtualized's loadMoreRows function.
   */
  public async ensureRange(startIndex: number, stopIndex: number, options: AbortOptions = {}): Promise<void> {
    const currentStartKey: number = this.buf.peekFront()?.key as number ?? startIndex
    const currentEndKey: number = this.buf.peekBack()?.key as number ?? stopIndex

    let direction: Direction
    let newWindowStart: number
    let limit: number
    let batch: Array<{ key: K; value: T }>
    if (startIndex < currentStartKey) {
      direction = 'before'
      newWindowStart = startIndex
      limit = currentStartKey - startIndex
      batch = await this.opts.strategy.fetch(
        newWindowStart as K,
        {
          direction,
          limit,
          currentStartKey: currentStartKey as K,
          currentEndKey: currentEndKey as K,
          ...options
        }
      )
    } else {
      direction = 'after'
      newWindowStart = stopIndex - this.windowSize + 1
      limit = stopIndex - currentEndKey + 1
      const fetchStartKey = currentEndKey + 1

      batch = await this.opts.strategy.fetch(
        fetchStartKey as K,
        {
          direction,
          limit,
          currentStartKey: currentStartKey as K,
          currentEndKey: currentEndKey as K,
          ...options
        }
      )
    }

    this.insertItems(batch, direction)
  }
}
