import { useState, useEffect, useCallback, useRef } from 'react'
import { AutoSizer, List, InfiniteLoader } from 'react-virtualized'
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
        <div className="log-message" style={{ color: getLevelColor(log.level) }}>
          {log.message}
        </div>
      </div>
    </div>
  )
}

export const LogViewer: React.FC = () => {
  const [displayEntries, setDisplayEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [windowStart, setWindowStart] = useState(logCursor.getWindowStart())

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
      console.log('Initial data loaded:', window)

      // Extract just the values for display
      const entries = window.map(e => e.value)
      setDisplayEntries(entries)

      // Bootstrap loads from the beginning, so window starts at 0
      setWindowStart(logCursor.getWindowStart())

      console.log('Window start set to:', 0)
      console.log('Display entries:', entries.length)
      console.log('Logical window:', 0, 'to', entries.length - 1)

      setLoading(false)
    }
    initializeData()
  }, [])

  // Debug effect to monitor windowStart changes
  useEffect(() => {
    console.log('windowStart changed to:', windowStart)
  }, [windowStart])

  // Check if a row is loaded

  const isRowLoaded = useCallback(({ index }: { index: number }) => {
    // Check if the requested index is within our current window
    const isLoaded = index >= logCursor.getWindowStart() && index < logCursor.getWindowEnd()
    // const isLoaded = logCursor.isKeyLoaded(index)
    console.log(`isRowLoaded(${index}): windowStart=${windowStart}, displayEntries.length=${displayEntries.length}, isLoaded=${isLoaded}`)
    return isLoaded
  }, [displayEntries.length, windowStart])

  // Load more rows when needed
  const loadingRef = useRef(false);

  const loadMoreRows = useCallback(async ({ startIndex, stopIndex }: { startIndex: number, stopIndex: number }) => {
    if (!logCursor) return;
    if (loadingRef.current) return;
    loadingRef.current = true;

    await logCursor.ensureRange(startIndex, stopIndex)
    const newWindow = logCursor.toArray().map(e => e.value);
    setDisplayEntries(newWindow);
    setWindowStart(logCursor.getWindowStart())

    loadingRef.current = false;
  }, [logCursor]);

  const rowRenderer = useCallback(({ index, key, style }: any) => {
    // Convert the virtual index to our local array index
    const localIndex = index - windowStart
    const entry = displayEntries[localIndex]

    // console.log(`Row ${index}: localIndex=${localIndex}, entry=`, entry, 'windowStart=', windowStart, 'displayEntries.length=', displayEntries.length)

    if (!entry) {
      return (
        <div key={key} style={style} className="log-row loading">
          <div className="log-content">
            <div className="log-message">Loading... (Index: {index})</div>
          </div>
        </div>
      )
    }
    return <LogRow key={key} log={entry} style={style} />
  }, [displayEntries, windowStart])

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
          Showing {displayEntries.length} of {totalCount} logs (Window: {windowStart} - {windowStart + displayEntries.length - 1})
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
              threshold={5}
            >
              {({ onRowsRendered, registerChild }) => (
                <List
                  ref={registerChild}
                  height={height}
                  width={width}
                  rowCount={totalCount}
                  rowHeight={ROW_HEIGHT}
                  rowRenderer={rowRenderer}
                  onRowsRendered={onRowsRendered}
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
