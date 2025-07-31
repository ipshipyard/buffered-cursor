import { BufferedCursor } from 'buffered-cursor'
import { FetchOptions, indexStrategy } from 'buffered-cursor/strategies'
import type { LogEntry } from './types.js'
import { MOCK_DATA } from './data-generator.js'

// Window size that matches react-virtualized
const WINDOW_SIZE = 20

// Create a fetch function that simulates pagination from our mock data
const fetchLogPage = async (startIndex: number, endIndex: number, _options: FetchOptions<number>): Promise<LogEntry[]> => {
  // Simulate network delay
  // await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50))

  // const startIndex = page * size
  // const endIndex = Math.min(startIndex + size, MOCK_DATA.length)

  console.log(`fetchLogPage: size=${endIndex - startIndex + 1}, startIndex=${startIndex}, endIndex=${endIndex}`)

  if (startIndex >= MOCK_DATA.length) {
    return []
  }

  const result = MOCK_DATA.slice(startIndex, endIndex)
  console.log(`fetchLogPage: returning ${result.length} items`)
  console.log(`fetchLogPage: first item id: ${result[0]?.id}, last item id: ${result[result.length - 1]?.id}`)
  console.log(`fetchLogPage: first item index: ${startIndex}, last item index: ${endIndex - 1}`)
  return result
}

// Create the cursor strategy - start from the beginning
const logCursorStrategy = indexStrategy(fetchLogPage, 0)

// Create the buffered cursor
export const logCursor = new BufferedCursor<LogEntry, number>({
  strategy: logCursorStrategy,
  pageSize: WINDOW_SIZE,
  retentionPages: 3 // Keep 3 pages in memory (60 items total)
})

// Helper to get current data as array
export function getCurrentLogs(): Array<{ key: number; value: LogEntry }> {
  const logs = logCursor.toArray()
  console.log('getCurrentLogs called, returning:', logs.length, 'items')
  if (logs.length > 0) {
    console.log('First key:', logs[0].key, 'Last key:', logs[logs.length - 1].key)
    console.log('All keys:', logs.map(log => log.key))
  }
  console.log('Cursor state: isAtStart=', logCursor.isAtStart(), 'isAtEnd=', logCursor.isAtEnd())
  return logs
}

// Helper to get total count
export function getTotalCount(): number {
  return MOCK_DATA.length
}
