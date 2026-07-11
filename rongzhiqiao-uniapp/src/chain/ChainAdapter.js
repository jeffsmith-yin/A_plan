/**
 * 联盟链测试网适配层（可插拔）
 * ------------------------------------------------------------------
 * 设计目标（PRD §4.5 / §9）：
 *  - 透明智能分账协议：里程碑达成 → 2-of-3 多签 → 人民币法币结算
 *  - 严禁公链代币 / 稳定币；资金经持牌托管，合规「币链分离」
 *  - 当前默认实现为「联盟链测试网模拟」：本地账本 + 2-of-3 多签 + 法币结算
 *  - 预留真实联盟链适配器接口：setMode('tbaas' | 'antchain') 即可切换
 *
 * 接入真实联盟链时，只需：
 *  1) 实现 settle() 中标注 // [REAL-CHAIN] 的部分（调用 TBaaS / 蚂蚁链 SDK）
 *  2) 通过 setMode() 切换，业务层无需改动
 */

const LEDGER_KEY = 'rzq_chain_ledger_v1'

export class ChainAdapter {
  constructor(mode = 'testnet') {
    this.mode = mode // 'testnet' | 'tbaas' | 'antchain'
    this.ledger = this._loadLedger()
  }

  /** 切换链模式（预留真实联盟链适配器） */
  setMode(mode) {
    this.mode = mode
  }

  _loadLedger() {
    try {
      return uni.getStorageSync(LEDGER_KEY) || []
    } catch (e) {
      return []
    }
  }

  _saveLedger() {
    try {
      uni.setStorageSync(LEDGER_KEY, this.ledger)
    } catch (e) {}
  }

  _fakeHash() {
    const hex = '0123456789abcdef'
    let s = '0x'
    for (let i = 0; i < 64; i++) s += hex[Math.floor(Math.random() * 16)]
    return s
  }

  /**
   * 触发分账（2-of-3 多签 + 法币结算）
   * @param {{expertAmt:number, aiAmt:number, platformAmt:number, memo?:string}} payload
   * @returns {Promise<object>} 交易回执
   */
  async settle({ expertAmt, aiAmt, platformAmt, memo = '' }) {
    // 2-of-3 多签：专家签章 + 企业签章 + 平台仲裁
    const signs = [
      { role: 'expert', signed: true },
      { role: 'enterprise', signed: true },
      { role: 'platform', arbitrated: true }
    ]

    const tx = {
      txHash: this._fakeHash(),
      mode: this.mode,
      currency: 'CNY', // 法币，绝非法链代币
      protocol: '透明智能分账协议',
      signs,
      split: { expert: expertAmt, ai: aiAmt, platform: platformAmt },
      memo,
      at: new Date().toISOString()
    }

    // [REAL-CHAIN] 真实联盟链：在此调用 TBaaS / 蚂蚁链 提交多签交易并等待回执

    this.ledger.push(tx)
    this._saveLedger()

    // 模拟测试网出块延迟（演示）
    await new Promise((r) => setTimeout(r, 450))
    return tx
  }

  /** 查询本地账本（演示） */
  listLedger() {
    return this.ledger
  }
}

// 单例：全局复用同一账本
export const chain = new ChainAdapter('testnet')
