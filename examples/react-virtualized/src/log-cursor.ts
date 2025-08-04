import { BufferedCursor } from 'buffered-cursor'
import { FetchOptions, indexStrategy } from 'buffered-cursor/strategies'
import type { LogEntry } from './types.js'
import { MOCK_DATA } from './data-generator.js'

// Window size that matches react-virtualized
const WINDOW_SIZE = 20

// Create a fetch function that simulates pagination from our mock data
const fetchLogPage = async (startIndex: number, endIndex: number, _options: FetchOptions<number>): Promise<LogEntry[]> => {
  if (startIndex >= MOCK_DATA.length) {
    return []
  }
  if (startIndex < 0) {
    throw new Error(`startIndex < 0: ${startIndex}`)
  }

  return MOCK_DATA.slice(startIndex, endIndex + 1)
}

// Create the cursor strategy - start from the beginning
const logCursorStrategy = indexStrategy(fetchLogPage, 0)

// Create the buffered cursor
export const logCursor = new BufferedCursor<LogEntry, number>({
  strategy: logCursorStrategy,
  pageSize: WINDOW_SIZE * 3,
  retentionPages: 1 // Keep 1 pages in memory (60 items total)
})

// Helper to get current data as array
export function getCurrentLogs(): Array<{ key: number; value: LogEntry }> {
  const logs = logCursor.toArray()
  return logs
}

// Helper to get total count
export function getTotalCount(): number {
  return MOCK_DATA.length
}
