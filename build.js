'use strict'

const Hyperschema = require('hyperschema')

const schema = Hyperschema.from('./spec/hyperschema')
const mq = schema.namespace('hypermq')

mq.register({
  name: 'ack',
  compact: true,
  fields: [
    {
      name: 'consumer',
      type: 'fixed32',
      required: true
    }
  ]
})

mq.register({
  name: 'ack-entry',
  compact: true,
  fields: [
    {
      name: 'key',
      type: 'fixed32',
      required: true
    },
    {
      name: 'ack',
      type: '@hypermq/ack',
      required: true
    }
  ]
})

mq.register({
  name: 'message',
  fields: [
    {
      name: 'topic',
      type: 'string',
      required: true
    },
    {
      name: 'data',
      type: 'buffer',
      required: true
    },
    {
      name: 'timestamp',
      type: 'uint',
      required: true
    },
    {
      name: 'key',
      type: 'fixed32',
      required: true
    },
    {
      name: 'ack',
      type: '@hypermq/ack'
    },
    {
      name: 'concurrent',
      type: 'uint'
    }
  ]
})

mq.register({
  name: 'rej-entry',
  compact: true,
  fields: [
    {
      name: 'key',
      type: 'fixed32',
      required: true
    },
    {
      name: 'consumer',
      type: 'fixed32',
      required: true
    }
  ]
})

mq.register({
  name: 'register-consumer',
  compact: true,
  fields: [
    {
      name: 'key',
      type: 'fixed32',
      required: true
    }
  ]
})

Hyperschema.toDisk(schema)
