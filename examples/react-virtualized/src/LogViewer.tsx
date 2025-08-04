import { useState, useEffect, useCallback, useRef } from 'react'
import { AutoSizer, List, InfiniteLoader } from 'react-virtualized'
import { logCursor, getCurrentLogs, getTotalCount } from './log-cursor.js'
import type { LogEntry } from './types.js'

const ROW_HEIGHT = 60

interface LogRowProps {
  log: LogEntry
  style: React.CSSProperties
  index: number
}

const LogRow: React.FC<LogRowProps> = ({ log, style, index }) => {
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
          <span className="log-timestamp">
            {new Date(log.timestamp).toLocaleString()}
          </span>
          <span
            className="log-level"
            style={{ color: getLevelColor(log.level) }}
          >
            {log.level}
          </span>
          <span className="log-subsystem">
            {log.subsystem}
          </span>
          <span className="log-message">
            {log.id}: {log.message} - index={index}
          </span>
        </div>
      </div>
    </div>
  )
}

export const LogViewer: React.FC = () => {
  const [displayEntries, setDisplayEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [visibleStopIndex, setVisibleStopIndex] = useState(0)

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)

      // Get total count first
      const total = getTotalCount()
      setTotalCount(total)

      // Bootstrap cursor (loads latest items)
      await logCursor.bootstrap()

      const window = getCurrentLogs()

      // Extract just the values for display
      const entries = window.map(e => e.value)
      setDisplayEntries(entries)

      setLoading(false)
    }
    initializeData()
  }, [])

  const isRowLoaded = useCallback(({ index }: { index: number }) => {
    return logCursor.getItem(index) != null
  }, [])

  const loadingRef = useRef(false);

  const loadMoreRows = useCallback(async ({ startIndex, stopIndex }: { startIndex: number, stopIndex: number }) => {
    if (!logCursor) return;
    if (loadingRef.current) return;
    loadingRef.current = true;

    await logCursor.ensureRange(startIndex, stopIndex)
    const newWindow = getCurrentLogs().map(e => e.value)
    setDisplayEntries(newWindow)

    loadingRef.current = false;
  }, [logCursor]);

  const rowRenderer = useCallback(({ index, key, style }: any) => {
    const entry = logCursor.getItem(index)?.value

    if (entry == null) {
      return (
        <div key={key} style={style} className="log-row loading">
          <div className="log-content">
            <div className="log-message">Loading... (Index: {index})</div>
          </div>
        </div>
      )
    }
    return <LogRow key={key} index={index} log={entry} style={style} />
  }, [displayEntries])

  if (loading && displayEntries.length === 0) {
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
          Showing {visibleStartIndex} - {visibleStopIndex} of {totalCount} logs (Window: {displayEntries[0]?.id} - {displayEntries[displayEntries.length - 1]?.id})
          {loading && <span className="loading-indicator"> (Loading...)</span>}
        </div>
      </div>

      <div className="log-list-container">
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <InfiniteLoader
              isRowLoaded={isRowLoaded}
              loadMoreRows={loadMoreRows}
              rowCount={totalCount}
              threshold={10}
            >
              {({ onRowsRendered, registerChild }) => (
                <List
                  ref={registerChild}
                  height={height}
                  width={width}
                  rowCount={totalCount}
                  rowHeight={ROW_HEIGHT}
                  rowRenderer={rowRenderer}
                  onRowsRendered={({ startIndex, stopIndex }) => {
                    onRowsRendered({ startIndex, stopIndex })
                    setVisibleStartIndex(startIndex)
                    setVisibleStopIndex(stopIndex)
                  }}
                  overscanRowCount={5}
                />
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </div>
    </div>
  )
}
