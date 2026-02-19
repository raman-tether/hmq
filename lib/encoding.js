'use strict'

const b4a = require('b4a')
const schema = require('../spec/hyperschema')

const TYPE_MESSAGE = 0
const TYPE_ACK = 1
const TYPE_ADD_WRITER = 2
const TYPE_REMOVE_WRITER = 3
const TYPE_REJ = 4
const TYPE_REGISTER_CONSUMER = 5

exports.TYPE_MESSAGE = TYPE_MESSAGE
exports.TYPE_ACK = TYPE_ACK
exports.TYPE_ADD_WRITER = TYPE_ADD_WRITER
exports.TYPE_REMOVE_WRITER = TYPE_REMOVE_WRITER
exports.TYPE_REJ = TYPE_REJ
exports.TYPE_REGISTER_CONSUMER = TYPE_REGISTER_CONSUMER

const assertKey = (key, name) => {
  if (!b4a.isBuffer(key)) throw new TypeError(name + ' must be a Buffer')
  if (key.byteLength !== 32) throw new TypeError(name + ' must be 32 bytes')
}

function prefixType (type, payload) {
  const out = b4a.allocUnsafe(1 + payload.byteLength)
  out[0] = type
  b4a.copy(payload, out, 1)
  return out
}

exports.encodeMessage = function encodeMessage (msg) {
  return prefixType(TYPE_MESSAGE, schema.encode('@hypermq/message', msg))
}

exports.encodeAck = function encodeAck (key, ack) {
  assertKey(key, 'ack key')
  return prefixType(TYPE_ACK, schema.encode('@hypermq/ack-entry', { key, ack }))
}

exports.encodeAddWriter = function encodeAddWriter (key) {
  assertKey(key, 'writer key')
  return prefixType(TYPE_ADD_WRITER, key)
}

exports.encodeRemoveWriter = function encodeRemoveWriter (key) {
  assertKey(key, 'writer key')
  return prefixType(TYPE_REMOVE_WRITER, key)
}

exports.encodeRej = function encodeRej (key, consumer) {
  assertKey(key, 'rej key')
  assertKey(consumer, 'rej consumer')
  return prefixType(TYPE_REJ, schema.encode('@hypermq/rej-entry', { key, consumer }))
}

exports.encodeRegisterConsumer = function encodeRegisterConsumer (key) {
  assertKey(key, 'consumer key')
  return prefixType(TYPE_REGISTER_CONSUMER, schema.encode('@hypermq/register-consumer', { key }))
}

exports.decode = function decode (buf) {
  if (!b4a.isBuffer(buf)) throw new TypeError('Entry must be a Buffer')
  if (buf.byteLength < 1) throw new Error('Entry buffer is empty')

  const type = buf[0]
  const payload = buf.subarray(1)

  switch (type) {
    case TYPE_MESSAGE:
      return { type: TYPE_MESSAGE, ...schema.decode('@hypermq/message', payload) }
    case TYPE_ACK: {
      const entry = schema.decode('@hypermq/ack-entry', payload)
      return { type: TYPE_ACK, key: entry.key, ack: entry.ack }
    }
    case TYPE_ADD_WRITER: {
      if (payload.byteLength !== 32) throw new Error('Invalid add-writer entry payload size')
      return { type: TYPE_ADD_WRITER, key: payload }
    }
    case TYPE_REMOVE_WRITER: {
      if (payload.byteLength !== 32) throw new Error('Invalid remove-writer entry payload size')
      return { type: TYPE_REMOVE_WRITER, key: payload }
    }
    case TYPE_REJ: {
      const entry = schema.decode('@hypermq/rej-entry', payload)
      return { type: TYPE_REJ, key: entry.key, consumer: entry.consumer }
    }
    case TYPE_REGISTER_CONSUMER: {
      const entry = schema.decode('@hypermq/register-consumer', payload)
      return { type: TYPE_REGISTER_CONSUMER, key: entry.key }
    }
    default:
      throw new Error('Unknown entry type: ' + type)
  }
}

exports.encodeViewRecord = function encodeViewRecord (msg) {
  return schema.encode('@hypermq/message', msg)
}

exports.decodeViewRecord = function decodeViewRecord (buf) {
  return schema.decode('@hypermq/message', buf)
}

exports.toBuffer = function toBuffer (data) {
  if (b4a.isBuffer(data)) return data
  if (typeof data === 'string') return b4a.from(data)
  try {
    return b4a.from(JSON.stringify(data))
  } catch (err) {
    throw new TypeError('data must be a Buffer, string, or JSON-serializable value')
  }
}
