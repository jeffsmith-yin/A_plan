<script setup>
import { ref } from 'vue'
import { S } from '@/store/demo'
import { ROLES } from '@/utils/constants'

const draft = ref('')

function sendMsg() {
  const v = draft.value.trim()
  if (!v) return
  S.chat.push({ r: S.role, t: v })
  draft.value = ''
}
</script>

<template>
  <view>
    <view class="card">
      <view class="h3"><text>三方实时交流 + 进度留痕</text><text class="tag demo">演示</text></view>
      <text class="muted">专家 / AI 人才 / 企业代表 实时反馈进展（当前视角：{{ ROLES[S.role].name }}）</text>
    </view>

    <view
      v-for="(m, i) in S.chat"
      :key="i"
      class="msg"
      :class="{ me: m.r === S.role }"
    >
      <view class="av" :class="ROLES[m.r].cls">{{ ROLES[m.r].ic }}</view>
      <view class="b">
        <text>{{ m.t }}</text>
        <text class="muted who">{{ ROLES[m.r].name }}</text>
      </view>
    </view>

    <view class="chat-input">
      <input v-model="draft" placeholder="输入消息（演示，不发送真实数据）" confirm-type="send" @confirm="sendMsg" />
      <view class="send" @tap="sendMsg">发送</view>
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
.who {
  font-size: 20rpx;
  margin-top: 6rpx;
  display: block;
}
.send {
  background: var(--brand);
  color: #fff;
  border-radius: 40rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  font-size: 26rpx;
}
</style>
