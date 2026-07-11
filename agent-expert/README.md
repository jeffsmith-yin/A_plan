# 融智桥 · AI 智能体专家 MVP 原型

**自动接客户痛点、分析根因、匹配制造业 Skills、给出建议规则与预警**——对应团队/知识库规划（已交付 7）§3.6「AI 智能体专家架构」的可运行雏形。

> 演示性质：无外部 LLM/向量库依赖，纯 Node 内置模块；知识库为脱敏制造业 Skills 种子数据；AI 身份已显著标识，不冒充真实自然人专家。

## 运行
```bash
cd agent-expert
npm install        # 无第三方依赖，仅建 node_modules 占位
npm start          # CLI 演示：批量跑示例痛点
npm run web        # Web 演示：http://localhost:8787
```

## 结构
```
agent-expert/
├── knowledge-base/manufacturing-skills.json   # 制造业 Skills 种子知识库（7 个技能包）
├── src/
│   ├── rag.js        # 知识库检索（词法 RAG；生产替换为 embedding 向量检索）
│   ├── agent.js      # AI 智能体专家：analyze(text) → 结构化分析
│   ├── index.js      # CLI 演示入口
│   └── server.js     # Web 演示（企业代表输入痛点 → 智能体自动分析）
└── README.md
```

## 智能体分析输出（analyze 返回）
- `painCategory` 痛点分类、`matchedSkills` 匹配技能包（含分数）
- `rootCause` 根因推断、`suggestedRules` 建议规则（来自专家方法论）
- `warnings` 风险预警指标、`confidence` 置信度、`escalate` 是否升级人工
- `reply` 给企业的自然语言回复

## 升级到生产的路径（见已交付 7 §3.3）
1. 检索：`rag.js` 词法匹配 → **embedding 向量检索（RAG）**，语义召回更准；
2. 生成：规则拼接 → **LLM + 行业 Skills 提示词**，输出更自然；
3. 知识库：静态 JSON → **Wiki + 向量库 + 版本审核**（已交付 7 §3.4）；
4. 多域：当前仅制造业 → 扩至零售/餐饮/外贸等域，每域一个智能体专家；
5. 身份合规：文本侧标注「AI 助手」，低置信度提示转人工（已内置）。

## 合规
- 全部演示数据；AI 智能体专家显著标识为 AI 助手，不冒充真实自然人专家；
- 与视频侧「数字人 + 假名」同源合规（见运营方案已交付 6）。
