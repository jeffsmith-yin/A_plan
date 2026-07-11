<script setup>
import { computed } from 'vue'
import { S, resetDemo } from '@/store/demo'
import { STEP_TITLES } from '@/utils/constants'
import { chain } from '@/chain/ChainAdapter'

const hasRule = computed(() => Object.values(S.rules).some((x) => x))

function toggleRule(k) {
  S.rules[k] = !S.rules[k]
}

function nextStep() {
  S.step++
}

function approve() {
  S.step++
  uni.showToast({ title: '已批准，进入分账环节', icon: 'none' })
}

function reject() {
  uni.showToast({ title: '已打回，AI 人才将收到修改通知（演示）', icon: 'none' })
}

async function doSettle() {
  if (S.settled) return
  uni.showLoading({ title: '多签出块中…', mask: true })
  await chain.settle({
    expertAmt: 1800,
    aiAmt: 1200,
    platformAmt: 500,
    memo: '制造业生产排产 DEMO 里程碑分账（演示）'
  })
  uni.hideLoading()
  S.settled = true
  S.stats.day += 3.0
  S.stats.month += 3.0
  S.stats.year += 3.0
  uni.showToast({ title: '联盟链+法币分账完成（演示）', icon: 'none' })
}
</script>

<template>
  <view>
    <view class="card">
      <text class="step-title">{{ STEP_TITLES[S.step] }}</text>
      <view class="steps">
        <view v-for="i in 5" :key="i" class="step" :class="{ on: i - 1 <= S.step }"></view>
      </view>
    </view>

    <!-- 步骤 0：企业提出痛点 -->
    <view v-if="S.step === 0" class="card wm">
      <view class="h3"><text>制造业 DEMO：生产排产与交期风险预警</text><text class="tag demo">演示</text><text class="tag lim">功能≤50%</text></view>
      <text class="muted">小型制造工厂痛点（演示数据）</text>
      <view class="field">
        <text class="label">企业代表描述痛点</text>
        <textarea v-model="S.scenario.pain" placeholder="描述您的排产 / 交期痛点" />
      </view>
      <view class="btn" @tap="nextStep">确认痛点，进入专家诊断 →</view>
    </view>

    <!-- 步骤 1：专家诊断定规则 -->
    <view v-else-if="S.step === 1" class="card">
      <view class="h3"><text>② 专家诊断：定义排产约束</text><text class="muted">（点选规则卡）</text></view>
      <view class="rule" :class="{ sel: S.rules.cap }" @tap="toggleRule('cap')">
        <view class="ck">{{ S.rules.cap ? '✓' : '' }}</view>
        <view><text class="rt">设备产能上限</text><br /><text class="muted">限定单设备日最大工时</text></view>
      </view>
      <view class="rule" :class="{ sel: S.rules.seq }" @tap="toggleRule('seq')">
        <view class="ck">{{ S.rules.seq ? '✓' : '' }}</view>
        <view><text class="rt">工序先后顺序</text><br /><text class="muted">强制 #2→#5 顺排</text></view>
      </view>
      <view class="rule" :class="{ sel: S.rules.change }" @tap="toggleRule('change')">
        <view class="ck">{{ S.rules.change ? '✓' : '' }}</view>
        <view><text class="rt">换型时间并入夜班</text><br /><text class="muted">降低白班换型损耗</text></view>
      </view>
      <view class="rule" :class="{ sel: S.rules.lead }" @tap="toggleRule('lead')">
        <view class="ck">{{ S.rules.lead ? '✓' : '' }}</view>
        <view><text class="rt">交期红线</text><br /><text class="muted">标红超期订单</text></view>
      </view>
      <view class="btn" :class="{ disabled: !hasRule }" @tap="hasRule && nextStep()">提交规则，交由 AI 人才实现 →</view>
    </view>

    <!-- 步骤 2：AI 人才实现 -->
    <view v-else-if="S.step === 2" class="card wm">
      <view class="h3"><text>③ AI 人才实现：配置排产预警 Agent</text><text class="tag demo">演示</text></view>
      <view class="kv"><text>输入（脱敏订单）</text><text>12 条 / 演示</text></view>
      <view class="kv"><text>排产草案</text><text class="right">设备#1 优先 D-2207；#2→#5 顺排</text></view>
      <view class="kv"><text>高风险预警</text><text class="right down">D-2207 延误3天、D-2210 缺料</text></view>
      <view class="hint">核心功能（实际排产引擎）仅开放 20%，其余为演示占位。</view>
      <view class="btn warm" @tap="nextStep">生成草案，提交企业验收 →</view>
    </view>

    <!-- 步骤 3：企业验收 -->
    <view v-else-if="S.step === 3" class="card">
      <view class="h3"><text>④ 企业验收：游戏化审阅</text><text class="muted">（点选批准 / 打回）</text></view>
      <view class="kv"><text>延误天数（优化前）</text><text class="down">{{ S.scenario.delayBefore }} 天</text></view>
      <view class="kv"><text>延误天数（优化后·演示）</text><text class="up">{{ S.scenario.delayAfter }} 天</text></view>
      <view class="rule" @tap="approve"><view class="ck">✓</view><view><text class="rt">批准该排产草案</text><br /><text class="muted">并触发里程碑分账</text></view></view>
      <view class="rule" @tap="reject">
        <view class="ck">↺</view><view><text class="rt">打回，要求调整工序顺序</text></view>
      </view>
    </view>

    <!-- 步骤 4：联盟链 + 法币分账 -->
    <view v-else class="card">
      <view class="h3"><text>⑤ 联盟链 + 法币 自动分账</text><text class="tag demo">演示</text></view>
      <text class="muted">里程碑达成 → 智能合约按 2-of-3 多签触发 → 人民币法币结算（非公链代币）</text>
      <view class="flow">
        <view class="node" :class="{ ok: S.settled }">专家签章</view><text class="arrow">→</text>
        <view class="node" :class="{ ok: S.settled }">企业签章</view><text class="arrow">→</text>
        <view class="node" :class="{ ok: S.settled }">平台仲裁</view><text class="arrow">→</text>
        <view class="node" :class="{ ok: S.settled }">法币到账</view>
      </view>
      <view class="kv"><text>专家（35+）分得</text><text>¥1,800 · 演示</text></view>
      <view class="kv"><text>AI 人才分得</text><text>¥1,200 · 演示</text></view>
      <view class="kv"><text>平台 take rate(10–20%) + 链上清算费(1–3%)</text><text>¥500</text></view>
      <view class="hint">对外统一表述为「透明智能分账协议」；资金经持牌托管，合规（币链分离）。</view>
      <view class="btn" :class="{ disabled: S.settled }" @tap="doSettle">{{ S.settled ? '✅ 已分账（演示）' : '触发智能合约分账' }}</view>
      <view class="btn ghost" @tap="resetDemo">重置 DEMO 闯关</view>
    </view>
  </view>
</template>

<style scoped>
.step-title {
  font-size: 26rpx;
  font-weight: 700;
  display: block;
}
.h3 {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 20rpx;
  line-height: 1.3;
}
.rt {
  font-weight: 600;
}
.right {
  max-width: 60%;
  text-align: right;
}
.btn.disabled {
  background: #c7d0d6;
  color: #fff;
}
</style>
