// 购物车 + 按创建人（自然人/智能体）拟定分成的结算层
// 技能包可复用、可加入购物车；正式交付客户的智能解决方案 = 购物车结算
import { loadKB } from './rag.js'

// 标准分成（同「透明智能分账协议」）：创建人 ~80% / 平台 take rate 18%(区间10–20%) / 链上清算 2%(区间1–3%)
const DEFAULT_SHARE = { creator: 0.80, platform: 0.18, chain: 0.02 }

const cart = { items: [] }

export function addToCart(skillId) {
  if (cart.items.includes(skillId)) return false
  cart.items.push(skillId)
  return true
}

export function removeFromCart(skillId) {
  cart.items = cart.items.filter((id) => id !== skillId)
}

export function listCart(kb) {
  return cart.items.map((id) => kb.skills.find((s) => s.id === id)).filter(Boolean)
}

export function clearCart() {
  cart.items = []
}

// 结算：返回每笔技能包的创建人/平台/链上分账，以及合计
export function checkout(kb) {
  const lines = listCart(kb).map((s) => {
    const share = s.share || DEFAULT_SHARE
    const price = s.listPrice || 0
    const creator = price * share.creator
    const platform = price * share.platform
    const chain = price * share.chain
    return {
      skillId: s.id,
      name: s.name,
      creator: s.creator, // { type:'person'|'agent', name }
      price,
      creatorPayout: Number(creator.toFixed(2)),
      platformPayout: Number(platform.toFixed(2)),
      chainPayout: Number(chain.toFixed(2))
    }
  })

  const total = lines.reduce((a, l) => a + l.price, 0)
  const creatorTotal = Number(lines.reduce((a, l) => a + l.creatorPayout, 0).toFixed(2))
  const platformTotal = Number(lines.reduce((a, l) => a + l.platformPayout, 0).toFixed(2))
  const chainTotal = Number(lines.reduce((a, l) => a + l.chainPayout, 0).toFixed(2))

  return {
    protocol: '透明智能分账协议',
    settlement: '2-of-3 多签 + 人民币法币结算（联盟链测试网模拟）',
    total: Number(total.toFixed(2)),
    lines,
    totals: { creatorTotal, platformTotal, chainTotal },
    note: '创建人为自然人 → 归属该专家；为智能体 → 归属其运营/AI 人才方。平台 take rate 18%（区间 10–20%），链上清算费 2%（区间 1–3%）。'
  }
}
