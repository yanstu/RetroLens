<template>
  <view class="camera-page" @touchstart="onPinchStart" @touchmove="onPinchMove">
    <view class="viewfinder-container" :class="ratioClass">
       <CameraView ref="cameraRef" :activeFilter="currentFilter" :zoom="zoomLevel" :ratio="currentRatio" />
       
       <!-- Flash Overlay -->
       <view class="flash-overlay" :class="{ 'flash-active': isFlashing }"></view>
    </view>

    <view class="camera-ui">
      <!-- Top Info Bar with Safe Area -->
      <view class="top-bar-container">
        <view class="settings-top-left">
           <view class="ratio-btn" @click="toggleRatio">{{ currentRatio }}</view>
           <view class="zoom-indicator" v-if="zoomLevel > 1">{{ zoomLevel.toFixed(1) }}x</view>
        </view>
      </view>
      
      <!-- Bottom UI Area with Safe Area -->
      <view class="bottom-area">
        <!-- Filter horizontal picker -->
        <RetroDial 
          class="filter-dial"
          v-model="currentFilter"
          :items="filterOptions"
          @change="onFilterChange"
        />
        
        <!-- Bottom Controls -->
        <view class="bottom-controls">
          <view class="side-btn gallery-btn" @click.stop="goToGallery"></view>
          
          <view class="shutter-button-wrapper" @touchstart.stop="onShutterPress" @touchend.stop="onShutterRelease">
             <view class="shutter-button" :class="{ 'pressing': isPressingShutter }">
                <view class="shutter-inner"></view>
             </view>
          </view>
          
          <view class="side-btn settings-btn" @click.stop="goToSettings"></view>
        </view>
      </view>
    </view>
    
    <!-- Developing Loading Overlay -->
    <view class="developing-overlay" v-if="isDeveloping">
       <view class="spinner"></view>
       <text class="developing-text">DEVELOPING...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FilterType } from '../../core/shader/ShaderLib';
import CameraView from '../../components/camera-view/CameraView.vue';
import RetroDial from '../../components/retro-dial/RetroDial.vue';
import { useFilmStore } from '../../store/filmStore';
import { usePreferenceStore } from '../../store/preferenceStore';
import { AudioManager } from '../../bridge/audio/AudioManager';
import { HapticsManager } from '../../bridge/haptics/HapticsManager';

const filmStore = useFilmStore();
const prefStore = usePreferenceStore();

const audio = AudioManager.getInstance();
const haptics = HapticsManager.getInstance();

const cameraRef = ref<any>(null);
const currentFilter = ref<FilterType>(filmStore.currentFilm);
const remainingShots = computed(() => filmStore.remainingShots); // Remove this entirely

const isPressingShutter = ref(false);
const isFlashing = ref(false);
const isDeveloping = ref(false);

const zoomLevel = ref(1);
const ratios = ['4:3', '1:1', '16:9'];
const currentRatioIdx = ref(0);
const currentRatio = computed(() => ratios[currentRatioIdx.value]);
const ratioClass = computed(() => `ratio-${currentRatio.value.replace(':', '-')}`);

let initialPinchDistance = 0;
let initialZoom = 1;

const filterOptions = Object.values(FilterType).map(f => ({
    label: f.replace('-', '\n'), 
    value: f
}));

onMounted(() => {
    // Sync settings
    haptics.setEnabled(prefStore.hapticsEnabled);
    if (prefStore.soundEnabled) {
       audio.preloadAll();
       // subtle static hum
       audio.play('static', true); 
    }
});

const onFilterChange = (val: FilterType) => {
    filmStore.setFilm(val);
};

const toggleRatio = () => {
    currentRatioIdx.value = (currentRatioIdx.value + 1) % ratios.length;
};

const getPinchDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

const onPinchStart = (e: any) => {
    if (e.touches && e.touches.length === 2) {
        initialPinchDistance = getPinchDistance(e.touches);
        initialZoom = zoomLevel.value;
    }
};

const onPinchMove = (e: any) => {
    if (e.touches && e.touches.length === 2 && initialPinchDistance > 0) {
        const currentDistance = getPinchDistance(e.touches);
        const scale = currentDistance / initialPinchDistance;
        // Limit zoom strictly
        let newZoom = initialZoom * scale;
        if (newZoom < 1) newZoom = 1;
        if (newZoom > 5) newZoom = 5;
        zoomLevel.value = newZoom;
    }
};

const onShutterPress = () => {
    if (isDeveloping.value) return;
    isPressingShutter.value = true;
};

const onShutterRelease = async () => {
    if (!isPressingShutter.value) return;
    isPressingShutter.value = false;
    
    haptics.shutterClick();
    if (prefStore.soundEnabled) audio.play('shutter');
    
    // Trigger Flash Animation
    isFlashing.value = true;
    setTimeout(() => {
        isFlashing.value = false;
    }, 300);
    
    try {
        isDeveloping.value = true;
        // Let the UI thread breathe to show the spinner before heavy blocking snapshot pipeline
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const photoData = await cameraRef.value?.takePhoto();
        if (photoData && (photoData.base64 || photoData.tempFilePath)) {
            // Determine best format to save (local temp path is lighter than heavy base64 strings if avaiable)
            // MP-WEIXIN gives native local paths. H5 gives DataUrl base64.
            let imageSource = photoData.tempFilePath ? photoData.tempFilePath : photoData.base64;
            
            // #ifdef MP-WEIXIN
            if (photoData.tempFilePath) {
                try {
                    const fs = uni.getFileSystemManager();
                    const savedPath = `${uni.env.USER_DATA_PATH}/photo_${Date.now()}.jpg`;
                    fs.saveFileSync(photoData.tempFilePath, savedPath);
                    imageSource = savedPath; // Replace with permanent user path
                } catch(e) {
                    console.error("Failed persisting image locally", e);
                }
            }
            // #endif
            
            filmStore.takePhoto(imageSource);
            
            // #ifdef MP-WEIXIN
            if (photoData.tempFilePath) {
                await new Promise((resolve, reject) => {
                    uni.saveImageToPhotosAlbum({
                        filePath: imageSource, // Use the new persistent path because the temp file was moved
                        success: () => {
                            uni.showToast({ title: 'Saved to Album', icon: 'success' });
                            resolve(true);
                        },
                        fail: (err) => {
                            // Usually user denied permission
                            if (err.errMsg === 'saveImageToPhotosAlbum:fail auth deny') {
                                uni.showToast({ title: 'Require Permission', icon: 'none' });
                            } else {
                                uni.showToast({ title: 'Save failed', icon: 'none' });
                            }
                            reject(err);
                        }
                    });
                });
            }
            // #endif
        }
        isDeveloping.value = false;
        
        // Play wind sound slightly after shutter
        setTimeout(() => {
            if (prefStore.soundEnabled) audio.play('wind');
            haptics.filmWind();
        }, 300);
    } catch (e) {
        isDeveloping.value = false;
        console.error('Failed to take photo', e);
        uni.showToast({ title: 'Capture Error', icon: 'none' });
    }
};

const goToGallery = () => {
    uni.navigateTo({
        url: '/pages/gallery/index',
        fail: () => {
            uni.showToast({ title: 'Gallery locked', icon: 'none' });
        }
    });
};

const goToSettings = () => {
    uni.navigateTo({
        url: '/pages/settings/index',
        fail: () => {
            uni.showToast({ title: 'Settings locked', icon: 'none' });
        }
    });
};
</script>

<style scoped lang="scss">
.camera-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  background-color: #000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.viewfinder-container {
  width: 100%;
  height: 100%;
  position: absolute;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
  
  &.ratio-4-3 {
     width: 100vw;
     height: calc(100vw * 4 / 3);
     top: 50%;
     transform: translateY(-50%);
  }
  
  &.ratio-1-1 {
     width: 100vw;
     height: 100vw;
     top: 50%;
     transform: translateY(-50%);
  }
  
  &.ratio-16-9 {
     width: 100vw;
     height: calc(100vw * 16 / 9);
     top: 50%;
     transform: translateY(-50%);
  }
}

.flash-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #fff;
  opacity: 0;
  pointer-events: none;
  z-index: 1000;
  transition: opacity 0.3s ease-out;
}

.flash-active {
  opacity: 0.8 !important;
  transition: opacity 0.05s ease-in;
}

.camera-ui {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999; /* Float above all webgl canvases */
  pointer-events: none; /* Let touches fall through */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.top-bar-container {
  width: 100%;
  padding-top: max(40px, env(safe-area-inset-top)); /* Handle notch/status bar securely */
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-left: 20px;
  padding-right: 20px;
  box-sizing: border-box;
}

.settings-top-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  pointer-events: auto;
  gap: 10px;
  
  .ratio-btn {
    border: 1px solid rgba(255,255,255,0.4);
    padding: 4px 10px;
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
    font-family: 'Courier New', Courier, monospace;
    backdrop-filter: blur(5px);
    background: rgba(0,0,0,0.5);
  }
  
  .zoom-indicator {
    color: #ff9d00;
    font-size: 12px;
    font-family: 'Courier New', Courier, monospace;
    background: rgba(0,0,0,0.7);
    padding: 2px 8px;
    border-radius: 10px;
  }
}

.top-bar {
  pointer-events: auto;
  background: rgba(0,0,0,0.6);
  border: 1px solid #333;
  border-radius: 4px;
  padding: 4px 12px;
  
  .shots-counter {
    color: #ff3333; /* LED Red */
    font-family: 'Courier New', Courier, monospace;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
  }
}

.bottom-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: max(30px, env(safe-area-inset-bottom)); /* Secure bottom nav offset on iPhones */
  pointer-events: none;
}

.bottom-controls {
  pointer-events: auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  box-sizing: border-box;
}

.filter-dial {
  pointer-events: auto;
  width: 90%;
  margin-bottom: 20px;
}

.side-btn {
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.gallery-btn {
  background: rgba(255, 255, 255, 0.15) url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>') no-repeat center center;
  background-size: 24px;
}

.settings-btn {
  background: rgba(255, 255, 255, 0.15) url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>') no-repeat center center;
  background-size: 24px;
}

.gallery-btn, .settings-btn {
  border-radius: 50%;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255,255,255,0.3);
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  transition: active 0.1s;
  
  &:active {
    background-color: rgba(255, 255, 255, 0.3);
  }
}

.shutter-button-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #444, #111);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.2);
}

.shutter-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #ddd, #999);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  transition: transform 0.05s, box-shadow 0.05s;
  
  &.pressing {
    transform: translateY(2px) scale(0.96);
    box-shadow: 0 0 2px rgba(0,0,0,0.8);
  }
}

.shutter-inner {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #eee, #ccc);
  border: 1px solid #999;
}

.developing-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(10px);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 157, 0, 0.3);
  border-top-color: #ff9d00;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.developing-text {
  color: #ff9d00;
  font-family: 'Courier New', Courier, monospace;
  font-size: 18px;
  letter-spacing: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}
</style>
