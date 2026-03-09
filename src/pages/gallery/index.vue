<template>
  <view class="gallery-page">
    <view class="header">
      <view class="header-top">
        <view class="back-btn" @click="goBack">
          <text class="back-text">◄ Back</text>
        </view>
        <text class="title">暗房</text>
      </view>
      <text class="subtitle">{{ savedPhotos.length }} Frames Developed</text>
    </view>
    
    <scroll-view class="photo-grid" scroll-y>
      <view class="grid-container">
        <view class="photo-item" v-for="(photo, index) in savedPhotos" :key="index" @click="previewPhoto(index)">
          <image :src="photo" mode="aspectFill" class="photo-img"></image>
          <!-- Frame overlay SVG could go here -->
          <view class="photo-frame-border"></view>
        </view>
        
        <view v-if="savedPhotos.length === 0" class="empty-state">
           <text class="empty-text">No exposures yet.</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFilmStore } from '../../store/filmStore';

const filmStore = useFilmStore();
const savedPhotos = computed(() => filmStore.savedPhotos);

const previewPhoto = (index: number) => {
    uni.previewImage({
        urls: savedPhotos.value,
        current: index
    });
};

const goBack = () => {
    uni.navigateBack();
};
</script>

<style scoped lang="scss">
.gallery-page {
  width: 100vw;
  height: 100vh;
  background-color: #111;
  display: flex;
  flex-direction: column;
}

.header {
  padding: max(50px, env(safe-area-inset-top)) 20px 20px;
  background: linear-gradient(to bottom, #222, #111);
  border-bottom: 1px solid #333;
  
  .header-top {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 5px;
    
    .back-btn {
      position: absolute;
      left: 0;
      padding: 5px 15px 5px 0;
      
      .back-text {
        color: #ff9d00;
        font-size: 16px;
        font-family: 'Courier New', Courier, monospace;
      }
    }
  }

  .title {
    font-size: 24px;
    font-weight: bold;
    color: #eee;
    letter-spacing: 2px;
  }
  
  .subtitle {
    display: block;
    text-align: center;
    font-size: 14px;
    color: #888;
    font-family: 'Courier New', Courier, monospace;
  }
}

.photo-grid {
  flex: 1;
  padding: 10px;
}

.grid-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding-bottom: 40px;
}

.photo-item {
  width: 48%;
  aspect-ratio: 3/4;
  margin-bottom: 15px;
  position: relative;
  background: #222;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
  border-radius: 4px;
  overflow: hidden;
  
  // Staggered smooth load
  opacity: 0;
  animation: fadeInSlide 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  
  @for $i from 1 through 20 {
      &:nth-child(#{$i}) {
          animation-delay: #{$i * 0.05}s;
      }
  }
  
  .photo-img {
    width: 100%;
    height: 100%;
    display: block;
    transition: transform 0.3s;
  }
  
  &:active .photo-img {
      transform: scale(0.97);
  }
  
  .photo-frame-border {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border: 1px solid rgba(255,255,255,0.1);
    pointer-events: none;
  }
}

@keyframes fadeInSlide {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.empty-state {
  width: 100%;
  padding: 60px 0;
  text-align: center;
  
  .empty-text {
    color: #555;
    font-family: 'Courier New', Courier, monospace;
  }
}
</style>
