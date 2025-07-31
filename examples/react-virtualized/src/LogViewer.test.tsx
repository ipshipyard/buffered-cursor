import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { LogViewer } from './LogViewer'
import { logCursor, getCurrentLogs, getTotalCount } from './log-cursor.js'
import { generateLogEntries } from './data-generator.js'

// Mock the buffered cursor
jest.mock('./log-cursor', () => ({
  logCursor: {
    bootstrap: jest.fn(),
    loadBefore: jest.fn(),
    loadAfter: jest.fn(),
    isAtStart: jest.fn(),
    isAtEnd: jest.fn(),
    toArray: jest.fn(),
  },
  getCurrentLogs: jest.fn(),
  getTotalCount: jest.fn(),
}))

// Mock react-virtualized
let capturedLoadMoreRows: any = null
let capturedIsRowLoaded: any = null

jest.mock('react-virtualized', () => ({
  AutoSizer: ({ children }: any) => children({ height: 600, width: 800 }),
  List: ({ rowRenderer, rowCount, onRowsRendered }: any) => {
    // Simulate rendering a few rows
    const rows = []
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      rows.push(rowRenderer({ index: i, key: `row-${i}`, style: {} }))
    }
    return <div data-testid="virtual-list">{rows}</div>
  },
  InfiniteLoader: ({ children, isRowLoaded, loadMoreRows, rowCount }: any) => {
    // Capture the functions for testing
    capturedLoadMoreRows = loadMoreRows
    capturedIsRowLoaded = isRowLoaded

    // Simulate the InfiniteLoader behavior
    const onRowsRendered = ({ startIndex, stopIndex }: any) => {
      // Check if we need to load more rows
      for (let i = startIndex; i <= stopIndex; i++) {
        if (!isRowLoaded({ index: i })) {
          loadMoreRows({ startIndex, stopIndex })
          break
        }
      }
    }

    return children({
      onRowsRendered,
      registerChild: jest.fn(),
    })
  },
}))

describe('LogViewer', () => {
  const mockLogs = generateLogEntries(100)

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset captured functions
    capturedLoadMoreRows = null
    capturedIsRowLoaded = null

    // Setup default mocks
    ;(getTotalCount as jest.Mock).mockReturnValue(100)
    ;(getCurrentLogs as jest.Mock).mockReturnValue(
      mockLogs.slice(0, 20).map((log, index) => ({ key: index, value: log }))
    )
    ;(logCursor.bootstrap as jest.Mock).mockResolvedValue(undefined)
    ;(logCursor.isAtStart as jest.Mock).mockReturnValue(false)
    ;(logCursor.isAtEnd as jest.Mock).mockReturnValue(false)
    ;(logCursor.toArray as jest.Mock).mockReturnValue(
      mockLogs.slice(0, 20).map((log, index) => ({ key: index, value: log }))
    )
  })

  it('should render initial logs correctly', async () => {
    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
      expect(screen.getByText(/Showing 20 of 100 logs/)).toBeInTheDocument()
    })
  })

  it('should bootstrap cursor on mount', async () => {
    render(<LogViewer />)

    await waitFor(() => {
      expect(logCursor.bootstrap).toHaveBeenCalledTimes(1)
    })
  })

  it('should load more rows when scrolling down', async () => {
    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
    })

    // Simulate InfiniteLoader's onRowsRendered being called with indices beyond current window
    act(() => {
      // Directly call the captured loadMoreRows function with indices beyond current window
      if (capturedLoadMoreRows) {
        capturedLoadMoreRows({ startIndex: 20, stopIndex: 30 })
      }
    })

    await waitFor(() => {
      expect(logCursor.loadAfter).toHaveBeenCalled()
    })
  })

  it('should load more rows when scrolling up', async () => {
    // Setup cursor to have data starting from middle
    ;(getCurrentLogs as jest.Mock).mockReturnValue(
      mockLogs.slice(50, 70).map((log, index) => ({ key: index + 50, value: log }))
    )
    ;(logCursor.toArray as jest.Mock).mockReturnValue(
      mockLogs.slice(50, 70).map((log, index) => ({ key: index + 50, value: log }))
    )

    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
    })

    // Simulate InfiniteLoader's onRowsRendered being called with indices before current window
    act(() => {
      // Directly call the captured loadMoreRows function with indices before current window
      if (capturedLoadMoreRows) {
        capturedLoadMoreRows({ startIndex: 0, stopIndex: 10 })
      }
    })

    await waitFor(() => {
      expect(logCursor.loadBefore).toHaveBeenCalled()
    })
  })

  it('should not load more when at the end', async () => {
    ;(logCursor.isAtEnd as jest.Mock).mockReturnValue(true)

    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
    })

    // Simulate InfiniteLoader's onRowsRendered being called with indices beyond current window
    act(() => {
      if (capturedLoadMoreRows) {
        capturedLoadMoreRows({ startIndex: 20, stopIndex: 30 })
      }
    })

    await waitFor(() => {
      expect(logCursor.loadAfter).not.toHaveBeenCalled()
    })
  })

  it('should not load more when at the start', async () => {
    ;(logCursor.isAtStart as jest.Mock).mockReturnValue(true)

    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
    })

    // Simulate InfiniteLoader's onRowsRendered being called with indices before current window
    act(() => {
      if (capturedLoadMoreRows) {
        capturedLoadMoreRows({ startIndex: 0, stopIndex: 10 })
      }
    })

    await waitFor(() => {
      expect(logCursor.loadBefore).not.toHaveBeenCalled()
    })
  })

  it('should update window start correctly when loading before', async () => {
    // Setup initial state
    ;(getCurrentLogs as jest.Mock).mockReturnValue(
      mockLogs.slice(20, 40).map((log, index) => ({ key: index + 20, value: log }))
    )
    ;(logCursor.toArray as jest.Mock).mockReturnValue(
      mockLogs.slice(20, 40).map((log, index) => ({ key: index + 20, value: log }))
    )

    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
    })

    // Mock loadBefore to return more data
    ;(logCursor.toArray as jest.Mock).mockReturnValue(
      mockLogs.slice(10, 40).map((log, index) => ({ key: index + 10, value: log }))
    )

    // Simulate InfiniteLoader's onRowsRendered being called with indices before current window
    act(() => {
      if (capturedLoadMoreRows) {
        capturedLoadMoreRows({ startIndex: 0, stopIndex: 10 })
      }
    })

    await waitFor(() => {
      expect(logCursor.loadBefore).toHaveBeenCalled()
    })
  })

  it('should handle loading state correctly', async () => {
    // Mock a slow loadAfter
    ;(logCursor.loadAfter as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
    })

    // Simulate InfiniteLoader's onRowsRendered being called with indices beyond current window
    act(() => {
      if (capturedLoadMoreRows) {
        capturedLoadMoreRows({ startIndex: 20, stopIndex: 30 })
      }
    })

    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByText(/Loading/)).toBeInTheDocument()
    })
  })

  it('should prevent concurrent loading operations', async () => {
    // Mock a slow loadAfter
    ;(logCursor.loadAfter as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<LogViewer />)

    await waitFor(() => {
      expect(screen.getByText('Log Viewer')).toBeInTheDocument()
    })

    // Trigger multiple loadMoreRows calls rapidly
    act(() => {
      if (capturedLoadMoreRows) {
        capturedLoadMoreRows({ startIndex: 20, stopIndex: 30 })
        capturedLoadMoreRows({ startIndex: 25, stopIndex: 35 })
        capturedLoadMoreRows({ startIndex: 30, stopIndex: 40 })
      }
    })

    // Should only call loadAfter once due to loading guard
    await waitFor(() => {
      expect(logCursor.loadAfter).toHaveBeenCalledTimes(1)
    })
  })
})
