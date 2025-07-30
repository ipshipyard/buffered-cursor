import type { CursorStrategy } from './strategy.js'

export type IndexStrategyFetch<T> = (page: number, size: number) => Promise<T[]>

export const indexStrategy = <T>(fetchPage: IndexStrategyFetch<T>, initialKey: number | null = null): CursorStrategy<T, number> => ({
  initialKey,
  fetch: async (key, {direction: dir, limit, currentStartKey, currentEndKey}) => {
    if (key === 0 && dir === 'before') {
      // there is nothing prior to page 0, so return an empty array
      return []
    }

    const page = key == null ? 0 : Math.max(0, Math.floor(key / limit) + (dir === 'after' ? 1 : -1))
    const items = await fetchPage(page, limit)
    const out = items.map((v, i) => ({
      key: page * limit + i,
      value: v
    }))
    return out
  }
})
