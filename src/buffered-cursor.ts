import Denque from 'denque'
import type { CursorStrategy, Direction } from './strategies/strategy.js'

export interface BufferedCursorOptions<T, K> {
  strategy: CursorStrategy<T, K>;
  pageSize: number;
  retentionPages?: number; // how many "pages" to keep around “current”
}

export class BufferedCursor<T, K> {
  private buf = new Denque<{ key: K; value: T }>()
  private reachedEnd: Record<Direction, boolean> = {
    before: false,
    after: false
  }
  private retentionPages: number
  private pageSize: number

  constructor (private opts: BufferedCursorOptions<T, K>) {
    this.retentionPages = this.opts.retentionPages ?? 2
    this.pageSize = this.opts.pageSize
  }

  /**
   * Bootstrap around strategy.initialKey or null
   * (fills the “after” direction once)
   */
  public async bootstrap (): Promise<void> {
    const key = this.opts.strategy.initialKey ?? null
    await this.load('after', key)
  }

  /**
   * Load `limit` items in `direction` from `cursorKey` (or from ends)
   */
  private async load (direction: Direction, cursorKey: K | null): Promise<void> {
    console.log('load', { direction, cursorKey })
    if (this.reachedEnd[direction]) { return }
    const fetchStartKey = this.buf.peekFront()?.key ?? null
    const fetchEndKey = this.buf.peekBack()?.key ?? null

    const batch = await this.opts.strategy.fetch(
      cursorKey,
      {
        direction,
        limit: this.pageSize,
        currentStartKey: fetchStartKey,
        currentEndKey: fetchEndKey
      }
    )
    console.log('batch', batch)
    // const firstKey = batch[0]?.key
    // const lastKey = batch[batch.length - 1]?.key
    // const dirKey = direction === 'after' ? lastKey : firstKey
    if (batch.length < this.pageSize) {
      console.log('reached end', direction)
      this.reachedEnd[direction] = true
    }
    // insert into deque
    if (direction === 'before') {
      // batch is in descending order; reverse to ascending towards front
      batch.reverse().forEach((e) => this.buf.unshift(e))
    } else {
      // direction="after"
      batch.forEach((e) => this.buf.push(e))
    }
    if (this.opts.strategy.trim != null) {
      const currentStartKey = this.buf.peekFront()?.key ?? null
      const currentEndKey = this.buf.peekBack()?.key ?? null
      if (currentStartKey === null || currentEndKey === null) {
        throw new Error('currentStartKey and currentEndKey must be defined')
      }
      this.opts.strategy.trim(this.buf, direction, {
        pageSize: this.pageSize,
        retentionPages: this.retentionPages,
        currentStartKey,
        currentEndKey,
        fetchStartKey,
        fetchEndKey
      })
    } else if (this.buf.length > this.retentionPages * this.pageSize) {
      // pick the “middle” key as our trim center
      const centerIndex = Math.floor(this.buf.length / 2)
      const centerKey = this.buf.peekAt(centerIndex)?.key
      if (centerKey !== undefined) {
        this.trim(centerKey)
      }
    }
  }

  /**
   * Public method: ask to load more before/after
   */
  public async loadBefore (): Promise<void> {
    const front = this.buf.peekFront()?.key ?? null
    await this.load('before', front)
  }

  public async loadAfter (): Promise<void> {
    console.log('loadAfter', this.buf.length)
    const back = this.buf.peekBack()?.key ?? null
    await this.load('after', back)
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
   * keep only N pages worth of items around the “center” to bound memory
   */
      private trim (centerKey: K): void {
    const { pageSize, retentionPages = 2 } = this.opts
    const maxItems = retentionPages * pageSize
    if (this.buf.length <= maxItems) {
      // we have less than the max items, so we don't need to trim
      return
    }

    // Find the center index in the buffer
    const centerIndex = Math.floor(this.buf.length / 2)
    const itemsToKeep = Math.floor(maxItems / 2)

    // Keep items around the center
    const startIndex = Math.max(0, centerIndex - itemsToKeep)
    const endIndex = Math.min(this.buf.length, centerIndex + itemsToKeep)

    // Remove items from the front (keep only items from startIndex onwards)
    for (let i = 0; i < startIndex; i++) {
      this.buf.shift()
    }

    // Remove items from the back (keep only items up to endIndex)
    while (this.buf.length > endIndex - startIndex) {
      this.buf.pop()
    }
  }
}
