<template>
  <view class="settings-page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-text">◄ Back</text>
      </view>
      <text class="title">偏好设置</text>
    </view>
    
    <view class="settings-list">
      <view class="setting-item">
        <text class="label">机械震动反馈 (Haptics)</text>
        <switch :checked="hapticsEnabled" color="#ff9d00" @change="onHapticsChange"></switch>
      </view>
      
      <view class="setting-item">
        <text class="label">物理音效 (Mechanical Sound)</text>
        <switch :checked="soundEnabled" color="#ff9d00" @change="onSoundChange"></switch>
      </view>
    </view>
    
    <view class="about-section">
      <text class="retro-text">RetroLens Core Engine v1.0.0</text>
      <text class="retro-text sub">60FPS Zero-GC Pipeline</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePreferenceStore } from '../../store/preferenceStore';

const prefStore = usePreferenceStore();

const hapticsEnabled = computed(() => prefStore.hapticsEnabled);
const soundEnabled = computed(() => prefStore.soundEnabled);

const onHapticsChange = (e: any) => {
    if(prefStore.hapticsEnabled !== e.detail.value) {
       prefStore.toggleHaptics();
    }
};

const onSoundChange = (e: any) => {
    if(prefStore.soundEnabled !== e.detail.value) {
       prefStore.toggleSound();
    }
};

const goBack = () => {
    uni.navigateBack();
};
</script>

<style scoped lang="scss">
.settings-page {
  width: 100vw;
  height: 100vh;
  background-color: #111;
  color: #eee;
}

.header {
  padding: max(50px, env(safe-area-inset-top)) 20px 20px;
  border-bottom: 1px solid #333;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  .back-btn {
    position: absolute;
    left: 20px;
    padding: 5px 15px 5px 0;
    
    .back-text {
      color: #ff9d00;
      font-size: 16px;
      font-family: 'Courier New', Courier, monospace;
    }
  }

  .title {
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 1px;
  }
}

.settings-list {
  padding: 0 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #222;
  
  opacity: 0;
  animation: slideInRight 0.4s ease-out forwards;
  
  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
  
  .label {
    font-size: 16px;
    color: #ccc;
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.about-section {
  position: absolute;
  bottom: 40px;
  left: 0;
  width: 100%;
  text-align: center;
  opacity: 0;
  animation: fadeIn 0.8s ease-in forwards 0.4s;
  
  .retro-text {
    display: block;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    color: #ff9d00;
    margin-bottom: 5px;
    
    &.sub {
      color: #666;
      font-size: 12px;
    }
  }
}

@keyframes fadeIn {
    to { opacity: 1; }
}
</style>
