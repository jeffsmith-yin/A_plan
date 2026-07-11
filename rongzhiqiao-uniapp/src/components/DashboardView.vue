<script setup>
import { S } from '@/store/demo'

const g = S.stats

function card(n, l, d) {
  return { n, l, d }
}
const cells = [
  card(g.experts, '专家人数', '+12 环比'),
  card(g.enterprises, '企业人数', '+5 环比'),
  card(g.ai, 'AI 专家人数', '+8 环比'),
  card(g.products, '产品个数', '+3 环比'),
  card(g.demos, 'DEMO 产品个数', '+2 环比'),
  card(g.day.toFixed(1) + '万', '日交易量', '+6.2%'),
  card(g.week.toFixed(1) + '万', '周交易量', '+4.1%'),
  card(g.month.toFixed(1) + '万', '月交易量', '+9.7%'),
  card(g.year.toFixed(1) + '万', '年交易量', '（满一年显示环比）'),
  card('—', '环比指标', '运营满 1 年后开放')
]
</script>

<template>
  <view>
    <view class="card">
      <view class="h3"><text>平台实时数据看板</text><text class="tag demo">演示</text></view>
      <text class="muted">平台方视角；运营满一年后提供各环比指标（本 DEMO 以占位环比示意）</text>
    </view>

    <view class="stat-grid">
      <view v-for="(c, i) in cells" :key="i" class="stat">
        <view class="n">{{ c.n }}</view>
        <view class="l">{{ c.l }}</view>
        <view v-if="c.d" class="d" :class="c.d.includes('+') ? 'up' : 'down'">{{ c.d }}</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.h3 {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 20rpx;
}
</style>
