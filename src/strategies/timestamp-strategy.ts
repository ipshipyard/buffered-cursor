import type { CursorStrategy, Direction } from './strategy.js'

export type TimestampStrategyFetch<T> = (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: T }>>

export interface TimestampStrategyOptions<T> {
  fetchBefore: TimestampStrategyFetch<T>
  fetchAfter: TimestampStrategyFetch<T>
}

export const timestampStrategy = <T>({ fetchBefore, fetchAfter }: TimestampStrategyOptions<T>): CursorStrategy<T, Date> => ({
  initialKey: new Date(),
  fetch: async (key: Date | null, { direction, limit, currentStartKey, currentEndKey }) => {
    console.log('fetch', { key, direction, limit, currentStartKey, currentEndKey })
    return direction === 'before'
      ? (await fetchBefore(key ?? new Date(), limit)).map(({ ts, value }) => ({ key: ts, value }))
      : (await fetchAfter(key ?? new Date(), limit)).map(({ ts, value }) => ({ key: ts, value }))
  },
  isBefore: (a, b) => a < b
})
