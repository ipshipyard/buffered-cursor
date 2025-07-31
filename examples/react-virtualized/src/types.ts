export interface LogEntry {
  timestamp: string
  level: string
  subsystem: string
  message: string
  id: number
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

export type Subsystem = 'API' | 'DATABASE' | 'AUTH' | 'CACHE' | 'QUEUE' | 'WORKER'
