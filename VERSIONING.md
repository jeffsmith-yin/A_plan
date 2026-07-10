# 融智桥（RongZhiQiao）源代码版本管理规范

> 本文件定义融智桥项目的源代码版本管理约定：仓库结构、分支模型、版本号规则、打标签与提交规范。
> 所有参与开发（含 AI 代理 WorkBuddy）均须遵守。

---

## 1. 仓库结构（Monorepo）

项目采用**单一根仓库（monorepo）**，git 根目录即 `/workspace`：

```
/workspace
├── .gitignore                 # 全局忽略规则
├── VERSIONING.md              # 本规范
├── Day1~Day3_*.md             # 市场调研 / 竞品分析 / 需求设计（项目核心资产）
├── 市场调研与竞品分析报告.md
├── 融智桥_3天试点项目包_索引.md
├── outreach/                  # 专家触达话术等运营素材
├── questionnaire/             # 问卷与推广文案
├── rongzhiqiao-demo/          # 本地部署说明等
└── demo-frontend/             # 前端源码（当前唯一代码包）
    └── rongzhiqiao-demo/      # React + TS 项目
```

**不入库的内容**（见 `.gitignore`）：
- `node_modules/`、`build/`、`dist/` —— 依赖与构建产物，由 `npm install` / `react-scripts build` 重新生成
- `*.tar.gz` `*.zip` `*.part.*` 等打包快照 —— 体积大且易过期，仅本地留档
- `.codebuddy/` —— 沙箱 / Agent 工作区，非项目源码
- `.env` `*.key` `*.pem` —— 任何密钥与机密

> 注意：根目录遗留的 `FilesPage.tsx`、`proxy.js` 为重复副本，已忽略，以 `demo-frontend/` 下为准。

---

## 2. 分支模型

采用简化版 **Git Flow**，长期分支两条：

| 分支 | 用途 | 来源 | 合入 |
|---|---|---|---|
| `main` | 稳定可发布版本，每次打 tag | `develop` | 仅通过 `release/*` 或 `hotfix/*` |
| `develop` | 日常集成分支，功能汇总 | `feature/*` | `feature/*` → `develop` |

临时分支（用完即删）：

| 前缀 | 示例 | 说明 |
|---|---|---|
| `feature/` | `feature/avatar-edit` | 单功能开发，从 `develop` 切出 |
| `release/` | `release/v0.8.0` | 发布前冻结，只修 bug，合入 `main`+`develop` |
| `hotfix/` | `hotfix/login-crash` | 线上紧急修复，从 `main` 切出 |

**工作流**：`develop` → 切 `feature/xxx` → 开发完合回 `develop` → 里程碑切 `release/vX.Y.Z` → 测完合 `main` 并打 tag → 必要时 `hotfix/` 修 `main`。

---

## 3. 版本号规则（语义化 + 项目阶段）

版本号格式：**`v主.次.修订[-阶段后缀]`**

| 段 | 触发 | 示例 |
|---|---|---|
| 主版本 `主` | 架构重构 / 商业模式重大变更（如接入区块链自动付账） | `v1.0.0` |
| 次版本 `次` | 新增一类平台能力或主要角色功能 | `v0.8.0` |
| 修订 `修订` | Bug 修复 / 小优化 | `v0.7.2` |

**阶段后缀**（与产品形态绑定）：

| 后缀 | 含义 | 说明 |
|---|---|---|
| 无后缀 | 正式版 | 按 LICENSE 年费 / 永久 / 到期失效 三种授权 |
| `-demo` | DEMO 演示版 | 演示数据、核心功能 ≤20%、到期自动失效、可续期 |

示例：`v0.7.1-demo`（当前）、`v1.0.0`（首个正式版）、`v1.0.0-demo`（正式版同期演示）。

**多平台 / 多语言**：网页 / APP / PC / 小程序为**同源构建**，共用同一版本号；语言版本（先 zh-CN，后其他）**不改变**版本号，仅在构建参数中区分。

---

## 4. 标签（Tag）规范

- 每个发布到 `main` 的版本打 **annotated tag**：`git tag -a vX.Y.Z -m "说明"`
- 标签即"可回滚的里程碑"，与 LICENSE / DEMO 失效期一一对应
- DEMO 续期不改版本号，仅在部署配置中调整失效日期；若功能有变则升修订号

---

## 5. 提交信息（Commit Message）规范

格式：`类型: 简述`（必要时空行写详情）

| 类型 | 含义 |
|---|---|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档（含策略/调研文档） |
| `refactor` | 重构（无功能变化） |
| `chore` | 构建/配置/依赖等非功能改动 |

示例：
```
feat: 新增用户名+密码登录与 admin 预设凭证
fix: 修复普通用户误获 platform 角色权限
docs: 补充 Day3 DEMO 概要设计中的 NDA 流程
```

---

## 6. Agent（WorkBuddy）工作约定

作为 AI 代理，每次改动遵循：

1. 在 `develop` 上切 `feature/xxx` 开发；
2. 改完前端源码后**必须** `react-scripts build`（预览由 `proxy.js` 托管 `build/`，否则不生效）；
3. 提交到 `feature` 分支，PR/合入 `develop`；
4. 里程碑节点由我在 `develop` 切 `release/vX.Y.Z`、测完合 `main` 并打 tag；
5. 大改同步提升 `public/index.html` 中的缓存版本号（如 `rzq-v9`），强制浏览器刷新，避免"旧版残留"。

---

## 7. 远端备份（可选）

当前为本地仓库。如需云端备份与多人协作，可连接远程（GitHub / 工蜂 / CNB / Gitee）：

```bash
git remote add origin <仓库地址>
git push -u origin main --tags
git push origin develop
```

---

## 8. 常用命令速查

```bash
git status                      # 看当前改动
git log --oneline --decorate    # 看版本历史
git show v0.7.1                 # 看某版本改了什么
git diff v0.7.1 v0.7.2          # 对比版本差异
git checkout -b feature/xxx develop   # 开功能分支
git tag -a v0.7.2 -m "说明"     # 打标签
git revert <commit>             # 安全回退（保留历史）
```
