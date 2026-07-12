# 融智桥 MVP 后端

**零依赖 Node 后端**，为 `demo-frontend/rongzhiqiao-demo` 主站提供账号/角色/NDA/购物车/结算/分账/钱包/数据看板 API。

技术栈：`node:http` + HMAC 令牌 + 哈希链审计 + 固定窗口限流（与 `agent-expert` 同构）。

## 运行
```bash
cd backend
npm start          # 启动服务 → http://localhost:3100
npm test           # API 综合测试
```

## API 端点

### 公开
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/auth/register` | 注册（phone + password） |
| POST | `/api/auth/login` | 登录 → 返回 HMAC 令牌 |

### 受控（`Authorization: Bearer <token>`）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/me` | 当前用户 + 角色列表 |
| POST | `/api/roles` | 创建/更新角色 |
| DELETE | `/api/roles/:id` | 删除角色 |
| GET | `/api/nda` | NDA 状态 |
| POST | `/api/nda/sign` | 签署 NDA（30天） |
| POST | `/api/nda/renew` | 续签 NDA |
| GET | `/api/cart` | 购物车 |
| POST | `/api/cart/add` | 加入购物车 |
| POST | `/api/cart/remove` | 移除购物车项 |
| POST | `/api/cart/checkout` | 结算 → 订单 → 分账 → 审计 |
| GET | `/api/orders` | 订单列表 |
| GET | `/api/wallet` | 钱包余额 + 流水 |
| POST | `/api/wallet/withdraw` | 提现申请 |
| GET | `/api/dashboard` | 数据看板统计 |
| GET | `/api/audit` | 审计视图（platform/admin） |

## 安全
- 鉴权：HMAC HS256 令牌
- 限流：600 次/60s（按 token.sub 隔离），超限 429
- 审计：结算/分账写哈希链账本（`data/chain-ledger.jsonl`）
- 体限：1MB 请求体上限 → 413

## 数据
- `data/` 运行时目录（.gitignore）
- 用户/角色/NDA/购物车/订单/钱包/审计分别落盘 JSON 文件
- 后端不可达时，主站自动回退 localStorage（DEMO 兼容）
