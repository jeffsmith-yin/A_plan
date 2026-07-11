# 融智桥（RongZhiQiao）项目进展总结

> 生成时间：基于当前工作区真实状态核对
> 当前版本：DEMO **v0.7.1**（缓存版本 `rzq-v15`）
> 仓库：Monorepo Git（`/workspace` 根），`main` / `develop` 分支，已打 tag `v0.7.1`，远程 `jeffsmith-yin/A_plan`

---

> 📌 **用户澄清补充（人群定位）**：本项目所说的「大龄失业、但经验丰富的专家」，在**中国语境下特指 35 岁以上**的专业人才——这一群体有大量存在再就业难、职场年龄歧视问题，并非仅指退休后再创业/做顾问的银发专家。**竞品分析与市场调研必须把「35+ 再就业困难专家」作为核心供给侧人群**来刻画，不能与「退休专家」混为一谈。

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
- **提现申请**：`requestWithdrawal` 已接通 UI（金额 + 微信/支付宝/银行卡，超余额拦截，记录状态「处理中」），提现记录可展示
- **明细导出**：钱包结算/提现明细支持一键导出 **CSV（带 BOM，Excel 友好）与 JSON**
- 已 `react-scripts build` 并通过类型检查，缓存版本升 `rzq-v13`，已提交并推送 GitHub

### 7. 导航与入口
- `App.tsx` 已登记路由 `/nda-sign`、`/settlement`
- `HubPage` / `DashboardPage` / `OnboardingPage` 已增加对应快捷入口
- 缓存版本已推进到 `rzq-v12` 强制刷新

---

## 三、待办事项

### 🔴 高优先级（用户已明确要求，尚未完成）
1. ~~**钱包提现 / 明细导出 UI**~~ ✅ **已完成**（2025-07-11）
   - `requestWithdrawal` 已接通 MyPage 提现表单（金额 + 微信/支付宝/银行卡，超余额拦截）
   - 钱包明细支持一键导出 CSV（Excel 友好）/ JSON
   - 已 build + 提交 + 推送，缓存版本 `rzq-v13`
2. ~~**多语言版本（i18n 骨架：zh-CN + en）**~~ ✅ **已全部完成**（2025-07-11）
   - 基础设施：`src/i18n/`（en.ts / zhCN.ts / index.tsx：Provider + `useT` + `LanguageSwitcher`）
   - 全局语言切换器已接入 `PageContainer` 头部（简体中文 / English 一键切换，存 localStorage）
   - 渐进式方案：中文为源、英文为资源，未译 key 自动以中文兜底，不漏译不报错
   - **全量覆盖（18/18 页面）**：外壳、落地页、登录/注册、平台大厅、我的、数据看板、入驻、NDA 签署、区块链结算、排行榜、聊天、购物车、结算、文件管理、圈子、个人设置、可复用技能包、闯关体验
   - 资源键：zhCN / en 各约 **484 个**（含本次新增 `skill.*` 42 键、`play.*` 42 键）
   - 修复 `CheckoutPage` `orderNo` 变量类型（放宽 `useT` 的 `vars` 类型为 `string | number | null | undefined`）
   - 已 build（通过）+ 提交 + 推送，缓存版本 `rzq-v14 → rzq-v15`
3. ~~**提交未完成的 store.ts 改动并推送到 GitHub**~~ ✅ **已完成**（随提现功能一并提交推送）

### 🟡 中优先级（项目路线图项，尚未启动）
- 区块链**真实**对接（当前为模拟账本）
- NDA 增强：PDF 下载、企业批量签署、到期提醒
- 多平台发布 / 短视频推广素材

### 🟢 安全提醒（重要）
- 你提供的最新 GitHub PAT（`ghp_8uRK…OPuw8`）建议**立即到 GitHub 后台 Revoke**（本次多语言推送已用完）
- 我已做到「用完即清」（推送后立即清除 remote URL 中的 token），但 token 本身仍有效，需你主动吊销
- 此前旧的 PAT（`ghp_h02U…`）你已正确吊销；新 token 仅本次推送使用，用后请同样吊销

---

## 四、关键风险与注意

| 项 | 说明 |
|----|------|
| 预览生效 | 任何源码改动后必须 `react-scripts build`，否则 `proxy.js` 仍服务旧 `build/` |
| 缓存刷新 | 靠 `public/index.html` 中的 `rzq-vN` 版本串强制浏览器刷新 |
| 未提交改动 | 已全部提交并推送（含钱包逻辑、i18n 全量翻译、缓存 `rzq-v15`） |
| 环境 400 错误 | 此前「预览 / 做多语言版本」触发的 `400 input length too long` 为基础设施/传输问题，非代码 bug，重试即可 |

---

## 五、建议下一步（待你确认优先级）

1. ~~补全「钱包提现 / 明细导出」UI → `build` → 提交并推送~~ ✅ 已完成
2. ~~搭建 i18n 骨架（zh-CN + en），按规范逐步翻译~~ ✅ 已全部完成（18/18 页面）
3. ~~提交 store.ts 未提交改动~~ ✅ 已完成

### 🔜 正式产品下一步（按项目规范）
- 据产品规范，技术 DEMO 之后**正式的第一步是「先做市场调研和竞品分析」**
- **人群视角（用户澄清）**：供给侧核心是**中国 35 岁以上、经验丰富但再就业困难的专家**（≠ 退休专家）；需求侧是 AI 认知薄弱的中小微企业主；连接侧是 AI 技术人才
- 可输出：四方协作平台赛道竞品清单、目标客户画像、**35+ 专家再就业痛点与竞品对照**、定价与分账模式参考、差异化卖点建议
- ✅ 已交付：**《融智桥市场调研与竞品分析》报告**（`市场调研与竞品分析_融智桥.md`，2026-07-11，含三版扩展）
  - 核心供给侧主线：中国 35+ 经验专家再就业困境（含 2.4 市场规模量化）
  - 竞品分类：A/B 知识付费咨询 · C 威客众包 · D AI 企业服务 · E W3 自动分账空白 · **G 专家网络（GLG/凯盛融英/六度智囊等，最直接同类）**
  - 能力对比矩阵（5.10）+ SWOT；并入三份外部资料印证：
    - **知微行易**（工业 AI 标杆，FDE 替代 + Skills 沉淀 + 按公司收费，逐条印证假设）
    - **社区「立门派」范式**（印证"变现在山下、山上免费"，并警示"卖课→立门派"战略校正与骗局同构风险）
    - **智汇联平台报告**（用户上传 docx）：并入专家网络竞品、市场规模数据、**区块链「币链分离」监管校正**（必须联盟链 + 法币 + 持牌托管，1–3% 分账费率，分阶落地）
    - **Catalant 深度拆解**（Day 1 竞品分析）：新增 **5.7 Catalant** 章节——海外最接近融智桥的同构竞品，其 **FDE（领域专家+AI 工程师混编）** 模式逐条验证"专家+AI 人才混编交付"刚需；并入 5.1 分类框架（H 类）、5.11 对比矩阵（8 列），并澄清**平台 take rate(10–20%) 与链上清算费(1–3%) 两段式**费率口径，消除与智汇联 1–3% 校正的可能混淆

> 你希望我先推进哪一项？

---

## ⚠️ 安全提醒（每次 push 后必读）
- 仓库远程推送使用临时 **GitHub PAT**（`ghp_...`），推送完成后已立即从 remote URL 清除；该令牌**仅在当前会话内使用**。
- **请尽快在 GitHub → Settings → Developer settings → Personal access tokens 中撤销（revoke）该 PAT**，避免长时间暴露。
- 本报告与 DEMO 全部为**演示数据**，不含任何真实用户隐私或生产密钥。
