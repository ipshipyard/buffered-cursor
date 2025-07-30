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

export class BufferedCursor<T, K> {
  private buf: Denque<{ key: K; value: T }>
  private reachedEnd: Record<Direction, boolean> = {
    before: false,
    after: false
  }
  private retentionPages: number
  private pageSize: number

  constructor (private opts: BufferedCursorOptions<T, K>) {
    this.retentionPages = this.opts.retentionPages ?? 2
    this.pageSize = this.opts.pageSize
    this.buf = new Denque<{ key: K; value: T }>([], { capacity: this.retentionPages * this.pageSize })
  }

  /**
   * Bootstrap around strategy.initialKey or null
   * (fills the "after" direction once)
   */
  public async bootstrap (): Promise<void> {
    const key = this.opts.strategy.initialKey ?? null
    await this.load('after', key)
  }

  /**
   * Load `limit` items in `direction` from `cursorKey` (or from ends)
   */
  private async load (direction: Direction, cursorKey: K | null): Promise<void> {
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

    if (direction === 'after') {
      this.reachedEnd.before = false
    } else {
      this.reachedEnd.after = false
    }

    if (batch.length < this.pageSize) {
      this.reachedEnd[direction] = true
    }

    // insert into deque
    if (direction === 'before') {
      // batch should already be in expected order.
      this.buf.splice(0, 0, ...batch)
    } else {
      // direction="after"
      this.buf.splice(this.buf.length, 0, ...batch)
    }
  }

  /**
   * Public method: ask to load more before/after current item window
   */
  public async loadBefore (): Promise<void> {
    const front = this.buf.peekFront()?.key ?? null
    await this.load('before', front)
  }

  public async loadAfter (): Promise<void> {
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
}
