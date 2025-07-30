/* eslint-env mocha */

import { expect } from './fixtures/chai.js'
import sinon from 'sinon'
import { BufferedCursor } from '../src/buffered-cursor.js'
import { indexStrategy } from '../src/strategies/index-strategy.js'
import { timestampStrategy } from '../src/strategies/timestamp-strategy.js'
import type { CursorStrategy, Direction, FetchOptions } from '../src/strategies/strategy.js'

describe('GenericCursor with indexStrategy', () => {
  const totalItems = Array.from({ length: 20 }, (_, i) => `item${i}`)
  let sandbox: sinon.SinonSandbox
  let fetchPage: sinon.SinonStub
  let cursor: BufferedCursor<string, number>

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    fetchPage = sandbox.stub().callsFake(async (page: number, size: number) =>
      totalItems.slice(page * size, page * size + size)
    )
    cursor = new BufferedCursor<string, number>({
      strategy: indexStrategy(fetchPage),
      pageSize: 5,
      retentionPages: 2,
    })
    await cursor.bootstrap()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('loads the initial page', () => {
    expect(fetchPage).to.have.been.calledOnceWithExactly(0, 5)

    const arr = cursor.toArray().map(e => e.value)
    expect(arr).to.deep.equal(totalItems.slice(0, 5))
    expect(cursor.isAtStart()).to.be.false
  })

  it('appends next page on loadAfter', async () => {
    await cursor.loadAfter()
    expect(fetchPage).to.have.been.calledWithExactly(1, 5)
    const values = cursor.toArray().map(e => e.value)
    expect(values).to.deep.equal(totalItems.slice(0, 10))
  })

  it('does not prepend on loadBefore at start', async () => {
    await cursor.loadBefore()
    expect(cursor.toArray().length).to.equal(5)
  })

  it('detects bottom when fully loaded', async () => {
    for (let i = 0; i < 4; i++) {
      await cursor.loadAfter()
    }
    expect(cursor.isAtEnd()).to.be.true
  })

  it('trims buffer beyond retentionPages', async () => {
    for (let i = 0; i < 5; i++) {
      await cursor.loadAfter()
    }
    const arr = cursor.toArray()
    expect(arr.length).to.equal(10) // retentionPages * pageSize = 2 * 5
  })

  it('can slide back and forth correctly', async () => {
    // Start with initial page (items 0-4)
    let arr = cursor.toArray().map(e => e.value)
    expect(arr).to.deep.equal(totalItems.slice(0, 5))

    // Load next page (items 5-9)
    await cursor.loadAfter()
    arr = cursor.toArray().map(e => e.value)
    expect(arr).to.deep.equal(totalItems.slice(0, 10))

    // Load next page (items 10-14) - this will trigger trimming
    await cursor.loadAfter()
    arr = cursor.toArray().map(e => e.value)
    expect(arr).to.deep.equal(totalItems.slice(5, 15))

    // Load previous page - should prepend older items
    await cursor.loadBefore()
    arr = cursor.toArray().map(e => e.value)
    expect(arr).to.deep.equal(totalItems.slice(0, 10))

    // Load next page again
    await cursor.loadAfter()
    arr = cursor.toArray().map(e => e.value)
    // Should get consecutive items after the highest key in buffer
    expect(arr).to.deep.equal(totalItems.slice(5, 15))
  })
})

describe('GenericCursor with timestampStrategy', () => {
  const now = Date.now()
  const toTs = (offset: number): Date => new Date(now + offset)
  const events = Array.from({ length: 10 }, (_, i) => ({
    ts: toTs(i * 1000),
    value: `evt${i}`,
  }))
  const toValue = (arr: { value: string }[]): string[] => arr.map(e => e.value)

  let sandbox: sinon.SinonSandbox
  let fetchBefore: sinon.SinonStub
  let fetchAfter: sinon.SinonStub
  let fetchPage: sinon.SinonStub
  let cursor: BufferedCursor<string, Date>

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    fetchBefore = sandbox.stub().callsFake(async (cutoff: Date, limit: number) => {
      // always return the events in the order they exist in.
      return events
        .filter(e => new Date(e.ts) < cutoff) // < cutoff to get items BEFORE the current key
        .slice(-limit)
    })
    fetchAfter = sandbox.stub().callsFake(async (cutoff: Date, limit: number) => {
      // always return the events in the order they exist in.
      return events
        .filter(e => new Date(e.ts) > cutoff) // > cutoff to get items AFTER the current key
        .slice(0, limit)
    })
    fetchPage = sandbox.stub().callsFake(async (date: Date | null, opts: FetchOptions<Date>) => {
      if (opts.direction === 'before') {
        return fetchBefore(date, opts.limit)
      } else {
        return fetchAfter(date, opts.limit)
      }
    })

    // Create a custom strategy with initialKey set to the same time as the events
    const strategy: CursorStrategy<string, Date> = timestampStrategy(fetchPage)

    cursor = new BufferedCursor<string, Date>({
      strategy,
      pageSize: 3,
      retentionPages: 1,
    })
    await cursor.bootstrap()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('has the expected initial pageSize', () => {
    expect(cursor.toArray().length).to.equal(3)
  })

  it('bootstraps around initialKey', () => {
    const arr = toValue(cursor.toArray())
    // initialKey = now, so fetchAfter loads the first 3 events (evt0, evt1, evt2)
    expect(arr).to.deep.equal(toValue(events.slice(0,3)))
  })

  it('can take a custom date as initialKey', async () => {
    const strategy: CursorStrategy<string, Date> = timestampStrategy(fetchPage, events[2].ts)
    cursor = new BufferedCursor<string, Date>({
      strategy,
      pageSize: 3,
      retentionPages: 1,
    })
    await cursor.bootstrap()
    const arr = toValue(cursor.toArray())
    expect(arr).to.deep.equal(toValue(events.slice(3,6)))
  })

  it('does not prepend on loadBefore at start with no initialKey', async () => {
    await cursor.loadBefore()
    const arr = toValue(cursor.toArray())
    // after loadBefore
    expect(arr).to.deep.equal(toValue(events.slice(0,3)))
  })

  it('prepends on loadBefore at start with initialKey', async () => {
    const strategy: CursorStrategy<string, Date> = timestampStrategy(fetchPage, events[5].ts)
    cursor = new BufferedCursor<string, Date>({
      strategy,
      pageSize: 3,
      retentionPages: 1,
    })
    await cursor.bootstrap()
    expect(toValue(cursor.toArray())).to.deep.equal(toValue(events.slice(6,9)))
    await cursor.loadBefore()
    expect(toValue(cursor.toArray())).to.deep.equal(toValue(events.slice(3,6)))
  })

  it('appends newer events on loadAfter', async () => {
    await cursor.loadAfter()
    const arr = toValue(cursor.toArray())
    expect(arr).to.deep.equal(toValue(events.slice(3,6)))
  })

  it('accepts a different pageSize', async () => {
    const strategy: CursorStrategy<string, Date> = timestampStrategy(fetchPage)
    cursor = new BufferedCursor<string, Date>({
      strategy,
      pageSize: 5,
      retentionPages: 1,
    })
    await cursor.bootstrap()

    const arr = toValue(cursor.toArray())
    expect(arr).to.have.length(5)
    expect(arr).to.deep.equal(toValue(events.slice(0,5)))
  })

  it('can slide back and forth correctly', async () => {
    let arr = cursor.toArray() // [evt0, evt1, evt2]
    expect(toValue(arr)).to.deep.equal(toValue(events.slice(0, 3))) // [evt0, evt1, evt2]
    await cursor.loadBefore() // [evt0, evt1, evt2]
    arr = cursor.toArray()
    expect(toValue(arr)).to.deep.equal(toValue(events.slice(0, 3))) // [evt0, evt1, evt2]
    await cursor.loadAfter() // [evt0, evt1, evt2, evt3, evt4, evt5] trimmed to [evt3, evt4, evt5]
    arr = cursor.toArray()
    expect(toValue(arr)).to.deep.equal(toValue(events.slice(3, 6))) // [evt3, evt4, evt5]
    await cursor.loadBefore() // [evt0, evt1, evt2, evt3, evt4, evt5] trimmed to [evt0, evt1, evt2]
    arr = cursor.toArray()
    expect(toValue(arr)).to.deep.equal(toValue(events.slice(0, 3))) // [evt0, evt1, evt2]
    await cursor.loadAfter() // [evt0, evt1, evt2, evt3, evt4, evt5] trimmed to [evt3, evt4, evt5]
    arr = cursor.toArray()
    expect(toValue(arr)).to.deep.equal(toValue(events.slice(3, 6))) // [evt3, evt4, evt5]
  })
})

