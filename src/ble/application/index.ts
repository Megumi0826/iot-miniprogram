/**
 * BLE application 层统一出口。
 *
 * 这里导出本地蓝牙业务能力：
 * - 扫描附近支持的设备
 * - 连接本地 BLE 设备
 * - 创建 b1/b2 命令会话
 * - 查询设备身份和状态
 */
export * from './command'
export * from './connection'
export * from './monitor'
export * from './scan'
export * from './status'
export * from './status-code'
export * from './types'
export * from './wifi'
