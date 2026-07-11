<script setup>
import { S } from '@/store/demo'
import { TABS, ROLES, ROLE_ORDER } from '@/utils/constants'
import HomeView from '@/components/HomeView.vue'
import ChatView from '@/components/ChatView.vue'
import DashboardView from '@/components/DashboardView.vue'
import MineView from '@/components/MineView.vue'

function setRole(r) {
  S.role = r
}

function go(v) {
  S.view = v
}

function renew() {
  S.expiry += 14
  uni.showToast({ title: '已续期，失效期延长 14 天', icon: 'none' })
}
</script>

<template>
  <view class="phone">
    <!-- 顶部栏 -->
    <view class="topbar">
      <view class="t1">
        <text>融智桥 · DEMO 原型</text>
        <text class="badge">演示数据</text>
      </view>
      <text class="t2">专家 + AI 人才 + 中小微企业 · 可信协作平台（功能开放度 ≤50%）</text>

      <!-- 角色切换 -->
      <scroll-view class="roles" scroll-x :show-scrollbar="false">
        <view class="roles-inner">
          <view
            v-for="r in ROLE_ORDER"
            :key="r"
            class="role"
            :class="{ active: S.role === r }"
            @tap="setRole(r)"
          >{{ ROLES[r].ic }} {{ ROLES[r].name }}</view>
        </view>
      </scroll-view>
    </view>

    <!-- 到期横幅 -->
    <view class="expiry">
      <text>⏳ DEMO 剩余 <text class="b">{{ S.expiry }}</text> 天（到期自动失效；演示数据）</text>
      <view class="renew" @tap="renew">续期 +14 天</view>
    </view>

    <!-- 视图区 -->
    <scroll-view class="view" scroll-y>
      <HomeView v-if="S.view === 'home'" />
      <ChatView v-else-if="S.view === 'chat'" />
      <DashboardView v-else-if="S.view === 'dashboard'" />
      <MineView v-else />
    </scroll-view>

    <!-- 底部 tab -->
    <view class="tabbar">
      <view
        v-for="t in TABS"
        :key="t.key"
        class="tab"
        :class="{ active: S.view === t.key }"
        @tap="go(t.key)"
      >
        <text class="ic">{{ t.ic }}</text>
        <text>{{ t.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.phone {
  width: 100%;
  max-width: 860rpx;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 0 80rpx rgba(0, 0, 0, 0.18);
}
.topbar {
  background: linear-gradient(135deg, var(--brand), var(--brand-d));
  color: #fff;
  padding: calc(var(--status-bar-height, 0px) + 28rpx) 32rpx 24rpx;
}
.t1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 32rpx;
}
.badge {
  background: rgba(255, 255, 255, 0.22);
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 40rpx;
}
.t2 {
  font-size: 22rpx;
  opacity: 0.85;
  margin-top: 6rpx;
  display: block;
}
.roles {
  margin-top: 20rpx;
  white-space: nowrap;
}
.roles-inner {
  display: inline-flex;
  gap: 12rpx;
}
.role {
  flex: 0 0 auto;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
}
.role.active {
  background: #fff;
  color: var(--brand);
  font-weight: 700;
}
.expiry {
  background: var(--warm-l);
  color: var(--warm);
  font-size: 24rpx;
  padding: 16rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.expiry .b {
  font-weight: 700;
}
.renew {
  background: var(--warm);
  color: #fff;
  border-radius: 16rpx;
  padding: 8rpx 20rpx;
  font-size: 22rpx;
}
.view {
  flex: 1;
  padding: 28rpx 28rpx 0;
  box-sizing: border-box;
}
.tabbar {
  display: flex;
  background: #fff;
  border-top: 1rpx solid var(--line);
}
.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0 20rpx;
  font-size: 22rpx;
  color: var(--sub);
}
.tab.active {
  color: var(--brand);
  font-weight: 700;
}
.tab .ic {
  font-size: 40rpx;
  display: block;
  margin-bottom: 4rpx;
}
</style>
