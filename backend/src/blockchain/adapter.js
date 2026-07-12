// 区块链适配层接口 (IBlockchainAdapter)
// 统一上链/查询/验证 API，支持多后端切换

/**
 * @typedef {Object} TxReceipt
 * @property {string} txHash      - 交易哈希
 * @property {number} blockNumber - 区块高度
 * @property {string} status      - 'confirmed' | 'pending' | 'failed'
 * @property {Object} [data]      - 链上存储的数据
 */

/**
 * @typedef {Object} LedgerEntry
 * @property {string} type        - 操作类型：settlement | split | audit
 * @property {string} txHash      - 交易哈希
 * @property {number} blockNumber - 区块高度
 * @property {number} timestamp   - 链上时间戳 (Unix ms)
 * @property {Object} content     - 业务数据
 */

/**
 * IBlockchainAdapter 接口定义
 *
 * 所有区块链适配器必须实现以下方法：
 *   - connect()      : 连接测试/初始化
 *   - disconnect()   : 断开连接
 *   - record(data)   : 上链一笔记录 → TxReceipt
 *   - query(txHash)  : 按 txHash 查询 → LedgerEntry | null
 *   - queryAll()     : 查询所有记录 → LedgerEntry[]
 *   - verify()       : 验证链完整性 → { ok, entries, reason? }
 *   - getInfo()      : 获取链信息 → { name, version, blockNumber, connected }
 */

// 所有适配器的基类（仅做类型约束提示）
export class BlockchainAdapter {
  async connect() { throw new Error('Not implemented: connect()') }
  async disconnect() { throw new Error('Not implemented: disconnect()') }
  async record(data) { throw new Error('Not implemented: record()') }
  async query(txHash) { throw new Error('Not implemented: query()') }
  async queryAll() { throw new Error('Not implemented: queryAll()') }
  async verify() { throw new Error('Not implemented: verify()') }
  getInfo() { throw new Error('Not implemented: getInfo()') }
}
