import type { CursorStrategy, FetchOptions } from './strategy.js'

export type TimestampStrategyFetch<T> = (date: Date | null, opts: FetchOptions<Date>) => Promise<Array<{ ts: Date; value: T }>>

export const timestampStrategy = <T>(fetchItems: TimestampStrategyFetch<T>, initialKey: Date | null = null): CursorStrategy<T, Date> => ({
  initialKey: initialKey ?? null,
  fetch: async (key: Date | null, { direction, limit, currentStartKey, currentEndKey }) => {
    return fetchItems(key, { direction, limit, currentStartKey, currentEndKey }).then(items => items.map(({ ts, value }) => ({ key: ts, value })))
  }
})
