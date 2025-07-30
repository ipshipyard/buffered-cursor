# buffered-cursor

[![codecov](https://img.shields.io/codecov/c/github/ipshipyard/buffered-cursor.svg?style=flat-square)](https://codecov.io/gh/ipshipyard/buffered-cursor)
[![CI](https://img.shields.io/github/actions/workflow/status/ipshipyard/buffered-cursor/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/ipshipyard/buffered-cursor/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> A generic, bidirectional sliding-window buffer and cursor abstraction for paginated data sources (indexes, timestamps, offsets, …).

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

`buffered-cursor` is a library for efficient paging of large datasets.

It provides a generic cursor interface that can be used to paginate over
any data source that can be represented as a sequence of items.

It also provides a set of strategies for different data types, such as
timestamps and indexes.

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  // return myDB.readPage(page, size)
  return []
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

const logStore = {
  getLogsBefore: (ts: Date, limit: number) => ([]),
  getLogsAfter: (ts: Date, limit: number) => ([]),
}

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: Date, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: Date, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date())
console.log("Window:", cursor.toArray())
```

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  // return myDB.readPage(page, size)
  return []
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

const logStore = {
  getLogsBefore: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
  getLogsAfter: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
}

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: string, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: string, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date().toISOString())
console.log("Window:", cursor.toArray())
```

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  // return myDB.readPage(page, size)
  return []
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

const logStore = {
  getLogsBefore: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
  getLogsAfter: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
}

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: string, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: string, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date().toISOString())
console.log("Window:", cursor.toArray())
```

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  // return myDB.readPage(page, size)
  return []
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

const logStore = {
  getLogsBefore: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
  getLogsAfter: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
}

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: string, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: string, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date().toISOString())
console.log("Window:", cursor.toArray())
```

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  // return myDB.readPage(page, size)
  return []
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

const logStore = {
  getLogsBefore: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
  getLogsAfter: (ts: Date, limit: number) => Promise<Array<{ ts: Date; value: LogEntry }>>,
}

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: string, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: string, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date().toISOString())
console.log("Window:", cursor.toArray())
```

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  // return myDB.readPage(page, size)
  return []
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: string, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: string, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date().toISOString())
console.log("Window:", cursor.toArray())
```

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  // return myDB.readPage(page, size)
  return []
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: string, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: string, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date().toISOString())
console.log("Window:", cursor.toArray())
```

# Quick Start

## Example - Index‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { indexStrategy } from "buffered-cursor/strategies"

// your async page loader: (pageIndex, pageSize) => Promise<T[]>
const fetchPage = async (page: number, size: number) => {
  // e.g. read from IndexedDB, network, etc.
  return myDB.readPage(page, size)
}

const cursor = new BufferedCursor<string, number>({
  strategy: indexStrategy(fetchPage),
  pageSize: 100,
  retentionPages: 2,
})

await cursor.bootstrap()        // load first page
console.log(cursor.toArray())  // in‑memory window

await cursor.loadAfter()       // load next page
await cursor.loadBefore()      // load previous page
```

## Example - Timestamp‑based paging

```ts
import { BufferedCursor } from "buffered-cursor"
import { timestampStrategy } from "buffered-cursor/strategies"

// your async loaders:
// – items before ts (newest‑first), items after ts (oldest‑first)
const fetchBefore = (ts: string, limit: number) =>
  logStore.getLogsBefore(ts, limit)
const fetchAfter  = (ts: string, limit: number) =>
  logStore.getLogsAfter(ts, limit)

const cursor = new BufferedCursor<LogEntry, string>({
  strategy: timestampStrategy(fetchBefore, fetchAfter),
  pageSize: 50,
})

await cursor.bootstrap(new Date().toISOString())
console.log("Window:", cursor.toArray())
```

A **generic**, bidirectional sliding‑window buffer and cursor abstraction for **paginated data sources** (indexes, timestamps, offsets, …).

Keep only a bounded window of items in memory while seamlessly paging “before” or “after” any cursor key. Perfect for:

- **Virtualized UIs** (React‑Window, React‑Virtualized)
- **CLI tailing** (`tail -f`‑style tools)
- **Stream analytics** (moving averages, quantiles)
- **Event sourcing** & **message‑queue** consumers
- **Time‑series pipelines**, **packet captures**, **backup replication**, and more

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
- [Integration](#integration-with-react-window--react-virtualized)
- [Testing](#testing)
- [Get involved](#get-involved)
- [Contribute](#contribute)
- [License](#license)

# 📦 Install

```bash
npm install buffered-cursor
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `BufferedCursor` in the global namespace.

```html
<script src="https://unpkg.com/buffered-cursor/dist/index.min.js"></script>
```

# 🔍 API

## `new BufferedCursor<T, K>(opts)`

- `opts.strategy: CursorStrategy<T, K>` — pluggable key/paging strategy
- `opts.pageSize: number` — items per batch
- `opts.retentionPages?: number` — how many pages to keep in memory (default: 2)

## `.bootstrap(initialKey?) : Promise<void>`

Load the initial batch around the initialKey (or page 0).

- For index‑strategy, `initialKey` is ignored (defaults to page 0).
- For timestamp‑strategy, you can pass a `Date` to center around.

## `.loadBefore(): Promise<void>`

Page "backwards" (older items) into the buffer.

## `.loadAfter(): Promise<void>`

Page "forwards" (newer items) into the buffer.

## `.toArray(): Array<{ key: K; value: T }>`

Get the current in‑memory sliding window.

## `.isAtTop(): boolean` / `.isAtBottom(): boolean`

Detect if you’ve reached the very beginning or end of the data source.

## ⚙️ Integration with React‑Window / React‑Virtualized

Use `isAtTop()`/`isAtBottom()` to adjust your `rowCount`, and call `.loadBefore()`/`.loadAfter()` in your `loadMoreRows` or `loadMoreItems` hooks. See [examples/](./examples) for fully working demos.

## ✅ Testing

- 100 % unit‑test coverage out of the box
- Written in TypeScript, uses Jest + ts‑jest

```bash
npm test
```

## 👫 Get involved

- Pick up one of the [issues](https://github.com/ipshipyard/buffered-cursor/issues).
- Come chat in Filecoin Slack #ip-js.  (Yes, we should bridge this to other chat environments.  Please comment [here](https://github.com/ipfs/helia/issues/33) if you'd like this.)

## 🤲 Contribute

Contributions welcome! Please check out [the issues](https://github.com/ipshipyard/buffered-cursor/issues).

Also see our [contributing document](https://github.com/ipfs/community/blob/master/CONTRIBUTING_JS.md) for more information on how we work, and about contributing in general.

Please be aware that all interactions related to this repo are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.

[![](https://cdn.rawgit.com/jbenet/contribute-ipfs-gif/master/img/contribute.gif)](https://github.com/ipfs/community/blob/master/CONTRIBUTING.md)

# 🪪 License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/ipshipyard/buffered-cursor/blob/main/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/ipshipyard/buffered-cursor/blob/main/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/ipshipyard/buffered-cursor/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/ipshipyard/buffered-cursor/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
