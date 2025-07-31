import type { CursorStrategy, FetchOptions } from './strategy.js'

export type TimestampStrategyFetch<T> = (date: Date | null, opts: FetchOptions<Date> ) => Promise<Array<{ ts: Date; value: T }>>

export const timestampStrategy = <T>(fetchItems: TimestampStrategyFetch<T>, initialKey: Date | null = null): CursorStrategy<T, Date> => ({
  initialKey: initialKey ?? null,
  fetch: async (key: Date | null, options: FetchOptions<Date>) => {
    return fetchItems(key, options).then(items => items.map(({ ts, value }) => ({ key: ts, value })))
  }
})
