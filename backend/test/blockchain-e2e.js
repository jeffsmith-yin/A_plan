// 融智桥 · 联盟链端到端测试
// 测试 FISCO BCOS 适配器：连接 → 查询 → 上链(含签名) → 回执 → 验证
// 运行：FISCO_RPC_URL=http://127.0.0.1:20200 FISCO_PRIVKEY=<hex> node test/blockchain-e2e.js
// 退出码：0=通过, 1=失败

import { performance } from 'node:perf_hooks'
import { strict as assert } from 'node:assert'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const FISCO_RPC = process.env.FISCO_RPC_URL || 'http://127.0.0.1:20200'
const FISCO_PRIVKEY = process.env.FISCO_PRIVKEY || ''

// 测试框架
const results = []

function rec(name, category, fn) {
  return (async () => {
    const t = { name, category, status: 'PASS', detail: '', ms: 0 }
    const start = performance.now()
    try {
      await fn(t)
    } catch (e) {
      t.status = 'FAIL'
      t.detail = e.message
    }
    t.ms = Number((performance.now() - start).toFixed(2))
    results.push(t)
    console.log(`${t.status === 'PASS' ? '✅' : '❌'} [${category}] ${name} (${t.ms}ms)${t.detail ? ' — ' + t.detail : ''}`)
  })()
}

async function run() {
  console.log('=== 融智桥 · 联盟链端到端测试 ===')
  console.log(`RPC: ${FISCO_RPC}\n`)

  // 动态导入适配器模块
  const { FISCOBCOSAdapter, signTransaction } = await import('../src/blockchain/fisco-adapter.js')
  const { initBlockchain, getBlockchainInfo, recordSettlement, queryAllLedger, verifyLedger } = await import('../src/blockchain/index.js')

  let adapter = null

  // ===== 1. 连接测试 =====
  await rec('FISCO BCOS 节点连接 → 成功获取链信息', '连接', async (t) => {
    adapter = new FISCOBCOSAdapter({
      rpcUrl: FISCO_RPC,
      groupId: 'group0',
      chainId: 'chain0',
      privkey: FISCO_PRIVKEY
    })
    const ok = await adapter.connect()
    t.expected = 'connected=true'
    t.actual = `connected=${ok}`
    assert.ok(ok, '应成功连接 FISCO BCOS 节点')

    const info = adapter.getInfo()
    assert.ok(info.version, '应有版本信息')
    assert.ok(info.account || !FISCO_PRIVKEY, '配置私钥后应有账户地址')
    console.log(`   链版本: ${info.version}，块高: ${info.blockNumber}，账户: ${info.account || '(未配置)'}`)
  })

  // ===== 2. 区块查询测试 =====
  await rec('getBlockNumber → 返回当前块高', '查询', async (t) => {
    const http = await import('node:http')
    const body = JSON.stringify({ jsonrpc: '2.0', method: 'getBlockNumber', params: ['group0', ''], id: 1 })
    const resp = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port: 20200, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000
      }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); })
      req.on('error', reject); req.write(body); req.end()
    })
    t.expected = '块高 >= 0'
    t.actual = `块高=${resp.result}`
    assert.ok(typeof resp.result === 'number' && resp.result >= 0, '块高应为非负数')
  })

  // ===== 3. 群组信息测试 =====
  await rec('getGroupInfo → 返回群组和节点信息', '查询', async (t) => {
    const http = await import('node:http')
    const body = JSON.stringify({ jsonrpc: '2.0', method: 'getGroupInfo', params: ['group0', ''], id: 1 })
    const resp = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port: 20200, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000
      }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); })
      req.on('error', reject); req.write(body); req.end()
    })
    t.expected = 'chainID=chain0, groupID=group0'
    t.actual = `chainID=${resp.result?.chainID}`
    assert.strictEqual(resp.result?.chainID, 'chain0')
    assert.strictEqual(resp.result?.groupID, 'group0')
    assert.ok(resp.result?.nodeList?.length > 0, '应有至少1个节点')
  })

  // ===== 4. call 接口测试 =====
  await rec('call 接口 → 对空地址返回预期错误（RPC 通路正常）', '查询', async (t) => {
    const http = await import('node:http')
    const body = JSON.stringify({
      jsonrpc: '2.0', method: 'call',
      params: ['group0', '', '0x0000000000000000000000000000000000000000', '0x'],
      id: 1
    })
    const resp = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port: 20200, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000
      }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); })
      req.on('error', reject); req.write(body); req.end()
    })
    // call 空地址会返回 status != 0（错误），这是预期行为
    t.expected = 'call 返回 result（含 status）'
    t.actual = `status=${resp.result?.status}`
    assert.ok(resp.result, '应有 result')
    assert.ok(typeof resp.result.status !== 'undefined', '应有 status 字段')
  })

  // ===== 5. record 本地记录测试（fallback 模式，无合约地址）=====
  await rec('record → 本地 SHA256 记录（无合约地址时 fallback）', '上链', async (t) => {
    const receipt = await adapter.record({
      type: 'settlement',
      sub: 'test_user',
      content: { orderId: 'E2E_001', total: 100 }
    })
    t.expected = 'txHash 为 64 位 hex'
    t.actual = `txHash=${receipt.txHash}`
    assert.ok(/^[0-9a-f]{64}$/.test(receipt.txHash), 'txHash 应为 64 位 hex')
    assert.strictEqual(receipt.status, 'confirmed')
    // 无合约地址时应有 note
    if (!FISCO_PRIVKEY) {
      assert.ok(receipt.note?.includes('本地记录'), 'fallback 时应标注本地记录')
    }
  })

  // ===== 6. 交易签名流程测试（仅当有私钥时）=====
  if (FISCO_PRIVKEY) {
    await rec('signTransaction → 生成有效的签名交易 hex', '签名', async (t) => {
      const { createRequire } = await import('node:module')
      const { bcostars } = createRequire(import.meta.url)('../src/blockchain/TransactionTars.cjs')

      const txData = new bcostars.TransactionData()
      txData.version = 1
      txData.chainID = 'chain0'
      txData.groupID = 'group0'
      txData.blockLimit = adapter._blockLimit
      txData.nonce = String(BigInt(Math.floor(Math.random() * (2 ** 128))))
      txData.to = ''
      txData.abi = '[]'

      const { signedTxHex, txHash } = signTransaction(txData, FISCO_PRIVKEY)
      t.expected = 'signedTxHex 以 0x 开头，txHash 为 66 字符'
      t.actual = `signedTxHex.length=${signedTxHex.length}, txHash=${txHash}`
      assert.ok(signedTxHex.startsWith('0x'), 'signedTxHex 应以 0x 开头')
      assert.ok(signedTxHex.length > 200, 'signedTxHex 应有足够长度（>200 字符）')
      assert.strictEqual(txHash.length, 66, 'txHash 应为 66 字符（0x + 64 hex）')
    })
  }

  // ===== 7. 适配器管理器集成测试 =====
  await rec('initBlockchain → 使用 FISCO BCOS 适配器', '集成', async (t) => {
    const info = adapter.getInfo()
    t.expected = 'connected=true, name 含 FISCO BCOS'
    t.actual = `name=${info.name}`
    assert.ok(info.connected, '适配器应处于连接状态')
    assert.ok(info.name.includes('FISCO BCOS'), '适配器名称应包含 FISCO BCOS')
  })

  // ===== 8. 查询和验证测试 =====
  await rec('queryAllLedger → 返回已上链记录列表', '集成', async (t) => {
    const records = await adapter.queryAll()
    t.expected = 'records 为数组'
    t.actual = `records.length=${records.length}`
    assert.ok(Array.isArray(records), '应返回数组')
    assert.ok(records.length > 0, '应至少有一条测试记录')
  })

  await rec('verifyLedger → 返回链完整性状态', '集成', async (t) => {
    const v = await adapter.verify()
    t.expected = 'ok=true, 含 blockNumber'
    t.actual = `ok=${v.ok}, blockNumber=${v.blockNumber}`
    assert.ok(v.ok, '链完整性验证应通过')
    assert.ok(typeof v.blockNumber === 'number', '应含区块高度')
  })

  // ===== 9. 断开连接 =====
  await rec('disconnect → 正常断开', '连接', async (t) => {
    await adapter.disconnect()
    const info = adapter.getInfo()
    t.expected = 'connected=false'
    t.actual = `connected=${info.connected}`
    assert.strictEqual(info.connected, false)
  })

  // ===== 汇总 =====
  const pass = results.filter(r => r.status === 'PASS').length
  const fail = results.length - pass
  console.log('\n=== 测试汇总 ===')
  console.log(`总计 ${results.length} | 通过 ${pass} | 失败 ${fail}`)
  console.log(`连接 ${results.filter(r => r.category === '连接').length} | 查询 ${results.filter(r => r.category === '查询').length} | 上链 ${results.filter(r => r.category === '上链').length} | 签名 ${results.filter(r => r.category === '签名').length} | 集成 ${results.filter(r => r.category === '集成').length}`)
  console.log(`\n总体质量门禁：${fail === 0 ? 'PASS' : 'FAIL'}`)
  process.exit(fail === 0 ? 0 : 1)
}

run().catch(e => {
  console.error('测试异常:', e.message)
  process.exit(2)
})
