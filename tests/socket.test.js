import net from 'node:net'
import dgram from 'node:dgram'
import assert from 'node:assert'
import crypto from 'node:crypto'
import { once } from 'node:events'
import { tryCountErrorHook, assertTry, checkResults } from './_main.js'

/**
 * [x] send message and receive it correctly
 * [x] send 2 messages and receive it correctly
 */

const TIMEOUT_SYMBOL = Symbol('timeout')
const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms, TIMEOUT_SYMBOL))

/**
 * @returns {Promise<Socket & {stop: (() => Promise<void>)}>}
 */
const createUDPClient = async () => {
  const socket = Object.create(
    dgram.createSocket({ type: 'udp4', reuseAddr: true })
  )

  socket.stop = async () => {
    socket.removeAllListeners()
    socket.close()
    await once(socket, 'close')
  }

  return socket
}

/**
 *
 * @param {UDPSocket} UDPSocket
 * @returns {Promise<number>}
 */
async function socketTest (UDPSocket) {
  const alias = '  socket.js: '

  const DEFAULT_PORT = 45007
  const PACKET_SIZE = 300

  /**
   * @param {UDPSocketOptions} options
   * @returns {Promise<UDPSocket & {messages:Buffer[], stop: (() => Promise<void>)}>}
   */
  const createUDPSocket = async ({ port = DEFAULT_PORT, ...opts } = {}) => {
    const socket = new UDPSocket({ ...opts, port })

    const error = await Promise.race([
      once(socket, 'ready'),
      once(socket, 'error')
    ])

    /** @type {Buffer[]} */
    socket.messages = []

    socket.on('data', (buffer) => socket.messages.push(buffer))

    if (error instanceof Error) throw Error

    /** @type {(() => Promise<void>)} */
    socket.stop = async () => {
      socket.removeAllListeners()
      socket.destroy(null)
      await once(socket, 'close')
    }

    return socket
  }

  function checkOnlyMessage ({ caseAlias, message, results, payload }) {
    assertTry(
      () =>
        assert.deepStrictEqual(
          message,
          payload,
          `${caseAlias} received message should be the same as sent one`
        ),
      results
    )
  }

  function checkMessageWithHead ({ caseAlias, message, results, payload }) {
    const { body, size, family, address, port } = message

    checkOnlyMessage({
      caseAlias,
      message: body,
      results,
      payload
    })

    assertTry(
      () =>
        assert.strictEqual(
          size,
          payload.length,
          `${caseAlias} head.size should be the same as sent one's size`
        ),
      results
    )

    assertTry(
      () =>
        assert.strictEqual(
          family === 'IPv4' || family === 'IPv6',
          true,
          `${caseAlias} head.family should be 'IPv4' or 'IPv6'`
        ),
      results
    )

    assertTry(
      () =>
        assert.strictEqual(
          net.isIP(address) !== 0,
          true,
          `${caseAlias} head.address is not valid`
        ),
      results
    )

    assertTry(
      () =>
        assert.strictEqual(
          port >= 0 && port <= 65535,
          true,
          `${caseAlias} head.port is not valid`
        ),
      results
    )
  }

  async function testSocket (port) {
    const caseAlias = `${alias} sending messages ->`
    const results = { fails: [] }

    const client = await createUDPClient()
    const socket = await createUDPSocket({ port })
    const payload1 = crypto.randomBytes(PACKET_SIZE)

    client.send(payload1, port)

    await delay(5)

    assertTry(
      () =>
        assert.strictEqual(
          socket.messages.length,
          1,
          `${caseAlias} 1 message should be received by socket`
        ),
      results
    )

    checkOnlyMessage({
      caseAlias,
      message: socket.messages[0],
      results,
      payload: payload1
    })

    const payload2 = crypto.randomBytes(PACKET_SIZE)

    client.send(payload2, port)

    await delay(5)

    assertTry(
      () =>
        assert.strictEqual(
          socket.messages.length,
          2,
          `${caseAlias} 2 messages should be received by socket`
        ),
      results
    )

    checkOnlyMessage({
      caseAlias,
      message: socket.messages[1],
      results,
      payload: payload2
    })

    await Promise.all([socket.stop(), client.stop()])

    checkResults(results, caseAlias)
  }

  async function testSocketPushMeta (port) {
    const caseAlias = `${alias} sending messages with pushMeta=true ->`
    const results = { fails: [] }

    const client = await createUDPClient()
    const socket = await createUDPSocket({ port, pushMeta: true })
    const payload1 = crypto.randomBytes(PACKET_SIZE)

    client.send(payload1, port)

    await delay(5)

    assertTry(
      () =>
        assert.strictEqual(
          socket.messages.length,
          1,
          `${caseAlias} 1 message should be received by socket`
        ),
      results
    )

    checkMessageWithHead({
      caseAlias,
      message: socket.messages[0],
      results,
      payload: payload1
    })

    const payload2 = crypto.randomBytes(PACKET_SIZE)

    client.send(payload2, port)

    await delay(5)

    assertTry(
      () =>
        assert.strictEqual(
          socket.messages.length,
          2,
          `${caseAlias} 2 messages should be received by socket`
        ),
      results
    )

    checkMessageWithHead({
      caseAlias,
      message: socket.messages[1],
      results,
      payload: payload2
    })

    await Promise.all([socket.stop(), client.stop()])

    checkResults(results, caseAlias)
  }

  const errors = tryCountErrorHook()

  await errors.try(() => testSocket(DEFAULT_PORT))
  await errors.try(() => testSocketPushMeta(DEFAULT_PORT))

  if (errors.count === 0) {
    console.log('[socket.js] All test for passed\n')
  } else {
    console.log(`[socket.js] Has ${errors.count} errors`)
  }

  return errors.count
}

export default socketTest
