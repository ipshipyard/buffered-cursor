import type { CursorStrategy, FetchOptions } from './strategy.ts'

export type PageStrategyFetch<T> = (page: number, size: number, options: FetchOptions<number>) => Promise<T[]>

export const pageStrategy = <T>(fetchPage: PageStrategyFetch<T>, initialKey: number | null = null): CursorStrategy<T, number> => ({
  initialKey,
  fetch: async (key, options) => {
    const { direction, limit } = options
    if (key === 0 && direction === 'before') {
      // there is nothing prior to page 0, so return an empty array
      return []
    }

    const page = key == null ? 0 : Math.max(0, Math.floor(key / limit) + (direction === 'after' ? 1 : -1))
    const items = await fetchPage(page, limit, options)
    const out = items.map((v, i) => ({
      key: page * limit + i,
      value: v
    }))
    return out
  }
})
