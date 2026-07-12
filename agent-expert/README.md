# 融智桥 · AI 智能体专家 MVP 原型

**自动接客户痛点、分析根因、匹配制造业 Skills、给出建议规则与预警**——对应团队/知识库规划（已交付 7）§3.6「AI 智能体专家架构」的可运行雏形。

> 演示性质：无外部 LLM/向量库依赖，纯 Node 内置模块；知识库为脱敏制造业 Skills 种子数据；AI 身份已显著标识，不冒充真实自然人专家。

## 运行
```bash
cd agent-expert
npm install        # 无第三方依赖，仅建 node_modules 占位
npm start          # CLI 演示：批量跑示例痛点
npm run web        # Web 演示：http://localhost:8787
npm test           # 零依赖 API 综合测试（功能/安全/隔离/审计/性能，见下）
```

## API 测试（`test/api-test.js`，零依赖）
综合测试套件，覆盖五大类，**27/27 通过**，可作验收门禁：
- **功能（11 项）**：健康检查、痛点分析结构化输出、空文本降级、购物车增/查/结算/清空、无效 ID 拒收、重复去重、未知路由 404；
- **安全（10 项）**：鉴权（无 token/伪造/过期→401、有效→200）、角色越权（audit 非 platform→403）、SQL 注入/XSS 不崩溃、畸形 JSON→400、超大体→413、限流→429；
- **隔离（2 项）**：购物车按用户隔离、落盘持久化；
- **审计（1 项）**：结算写审计 + 哈希链存证；
- **性能（3 项）**：单次 `/analyze` < 200ms（SLA）、50 并发全成功、并发结算。

> 运行：`npm test`（自动拉起服务、跑完自清，退出码 0=通过 / 1=有失败 / 3=超时兜底）。
> 详细结论见《融智桥_智能体专家API测试报告.md》（已交付 10）。

## 接口与鉴权（P0 已启用）
- **公开**：`GET /`、`POST /auth/login`、`POST /analyze`（均受限流保护）。
- **受控（须 `Authorization: Bearer <token>`）**：`GET /cart`、`POST /cart/add`、`POST /cart/checkout`、`POST /cart/clear`；`GET /audit` 仅 `platform` 角色。
- 登录：演示 Key 签发令牌 —— 成员用 `member-demo-key`（或 `member-demo-key-2`），平台审计用 `platform-demo-key`。生产须替换为正式 IdP + 公钥验签。
- 限流：默认 600 次/60s（按 token/IP 隔离），超限 429；购物车按 `sub` 隔离并落盘 `data/cart-store.json`；每次结算写审计 + 哈希链存证。

## 结构
```
agent-expert/
├── knowledge-base/manufacturing-skills.json   # 制造业 Skills 种子知识库（7 个技能包）
├── src/
│   ├── rag.js        # 知识库检索（词法 RAG；生产替换为 embedding 向量检索）
│   ├── agent.js      # AI 智能体专家：analyze(text) → 结构化分析
│   ├── cart.js       # 购物车（按 sub 隔离 + 落盘持久化）+ 按创建人分成结算
│   ├── auth.js       # 鉴权：HMAC 令牌签发/校验、演示 Key 登录
│   ├── ratelimit.js  # 限流：固定窗口（按 token/IP 隔离）
│   ├── audit.js      # 结算审计 + 哈希链存证（篡改即断裂）
│   ├── index.js      # CLI 演示入口（分析 + 购物车 + 分成）
│   └── server.js     # Web 演示（鉴权/限流/隔离/审计 + 分析→购物车→结算）
├── test/
│   └── api-test.js   # 零依赖综合测试（27 项，已交付 10）
└── README.md
```

## 智能体分析输出（analyze 返回）
- `painCategory` 痛点分类、`matchedSkills` 匹配技能包（含分数）
- `rootCause` 根因推断、`suggestedRules` 建议规则（来自专家方法论）
- `warnings` 风险预警指标、`confidence` 置信度、`escalate` 是否升级人工
- `reply` 给企业的自然语言回复

## 技能包商品化与购物车分成（演示）
- **技能包可复用**：`manufacturing-skills.json` 中每个技能包带 `version` / `creator{type:'person'|'agent',name}` / `listPrice` / `share`，一次创作可售给多客户。
- **加入购物车**：推荐技能包可加入购物车（CLI 自动加 / Web 点「+ 加入购物车」）；正式交付客户的智能解决方案 = 购物车结算。
- **按创建人分成**：结算沿用「透明智能分账协议」——标准拆分 创建人 ~80% / 平台 take rate 18%（区间 10–20%）/ 链上清算 2%（区间 1–3%）。创建人为**自然人**→归属该专家；为**智能体**→归属其运营/AI 人才方。结算走 2-of-3 多签 + 人民币法币（联盟链测试网模拟）。
- CLI：`node src/index.js` 末尾演示「购物车 + 按创建人分成结算」；Web：`/cart/add`、`/cart/checkout` 端点。

## 升级到生产的路径（见已交付 7 §3.3）
1. 检索：`rag.js` 词法匹配 → **embedding 向量检索（RAG）**，语义召回更准；
2. 生成：规则拼接 → **LLM + 行业 Skills 提示词**，输出更自然；
3. 知识库：静态 JSON → **Wiki + 向量库 + 版本审核**（已交付 7 §3.4）；
4. 多域：当前仅制造业 → 扩至零售/餐饮/外贸等域，每域一个智能体专家；
5. 身份合规：文本侧标注「AI 助手」，低置信度提示转人工（已内置）。
6. **真实数据绑定（生产必需）**：技能包默认演示数据，生产须由平台协助**注入客户真实数据**后方可激活可用（外泄文件/截屏本身不可用）；详见《融智桥_技能包与智能解决方案商业化方案.md》§七。

## 合规
- 全部演示数据；AI 智能体专家显著标识为 AI 助手，不冒充真实自然人专家；
- 与视频侧「数字人 + 假名」同源合规（见运营方案已交付 6）。
