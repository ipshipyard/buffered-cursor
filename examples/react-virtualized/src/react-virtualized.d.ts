declare module 'react-virtualized' {
  import { ComponentType, ReactNode } from 'react'

  export interface AutoSizerProps {
    children: (size: { height: number; width: number }) => ReactNode
    className?: string
    style?: React.CSSProperties
  }

  export interface ListProps {
    height: number
    width: number
    rowCount: number
    rowHeight: number | ((params: { index: number }) => number)
    rowRenderer: (params: { index: number; key: string; style: React.CSSProperties }) => ReactNode
    onScroll?: (params: { clientHeight: number; scrollHeight: number; scrollTop: number }) => void
    overscanRowCount?: number
    className?: string
    style?: React.CSSProperties
  }

  export const AutoSizer: ComponentType<AutoSizerProps>
  export const List: ComponentType<ListProps>
}
