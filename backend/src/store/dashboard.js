// 数据看板统计（零依赖）
// 聚合查询：角色人数、产品数、交易量
import { getRoleStats } from './roles.js'
import { getOrderStats } from './orders.js'
import { getNDASignedCount } from './nda.js'

export function getDashboard() {
  const roles = getRoleStats()
  const orders = getOrderStats()

  return {
    expertCount: roles.expert,
    aiCount: roles.ai,
    enterpriseCount: roles.enterprise,
    platformCount: roles.platform,
    totalMembers: roles.total,
    productCount: 12, // 演示商品库固定 12 个
    demoProductCount: 12,
    ndaSignedCount: getNDASignedCount(),
    ...orders
  }
}
