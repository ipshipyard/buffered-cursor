import type { CursorStrategy, FetchOptions } from './strategy.ts'

export type IndexStrategyFetch<T> = (startIndex: number, endIndex: number, options: FetchOptions<number>) => Promise<T[]>

export const indexStrategy = <T>(fetch: IndexStrategyFetch<T>, initialKey: number | null = null): CursorStrategy<T, number> => ({
  initialKey,
  fetch: async (key, options) => {
    const { limit } = options
    const startIndex = key ?? 0
    const endIndex = startIndex + limit - 1

    const items = await fetch(startIndex, endIndex, options)
    const out = items.map((v, i) => ({
      key: startIndex + i,
      value: v
    }))
    return out
  }
})
