import type { LogEntry, LogLevel, Subsystem } from './types.js'

const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
const SUBSYSTEMS: Subsystem[] = ['API', 'DATABASE', 'AUTH', 'CACHE', 'QUEUE', 'WORKER']

const MESSAGES = [
  'Request processed successfully',
  'Database connection established',
  'User authentication failed',
  'Cache miss occurred',
  'Queue job completed',
  'Worker started processing',
  'API rate limit exceeded',
  'Database query timeout',
  'Invalid token provided',
  'Cache hit ratio improved',
  'Queue overflow detected',
  'Worker health check passed',
  'Request validation failed',
  'Database transaction rolled back',
  'Session expired',
  'Cache eviction triggered',
  'Queue processing delayed',
  'Worker memory usage high'
]

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

export function generateLogEntry(id: number): LogEntry {
  const now = new Date()
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const timestamp = randomDate(pastDate, now)

  return {
    id: `log-${id}`,
    timestamp: timestamp.toISOString(),
    level: randomChoice(LOG_LEVELS),
    subsystem: randomChoice(SUBSYSTEMS),
    message: randomChoice(MESSAGES)
  }
}

export function generateLogEntries(count: number): LogEntry[] {
  const entries: LogEntry[] = []
  for (let i = 0; i < count; i++) {
    entries.push(generateLogEntry(i))
  }
  return entries
}

// Pre-generate a large dataset for the example
export const MOCK_DATA = generateLogEntries(10000).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
