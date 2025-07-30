/* eslint-env mocha */

import { expect } from './fixtures/chai.js'
import sinon from 'sinon'
import { BufferedCursor } from '../src/buffered-cursor.js'
import { indexStrategy } from '../src/strategies/index-strategy.js'
import { timestampStrategy } from '../src/strategies/timestamp-strategy.js'
import type { Direction } from '../src/strategies/strategy.js'

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
    console.log('cursor.toArray()', cursor.toArray())
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
    console.log('loading next page again')
    await cursor.loadAfter()
    arr = cursor.toArray().map(e => e.value)
    // Should get consecutive items after the highest key in buffer
    expect(arr).to.deep.equal(totalItems.slice(5, 15))
  })
})

describe('GenericCursor with timestampStrategy', () => {
  const now = Date.now()
  const toTs = (offset: number) => new Date(now + offset).toISOString()
  const events = Array.from({ length: 10 }, (_, i) => ({
    ts: toTs(i * 1000),
    value: `evt${i}`,
  }))

  let sandbox: sinon.SinonSandbox
  let fetchBefore: sinon.SinonStub
  let fetchAfter: sinon.SinonStub
  let cursor: BufferedCursor<string, Date>

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    fetchBefore = sandbox.stub().callsFake(async (ts: Date, limit: number) => {
      const cutoff = ts
      return events
        .filter(e => new Date(e.ts) < cutoff)
        .slice(-limit)
        .reverse()
    })
    fetchAfter = sandbox.stub().callsFake(async (ts: Date, limit: number) => {
      const cutoff = ts
      return events.filter(e => new Date(e.ts) > cutoff).slice(0, limit)
    })
    cursor = new BufferedCursor<string, Date>({
      strategy: timestampStrategy({ fetchBefore, fetchAfter }),
      pageSize: 3,
      retentionPages: 1,
    })
    await cursor.bootstrap()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('bootstraps around initialKey', () => {
    const arr = cursor.toArray().map(e => e.value)
    // initialKey = now, so fetchBefore loads the last 3 events
    expect(arr).to.deep.equal(events.slice(7).map(e => e.value))
  })

  it('prepends older events on loadBefore', async () => {
    await cursor.loadBefore()
    const arr = cursor.toArray().map(e => e.value)
    expect(arr[0]).to.equal('evt4')
  })

  it('appends newer events on loadAfter', async () => {
    await cursor.loadAfter()
    const arr = cursor.toArray().map(e => e.value)
    expect(arr[arr.length - 1]).to.equal('evt9')
  })

  it('trims events outside the time window', async () => {
    await cursor.loadBefore()
    const arr = cursor.toArray()
    const times = arr.map(e => new Date(e.key).getTime())
    const minTime = Math.min(...times)
    expect(Date.now() - minTime).to.be.at.most(5000)
  })

  // it('can slide back and forth correctly', async () => {
  //   // confirm current state
  //   let arr = cursor.toArray()
  //   expect(arr).to.deep.equal(events.slice(7).map(e => e.value))
  //   await cursor.loadBefore()
  //   arr = cursor.toArray()
  //   expect(arr).to.deep.equal(events.slice(4).map(e => e.value))
  //   await cursor.loadAfter()
  //   arr = cursor.toArray()
  //   expect(arr).to.deep.equal(events.slice(0, 6).map(e => e.value))
  //   await cursor.loadBefore()
  //   arr = cursor.toArray()
  //   expect(arr).to.deep.equal(events.slice(0, 3).map(e => e.value))
  //   await cursor.loadAfter()
  //   arr = cursor.toArray()
  //   expect(arr).to.deep.equal(events.slice(0, 6).map(e => e.value))
  // })
})

