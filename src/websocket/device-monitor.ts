import type {
  DeviceMonitorEnvelope,
  DeviceMonitorMessageMap,
  DeviceMonitorMessageType,
  DeviceMonitorParsedMessage,
  DeviceMonitorSubscribeReq,
  DeviceMonitorUnsubscribeReq,
  DeviceStatusSubscribeReq,
  DeviceStatusUnsubscribeReq,
} from '@/api/types/device-monitor'
import { useTokenStore } from '@/store/token'
import { getEnvBaseUrl } from '@/utils'

type AnyMessageHandler = (message: DeviceMonitorParsedMessage) => void
type TypedMessageHandler<T extends DeviceMonitorMessageType>
  = (content: DeviceMonitorMessageMap[T], message: DeviceMonitorParsedMessage<DeviceMonitorMessageMap[T]>) => void

type SocketStatus = 'closed' | 'connecting' | 'open'

const WS_PATH = '/infra/ws'
const RECONNECT_DELAY = 3000

function buildWebSocketUrl(token: string) {
  const baseUrl = getEnvBaseUrl()
    .replace(/\/app-api\/?$/, '')
    .replace(/\/admin-api\/?$/, '')
    .replace(/\/$/, '')

  const wsBaseUrl = baseUrl.startsWith('https://')
    ? baseUrl.replace('https://', 'wss://')
    : baseUrl.replace('http://', 'ws://')

  return `${wsBaseUrl}${WS_PATH}?token=${encodeURIComponent(token)}`
}

function parseSocketMessage(data: string | ArrayBuffer): DeviceMonitorParsedMessage | null {
  if (typeof data !== 'string') {
    return null
  }

  const envelope = JSON.parse(data) as DeviceMonitorEnvelope
  const content = typeof envelope.content === 'string'
    ? JSON.parse(envelope.content || '{}')
    : envelope.content

  return {
    content,
    raw: envelope,
    type: envelope.type,
  }
}

export class DeviceMonitorWebSocketClient {
  private socketTask: UniApp.SocketTask | null = null
  private status: SocketStatus = 'closed'
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private manualClosed = false
  private currentMonitorSubscription: DeviceMonitorSubscribeReq | null = null
  private statusSubscribed = false
  private anyHandlers = new Set<AnyMessageHandler>()
  private typedHandlers = new Map<string, Set<AnyMessageHandler>>()

  get connected() {
    return this.status === 'open'
  }

  get connecting() {
    return this.status === 'connecting'
  }

  async connect() {
    if (this.connected) {
      return
    }

    if (this.connecting) {
      await this.waitUntilOpen()
      return
    }

    const tokenStore = useTokenStore()
    const token = await tokenStore.tryGetValidToken()

    if (!token) {
      throw new Error('请先登录后再连接实时数据')
    }

    this.manualClosed = false
    this.status = 'connecting'

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const socketTask = uni.connectSocket({
        url: buildWebSocketUrl(token),
        complete: () => {},
      })

      this.socketTask = socketTask

      socketTask.onOpen(() => {
        settled = true
        this.status = 'open'
        resolve()
      })

      socketTask.onError((error) => {
        this.status = 'closed'
        if (!settled) {
          settled = true
          reject(error)
        }
      })

      socketTask.onClose(() => {
        this.status = 'closed'
        this.socketTask = null
        if (!settled) {
          settled = true
          reject(new Error('WebSocket 连接已关闭'))
        }
        this.scheduleReconnect()
      })

      socketTask.onMessage((event) => {
        this.handleMessage(event.data)
      })
    })
  }

  async subscribe(payload: DeviceMonitorSubscribeReq) {
    this.currentMonitorSubscription = payload
    await this.connect()
    this.send('member-device-monitor-subscribe', payload)
  }

  unsubscribe(payload?: DeviceMonitorUnsubscribeReq) {
    this.currentMonitorSubscription = null

    if (!this.connected) {
      return
    }

    this.send('member-device-monitor-unsubscribe', payload || {})
  }

  async subscribeStatus(payload: DeviceStatusSubscribeReq = {}) {
    this.statusSubscribed = true
    await this.connect()
    this.send('member-device-status-subscribe', payload)
  }

  unsubscribeStatus(payload: DeviceStatusUnsubscribeReq = {}) {
    this.statusSubscribed = false

    if (!this.connected) {
      return
    }

    this.send('member-device-status-unsubscribe', payload)
  }

  close() {
    this.manualClosed = true
    this.currentMonitorSubscription = null
    this.statusSubscribed = false
    this.clearReconnectTimer()
    this.socketTask?.close({})
    this.socketTask = null
    this.status = 'closed'
  }

  onAny(handler: AnyMessageHandler) {
    this.anyHandlers.add(handler)
    return () => {
      this.anyHandlers.delete(handler)
    }
  }

  on<T extends DeviceMonitorMessageType>(type: T, handler: TypedMessageHandler<T>) {
    const wrappedHandler: AnyMessageHandler = (message) => {
      handler(message.content as DeviceMonitorMessageMap[T], message as DeviceMonitorParsedMessage<DeviceMonitorMessageMap[T]>)
    }

    const handlers = this.typedHandlers.get(type) || new Set<AnyMessageHandler>()
    handlers.add(wrappedHandler)
    this.typedHandlers.set(type, handlers)

    return () => {
      handlers.delete(wrappedHandler)
      if (!handlers.size) {
        this.typedHandlers.delete(type)
      }
    }
  }

  private send(
    type:
      | 'member-device-monitor-subscribe'
      | 'member-device-monitor-unsubscribe'
      | 'member-device-status-subscribe'
      | 'member-device-status-unsubscribe',
    content: object,
  ) {
    if (!this.socketTask || !this.connected) {
      throw new Error('WebSocket 未连接')
    }

    this.socketTask.send({
      data: JSON.stringify({
        content: JSON.stringify(content),
        type,
      }),
    })
  }

  private handleMessage(data: string | ArrayBuffer) {
    try {
      const message = parseSocketMessage(data)

      if (!message) {
        return
      }

      this.anyHandlers.forEach(handler => handler(message))
      this.typedHandlers.get(message.type)?.forEach(handler => handler(message))
    }
    catch (error) {
      console.error('解析设备实时 WebSocket 消息失败:', error, data)
    }
  }

  private scheduleReconnect() {
    if (this.manualClosed || (!this.currentMonitorSubscription && !this.statusSubscribed)) {
      return
    }

    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect()

        if (this.statusSubscribed) {
          this.send('member-device-status-subscribe', {})
        }

        if (this.currentMonitorSubscription) {
          this.send('member-device-monitor-subscribe', this.currentMonitorSubscription)
        }
      }
      catch (error) {
        console.error('设备实时 WebSocket 重连失败:', error)
        this.scheduleReconnect()
      }
    }, RECONNECT_DELAY)
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) {
      return
    }

    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private waitUntilOpen() {
    return new Promise<void>((resolve, reject) => {
      let retryCount = 0
      const timer = setInterval(() => {
        retryCount += 1

        if (this.connected) {
          clearInterval(timer)
          resolve()
          return
        }

        if (!this.connecting || retryCount > 50) {
          clearInterval(timer)
          reject(new Error('WebSocket 连接超时'))
        }
      }, 100)
    })
  }
}
