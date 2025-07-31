import { BufferedCursor } from 'buffered-cursor'
import { indexStrategy } from 'buffered-cursor/strategies'
import type { LogEntry } from './types.js'
import { MOCK_DATA } from './data-generator.js'

// Window size that matches react-virtualized
const WINDOW_SIZE = 20

// Create a fetch function that simulates pagination from our mock data
const fetchLogPage = async (page: number, size: number): Promise<LogEntry[]> => {
  // Simulate network delay
  // await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50))

  const startIndex = page * size
  const endIndex = Math.min(startIndex + size, MOCK_DATA.length)

  if (startIndex >= MOCK_DATA.length) {
    return []
  }

  return MOCK_DATA.slice(startIndex, endIndex)
}

// Create the cursor strategy
const logCursorStrategy = indexStrategy(fetchLogPage, 0)

// Create the buffered cursor
export const logCursor = new BufferedCursor<LogEntry, number>({
  strategy: logCursorStrategy,
  pageSize: WINDOW_SIZE,
  retentionPages: 3 // Keep 3 pages in memory (60 items total)
})

// Helper to get current data as array
export function getCurrentLogs(): Array<{ key: number; value: LogEntry }> {
  return logCursor.toArray()
}

// Helper to get total count
export function getTotalCount(): number {
  return MOCK_DATA.length
}
