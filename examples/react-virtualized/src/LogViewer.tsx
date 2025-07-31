import { useState, useEffect, useCallback } from 'react'
import { AutoSizer, List } from 'react-virtualized'
import { logCursor, getCurrentLogs, getTotalCount } from './log-cursor.js'
import type { LogEntry } from './types.js'

const ROW_HEIGHT = 60

interface LogRowProps {
  log: LogEntry
  style: React.CSSProperties
}

const LogRow: React.FC<LogRowProps> = ({ log, style }) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'DEBUG': return '#6c757d'
      case 'INFO': return '#17a2b8'
      case 'WARN': return '#ffc107'
      case 'ERROR': return '#dc3545'
      case 'FATAL': return '#721c24'
      default: return '#6c757d'
    }
  }

  return (
    <div style={style} className="log-row">
      <div className="log-content">
        <div className="log-header">
          <span
            className="log-level"
            style={{ color: getLevelColor(log.level) }}
          >
            {log.level}
          </span>
          <span className="log-timestamp">
            {new Date(log.timestamp).toLocaleString()}
          </span>
          <span className="log-subsystem">
            {log.subsystem}
          </span>
        </div>
        <div className="log-message">
          {log.message}
        </div>
      </div>
    </div>
  )
}

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<Array<{ key: number; value: LogEntry }>>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      await logCursor.bootstrap()
      setLogs(getCurrentLogs())
      setTotalCount(getTotalCount())
      setLoading(false)
    }
    initializeData()
  }, [])

  // Handle scroll events to load more data
  const handleScroll = useCallback(async ({ clientHeight, scrollHeight, scrollTop }: any) => {
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight)

    // Load more data when scrolling near the top or bottom
    if (scrollPercentage < 0.1 && !logCursor.isAtStart()) {
      setLoading(true)
      await logCursor.loadBefore()
      setLogs(getCurrentLogs())
      setLoading(false)
    } else if (scrollPercentage > 0.9 && !logCursor.isAtEnd()) {
      setLoading(true)
      await logCursor.loadAfter()
      setLogs(getCurrentLogs())
      setLoading(false)
    }
  }, [])

  const rowRenderer = useCallback(({ index, key, style }: any) => {
    const log = logs[index]
    if (!log) {
      return (
        <div key={key} style={style} className="log-row loading">
          <div className="log-content">
            <div className="log-message">Loading...</div>
          </div>
        </div>
      )
    }
    return <LogRow key={key} log={log.value} style={style} />
  }, [logs])

  if (loading && logs.length === 0) {
    return (
      <div className="log-viewer">
        <div className="loading-container">
          <div>Loading logs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="log-viewer">
      <div className="log-header">
        <h2>Log Viewer</h2>
        <div className="log-stats">
          Showing {logs.length} of {totalCount} logs
          {loading && <span className="loading-indicator"> (Loading...)</span>}
        </div>
      </div>

      <div className="log-list-container">
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              height={height}
              width={width}
              rowCount={logs.length}
              rowHeight={ROW_HEIGHT}
              rowRenderer={rowRenderer}
              onScroll={handleScroll}
              overscanRowCount={5}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  )
}
