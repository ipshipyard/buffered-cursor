/**
 * @packageDocumentation
 *
 * `buffered-cursor` is a library for efficient paging of large datasets.
 *
 * It provides a generic cursor interface that can be used to paginate over
 * any data source that can be represented as a sequence of items.
 *
 * It also provides a set of strategies for different data types, such as
 * timestamps and indexes.
 *
 * # Quick Start
 *
 * @example Index‑based paging
 *
 * ```ts
 * import { BufferedCursor } from "buffered-cursor"
 * import { indexStrategy } from "buffered-cursor/strategies"
 *
 * // your async page loader: (pageIndex, pageSize) => Promise<T[]>
 * const fetchPage = async (page: number, size: number) => {
 *   // e.g. read from IndexedDB, network, etc.
 *   // return myDB.readPage(page, size)
 *   return []
 * }
 *
 * const cursor = new BufferedCursor<string, number>({
 *   strategy: indexStrategy(fetchPage),
 *   pageSize: 100,
 *   retentionPages: 2,
 * })
 *
 * await cursor.bootstrap()        // load first page
 * console.log(cursor.toArray())  // in‑memory window
 *
 * await cursor.loadAfter()       // load next page
 * await cursor.loadBefore()      // load previous page
 * ```
 *
 * @example Timestamp‑based paging
 *
 * ```ts
 * import { BufferedCursor } from "buffered-cursor"
 * import { timestampStrategy } from "buffered-cursor/strategies"
 *
 * const logStore = {
 *   getLogsBefore: (ts: Date, limit: number) => ([]),
 *   getLogsAfter: (ts: Date, limit: number) => ([]),
 * }
 *
 * // your async loaders:
 * // – items before ts (newest‑first), items after ts (oldest‑first)
 * const fetchBefore = (ts: Date, limit: number) =>
 *   logStore.getLogsBefore(ts, limit)
 * const fetchAfter  = (ts: Date, limit: number) =>
 *   logStore.getLogsAfter(ts, limit)
 *
 * const cursor = new BufferedCursor<LogEntry, string>({
 *   strategy: timestampStrategy(fetchBefore, fetchAfter),
 *   pageSize: 50,
 * })
 *
 * await cursor.bootstrap(new Date())
 * console.log("Window:", cursor.toArray())
 * ```
 */

export * from './strategies/index.js'
export * from './buffered-cursor.js'
