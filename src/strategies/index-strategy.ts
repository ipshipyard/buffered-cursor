import type { CursorStrategy } from './strategy.js'

export type IndexStrategyFetch<T> = (page: number, size: number) => Promise<T[]>

export const indexStrategy = <T>(fetchPage: IndexStrategyFetch<T>): CursorStrategy<T, number> => ({
  initialKey: null,
  fetch: async (key, {direction: dir, limit, currentStartKey, currentEndKey}) => {
    console.log('fetch', { key, dir, limit, currentStartKey, currentEndKey })
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
  },
  isBefore: (a, b) => a < b,
  trim: (buf, dir, { pageSize, retentionPages, currentStartKey, currentEndKey, fetchStartKey, fetchEndKey }) => {
    if (fetchStartKey == null || fetchEndKey == null) {
      // no need to trim if we don't have a fetch start or end key
      return
    }
    const maxItems = retentionPages * pageSize

    let itemsToRemove = 0
    if (currentStartKey === fetchStartKey || currentEndKey === fetchEndKey) {
      itemsToRemove = pageSize
    } else {
      if (dir === 'after') {
        itemsToRemove = Math.abs(currentStartKey - fetchStartKey)
      } else {
        itemsToRemove = Math.abs(currentEndKey - fetchEndKey)
      }
    }
    if (buf.length <= maxItems) {
      // buffer length is smaller than maxItems, no need to trim
      return
    }
    if (dir === 'after') {
      // trim from the front
      buf.splice(0, itemsToRemove)
    } else {
      // trim from the back
      buf.splice(buf.length - itemsToRemove, itemsToRemove)
    }
  }
})
