<script setup>
import { ref } from 'vue'
import { S } from '@/store/demo'
import { LIC_MODES } from '@/utils/constants'

const showNda = ref(false)
const recDraft = ref('')

function saveProfile() {
  if (!S.joined) {
    S.joined = true
    S.points += 10
    uni.showToast({ title: '已入驻，积分 +10', icon: 'none' })
  } else {
    uni.showToast({ title: '名片已保存', icon: 'none' })
  }
}

function recommend() {
  const v = recDraft.value.trim()
  if (!v) {
    uni.showToast({ title: '请输入被推荐人标识', icon: 'none' })
    return
  }
  if (S.recommended.includes(v)) {
    uni.showToast({ title: '该成员已推荐，不重复计分', icon: 'none' })
    return
  }
  S.recommended.push(v)
  S.points += 2
  recDraft.value = ''
  uni.showToast({ title: '推荐成功，积分 +2', icon: 'none' })
}

function setLic(mode) {
  S.lic = mode
  uni.showToast({ title: '已选择：' + mode, icon: 'none' })
}

function openNDA() {
  showNda.value = true
}
function signNDA() {
  S.nda = true
  showNda.value = false
  uni.showToast({ title: 'NDA 已签署（演示）', icon: 'none' })
}
</script>

<template>
  <view>
    <!-- 我的名片 -->
    <view class="card wm">
      <view class="h3"><text>我的名片</text><text class="tag demo">演示</text></view>
      <view class="field">
        <text class="label">姓名 / 昵称</text>
        <input v-model="S.profile.name" placeholder="如：王工" />
      </view>
      <view class="field">
        <text class="label">电话</text>
        <input v-model="S.profile.phone" placeholder="138****" />
      </view>
      <view class="field">
        <text class="label">微信</text>
        <input v-model="S.profile.wechat" placeholder="wxid_***" />
      </view>
      <view class="field">
        <text class="label">职务</text>
        <input v-model="S.profile.title" placeholder="如：前生产总监" />
      </view>
      <view class="field">
        <text class="label">个人介绍（重点）</text>
        <textarea v-model="S.profile.intro" placeholder="行业年限、擅长领域、代表案例、可交付 AI 方案方向" />
      </view>
      <view class="btn" @tap="saveProfile">{{ S.joined ? '保存名片' : '入驻并生成名片（+10 分）' }}</view>
      <view v-if="S.joined" class="hint" style="background:#e7f6ee;color:#1f9d6b">已入驻 · 当前积分 <b>{{ S.points }}</b> 分</view>
    </view>

    <!-- 推荐裂变 -->
    <view class="card">
      <view class="h3"><text>推荐裂变</text><text class="muted">新成员+10 / 推荐+2 / 不重复</text></view>
      <view class="field">
        <text class="label">推荐成员（微信/手机）</text>
        <input v-model="recDraft" placeholder="输入被推荐人标识" />
      </view>
      <view class="btn warm" @tap="recommend">推荐（+2 分，去重）</view>
      <view v-if="S.recommended.length">
        <view v-for="(m, i) in S.recommended" :key="i" class="kv">
          <text>已推荐 #{{ i + 1 }}</text><text>+2 分 · {{ m }}</text>
        </view>
      </view>
      <text v-else class="muted">暂无推荐记录</text>
    </view>

    <!-- NDA -->
    <view class="card">
      <view class="h3"><text>保密协议 NDA</text></view>
      <text class="muted">参与 DEMO 须签署；含动态数字水印（钱包公钥+注册信息），到期撤销 API Key</text>
      <view v-if="S.nda" class="hint" style="background:#e7f6ee;color:#1f9d6b">✅ 已签署（演示）</view>
      <view v-else class="btn ghost" @tap="openNDA">在线签署 NDA</view>
    </view>

    <!-- 收费与授权模式 -->
    <view class="card">
      <view class="h3"><text>收费与授权模式</text><text class="muted">最终产品三选一</text></view>
      <view class="seg">
        <view
          v-for="m in LIC_MODES"
          :key="m"
          :class="{ on: S.lic === m }"
          @tap="setLic(m)"
        >{{ m }}</view>
      </view>
      <text class="muted" style="margin-top:16rpx;display:block">DEMO 阶段仅展示，不产生真实订单。</text>
    </view>

    <!-- NDA 弹层 -->
    <view v-if="showNda" class="mask" @tap.self="showNda = false">
      <view class="sheet">
        <text class="close" @tap="showNda = false">×</text>
        <view class="h3"><text>保密协议（NDA）在线签署</text><text class="tag demo">演示</text></view>
        <view class="wm nda-box">
          <text class="p">甲方（平台/参与方）与乙方就「生产排产与交期预警 DEMO」中所涉业务逻辑、脱敏数据与方案草案，约定保密义务。任何一方不得截屏外传或逆向提取核心 AI 逻辑；DEMO 到期后台一键撤销 API Key。</text>
          <text class="muted wm-note">数字水印：含签署方钱包公钥与注册信息（防泄露溯源）</text>
        </view>
        <view class="btn" @tap="signNDA">✍️ 我已知悉并签署（演示）</view>
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
.label {
  font-size: 24rpx;
  color: var(--sub);
  display: block;
  margin-bottom: 8rpx;
}
.nda-box {
  border: 1rpx solid var(--line);
  border-radius: 20rpx;
  padding: 24rpx;
  background: #fafbfc;
}
.p {
  font-size: 26rpx;
  line-height: 1.7;
}
.wm-note {
  font-size: 22rpx;
  display: block;
  margin-top: 12rpx;
}
</style>
