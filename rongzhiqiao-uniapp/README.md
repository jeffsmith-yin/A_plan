# 融智桥 DEMO · 跨端小程序（Uni-app Vue3 + Vite）

把《融智桥 DEMO 原型（H5）》改造为**真跨端工程**：可编译到 **微信小程序 / H5 / App**，
并接入 `uni.*` 本地存储与**联盟链测试网适配层**。对应 PRD §4（P0）与 §6「多端降维」。

## 技术栈
- [uni-app](https://uniapp.dcloud.net.cn/)（Vue 3 + Vite）
- 状态：`src/store/demo.js`（`reactive` 单例 + `uni.*` 持久化）
- 联盟链：`src/chain/ChainAdapter.js`（可插拔：当前为测试网模拟，预留 TBaaS / 蚂蚁链）

## 目录
```
rongzhiqiao-uniapp/
├── index.html
├── package.json
├── vite.config.js            # @ -> src 别名
├── src/
│   ├── main.js / App.vue
│   ├── pages.json / manifest.json
│   ├── uni.scss              # 全局设计令牌 + 通用类（rpx 跨端等比）
│   ├── store/demo.js         # 全局状态 + uni.* 持久化
│   ├── chain/ChainAdapter.js # 联盟链测试网适配层（2-of-3 多签 + 法币结算）
│   ├── utils/constants.js    # 角色 / Tab / 步骤 常量
│   ├── pages/index/index.vue # 容器：顶部角色切换 + 到期横幅 + 视图路由 + 底部 tab
│   └── components/
│       ├── HomeView.vue      # 制造业 DEMO 闯关（5 步闭环）
│       ├── ChatView.vue      # 三方实时交流 + 进度留痕
│       ├── DashboardView.vue # 平台实时数据看板（10 类指标）
│       └── MineView.vue      # 名片 / 推荐裂变 / NDA / 收费模式
```

## 常用命令
```bash
npm install
npm run dev:h5          # 本地 H5 开发（http://localhost:5173）
npm run build:h5        # 产出 dist/build/h5
npm run dev:mp-weixin   # 微信小程序开发（用微信开发者工具导入 dist/dev/mp-weixin）
npm run build:mp-weixin # 产出 dist/build/mp-weixin
npm run build:app       # 产出 App 工程
```

## 合规要点
- 全部为 **DEMO 演示数据**，不触达真实业务 / 真实资金。
- 分账采用「**透明智能分账协议**」：里程碑达成 → 2-of-3 多签 → **人民币法币**结算。
- **严禁公链代币 / 稳定币**；资金经持牌托管，符合「币链分离」监管（银发〔2026〕42 号）。
- `ChainAdapter.settle()` 中已标注 `// [REAL-CHAIN]`，接入真实联盟链只需替换该段并 `setMode()`。
