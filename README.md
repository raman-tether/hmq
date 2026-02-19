# HyperMQ

Simple message queue backed by [Autobee](https://github.com/holepunchto/autobee).

HyperMQ is a peer-to-peer message queue that uses [Hyperswarm](https://github.com/holepunchto/hyperswarm) for discovery and Autobee for persistent, replicated storage. It supports **pub/sub** (fan-out) and **work queue** (competing consumer) messaging patterns.

## Install

```
npm install hypermq
```

You will also need [corestore](https://github.com/holepunchto/corestore) for storage:

```
npm install corestore
```

## Quick Start

```js
const Corestore = require('corestore')
const HyperMQ = require('hypermq')
const b4a = require('b4a')

const store = new Corestore('./my-storage')

const mq = new HyperMQ(store)
await mq.ready()

mq.subscribe('greetings', (msg) => {
  console.log(b4a.toString(msg.data)) // 'hello world'
})

await mq.publish('greetings', 'hello world')

await mq.close()
```

## API

### `const mq = new HyperMQ(corestore, key?, opts?)`

Create a new HyperMQ instance.

- `corestore` - a [Corestore](https://github.com/holepunchto/corestore) instance
- `key` - optional Buffer or hex string to join an existing queue (omit to create a new one)
- `opts` - optional configuration object

| Option | Type | Default | Description |
|---|---|---|---|
| `producer` | boolean | `false` | Producer-only mode. Will not consume work queue messages. |
| `concurrent` | number | `0` | Default concurrent workers for published messages. `0` means pub/sub mode. |
| `timeout` | number | `5000` | Timeout (ms) for work queue claim evaluation. |
| `keyPair` | object | `null` | Custom key pair for this instance. |
| `swarm` | Hyperswarm | `null` | Custom Hyperswarm instance. Creates its own if not provided. |
| `maxOrphanAcks` | number | `10000` | Maximum orphan acks to keep in memory. |

### `await mq.ready()`

Ensure the instance is initialized. Called automatically by `publish`, `flush`, `addWriter`, and `removeWriter`.

### `const key = await mq.publish(topic, data, opts?)`

Publish a message.

- `topic` - non-empty string
- `data` - payload (string, Buffer, object, array, number, boolean, or null)
- `opts.concurrent` - override the instance-level `concurrent` setting for this message

Returns a 32-byte Buffer key identifying the message.

### `mq.subscribe(topic, callback)`

Subscribe to messages on a topic.

The callback receives a message object:

```js
{
  topic,      // string
  data,       // Buffer
  key,        // Buffer (32 bytes)
  concurrent  // number
}
```

For work queue messages (`concurrent > 0`), the ack is sent in parallel to the callback execution.

### `mq.unsubscribe(topic, callback?)`

Remove a subscription. If `callback` is omitted, all subscribers for the topic are removed.

### `const ack = await mq.waitAck(key?)`

Wait for an acknowledgment.

- `key` - 32-byte Buffer from `publish()`. If omitted, waits for the next ack on any message.

Returns `{ consumer }` where `consumer` is a Buffer identifying the acknowledging peer, or `null` if the instance closes before an ack arrives.

### `await mq.addWriter(key)`

Authorize a remote peer to write to the queue.

- `key` - 32-byte Buffer or hex string (the remote peer's writer key)

### `await mq.removeWriter(key)`

Revoke write access for a peer.

### `await mq.flush()`

Flush all pending operations to the underlying Autobee.

### `await mq.close()`

Close the instance and release all resources. Pending `waitAck` promises resolve to `null`.

### Properties

| Property | Type | Description |
|---|---|---|
| `mq.key` | Buffer | 32-byte queue key (available after `ready()`) |
| `mq.discoveryKey` | Buffer | Discovery key used for Hyperswarm (available after `ready()`) |
| `mq.writable` | boolean | Whether this instance can write to the queue |

### Events

#### `mq.on('warning', err)`

Emitted on non-fatal errors (malformed entries, failed callbacks, etc.).

## Messaging Patterns

### Pub/Sub

When `concurrent` is `0` (the default), messages are delivered to **all** subscribers on a topic. This is a fan-out broadcast pattern.

```js
mq.subscribe('news', (msg) => {
  console.log('Subscriber A:', b4a.toString(msg.data))
})

mq.subscribe('news', (msg) => {
  console.log('Subscriber B:', b4a.toString(msg.data))
})

await mq.publish('news', 'breaking story')
// Both subscribers receive the message
```

### Work Queue

When `concurrent` is greater than `0`, messages are delivered to a **single** consumer at a time. Consumers are selected by XOR distance from the message key, with timeout-based fallback. The ack is sent automatically after the subscriber callback completes.

```js
mq.subscribe('jobs', async (msg) => {
  await processTask(b4a.toString(msg.data))
  // Ack is sent after this callback resolves
})

const key = await mq.publish('jobs', 'resize-image-42', { concurrent: 1 })
const ack = await mq.waitAck(key)
console.log('Processed by:', b4a.toString(ack.consumer, 'hex'))
```

## Data Types

`publish()` accepts strings, Buffers, objects, arrays, numbers, booleans, and `null`. Non-Buffer values are JSON-encoded before storage. The subscriber always receives `msg.data` as a Buffer:

```js
await mq.publish('topic', { hello: 'world' })

mq.subscribe('topic', (msg) => {
  const obj = JSON.parse(b4a.toString(msg.data))
  // { hello: 'world' }
})
```

## License

Apache-2.0
