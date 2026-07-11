# 融智桥（RongZhiQiao）项目进展总结

> 生成时间：基于当前工作区真实状态核对
> 当前版本：DEMO **v0.7.1**（缓存版本 `rzq-v12`）
> 仓库：Monorepo Git（`/workspace` 根），`main` / `develop` 分支，已打 tag `v0.7.1`，远程 `jeffsmith-yin/A_plan`

---

## 一、项目概况

| 维度 | 内容 |
|------|------|
| 产品定位 | AI 驱动的四方协作平台：行业专家 / AI 人才 / 企业客户 / 平台方 |
| 技术栈 | React 19 + TypeScript + HashRouter（CRA / react-scripts） |
| 数据持久化 | 全部 DEMO 数据存浏览器 `localStorage`（无后端） |
| 版本管理 | Monorepo 单仓库，Git Flow（main/develop/feature/release/hotfix），语义化版本 `v主.次.修订[-demo]` |
| 预览方式 | `proxy.js` 托管 `build/` 于 3000 端口；**源码改动后必须 `react-scripts build` 才生效** |

---

## 二、已完成进展（按模块）

### 1. 版本管理与仓库基础
- `.gitignore`：忽略 `node_modules` / `build` / 归档包 / `.codebuddy/` / 密钥
- `VERSIONING.md`：完整的 Git Flow 与提交/打 tag 规范
- 远程 GitHub 已推送 `main` / `develop`，已打 tag `v0.7.1`

### 2. 账号与权限体系
- 超级管理员：首个用户自动晋升；`ensureSuperAdmin()` 创建 `admin / admin`
- 子管理员：`setSubAdmin`（上限 6）、`removeSubAdmin`
- 注册 / 登录 / 踢出 / 恢复 / 删除账号

### 3. 四方角色与名片
- `RoleCard` 模型、四角色可选范围（`PLATFORM_AVAILABLE_ROLES` 等）、默认平台角色
- 积分规则：`NEW_MEMBER=10` / `REFERRAL=2`，积分排行榜 `getScoreLeaderboard()`
- 推荐加分已修复一致性：`addReferralScore` 同时计入 `Person.score` 与 `RoleCard.score`

### 4. NDA 保密协议
- 数据层：`NDARecord`、`NDA_TEXT`、`NDA_VERSION="v1.0"`、`NDA_VALID_DAYS=30`
- 能力：按角色签署 / 续签 / 30 天到期判断
- 页面：路由 `/nda-sign`，看板展示「签署人数 / 总数 / 签署率」
- `OnboardingPage` 完成步骤增加「🔒 签署保密协议」入口

### 5. W3 区块链自动结算（DEMO）
- 分账规则 `DEFAULT_SETTLEMENT_RULE`：平台 10% / 专家 60% / AI 30%
- 付款成功链路：`payOrder` → `createSettlementForOrder` → `recordSettlement`（模拟链上账本）→ `distributeSettlement`（自动入账到各方钱包）
- 页面：路由 `/settlement`，链上账本（首次加载 seed 3 条），可手动模拟结算
- `DashboardPage` 增加「⛓ 区块链自动结算概览」

### 6. 我的钱包
- 数据模型 `Wallet`：`balance` / `entries` / `withdrawals`
- 自动入账：`getWallet` / `creditWallet` / `distributeSettlement`（平台费入超级管理员钱包，多人平分）
- `MyPage` 钱包卡片：展示余额 + 近 6 笔结算
- ⚠️ `requestWithdrawal(phone, amount, method)` **数据层已写入 store.ts**，但 **MyPage 暂未接提现表单 / 明细导出按钮**；且该 store.ts 改动**尚未 git 提交**

### 7. 导航与入口
- `App.tsx` 已登记路由 `/nda-sign`、`/settlement`
- `HubPage` / `DashboardPage` / `OnboardingPage` 已增加对应快捷入口
- 缓存版本已推进到 `rzq-v12` 强制刷新

---

## 三、待办事项

### 🔴 高优先级（用户已明确要求，尚未完成）
1. **钱包提现 / 明细导出 UI**
   - store 层 `requestWithdrawal` 已就绪（写入后扣余额、生成 `withdrawals` 记录）
   - 缺：`MyPage` 提现表单 + 余额明细 CSV/JSON 导出按钮
2. **多语言版本**
   - 用户说过「做多语言版本」，因环境 `400 input length too long` 错误中断未启动
   - 项目规范：先做简体中文（zh-CN），再做英文（en）等
3. **提交未完成的 store.ts 改动并推送到 GitHub**
   - 当前 `git status` 显示 `store.ts` 有 32 行新增 / 2 行删除未提交

### 🟡 中优先级（项目路线图项，尚未启动）
- 区块链**真实**对接（当前为模拟账本）
- NDA 增强：PDF 下载、企业批量签署、到期提醒
- 多平台发布 / 短视频推广素材

### 🟢 安全提醒（重要）
- 你提供的 GitHub PAT（`rongzhiqiao-push`）建议**立即到 GitHub 后台 Revoke**
- 我已做到「用完即清」（推送后立即清除 remote URL 中的 token），但 token 本身仍有效，需你主动吊销

---

## 四、关键风险与注意

| 项 | 说明 |
|----|------|
| 预览生效 | 任何源码改动后必须 `react-scripts build`，否则 `proxy.js` 仍服务旧 `build/` |
| 缓存刷新 | 靠 `public/index.html` 中的 `rzq-vN` 版本串强制浏览器刷新 |
| 未提交改动 | `store.ts` 钱包/提现逻辑未提交，存在丢失风险，建议尽快 commit |
| 环境 400 错误 | 此前「预览 / 做多语言版本」触发的 `400 input length too long` 为基础设施/传输问题，非代码 bug，重试即可 |

---

## 五、建议下一步（待你确认优先级）

1. 补全「钱包提现 / 明细导出」UI → `build` → 提交并推送
2. 搭建 i18n 骨架（zh-CN + en），按规范逐步翻译
3. 提交 store.ts 未提交改动

> 你希望我先推进哪一项？
