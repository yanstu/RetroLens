<template>
  <view class="camera-container">
    <!-- #ifdef H5 || APP-PLUS -->
    <canvas 
      ref="webglCanvas" 
      canvas-id="webgl-canvas"
      class="camera-canvas"
      :prop:filterType="activeFilter"
      :change:filterType="engine.onFilterChange"
      :prop:zoomLevel="zoom"
      :change:zoomLevel="engine.onZoomChange"
    ></canvas>
    
    <!-- Hidden video element to capture WebRTC stream (H5) -->
    <video 
      ref="videoSource" 
      class="hidden-video" 
      autoplay 
      playsinline 
      muted
    ></video>
    <!-- #endif -->
    
    <!-- #ifdef MP-WEIXIN -->
    <!-- WeChat Mini Program:
         Keep native camera visible as a fallback.
         Once WebGL frame pipeline is confirmed working, canvas fades in on top.
         This prevents black preview in devtools when onCameraFrame / WebGL is not ready. -->
    <camera 
      device-position="back" 
      flash="off" 
      frame-size="medium" 
      class="native-camera"
      @initdone="onCameraInitDone"
      @error="onCameraError"
    ></camera>
    <canvas 
      type="webgl" 
      id="webgl-canvas"
      class="camera-canvas mp-camera-canvas"
      :class="{ ready: isMpPipelineReady }"
    ></canvas>
    <canvas
      type="2d"
      id="capture-canvas"
      class="capture-canvas"
    ></canvas>
    <view v-if="mpPreviewHint" class="mp-preview-hint">
      <text>{{ mpPreviewHint }}</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, getCurrentInstance } from 'vue';
import { FilterType } from '../../core/shader/ShaderLib';
import { WebGLRenderer } from '../../core/engine/WebGLRenderer';

const props = defineProps({
  activeFilter: {
    type: String as () => FilterType,
    default: FilterType.Cyberpunk
  },
  zoom: {
    type: Number,
    default: 1
  },
  ratio: {
    type: String,
    default: '4:3'
  }
});

const isMpPipelineReady = ref(false);
const mpPreviewHint = ref('');

// #ifdef MP-WEIXIN
let renderer: WebGLRenderer | null = null;
let cameraContext: any = null;
let frameListener: any = null;
let mainTexture: WebGLTexture | null = null;
let _gl: any = null;
let _canvasNode: any = null;
const instance = getCurrentInstance();
let cameraInitialized = false;
let frameListenerStarted = false;
let firstSuccessfulRender = false;
let pipelineWarmupTimer: ReturnType<typeof setTimeout> | null = null;
const isDevtools = uni.getSystemInfoSync().platform === 'devtools';

const clearWarmupTimer = () => {
  if (pipelineWarmupTimer) {
    clearTimeout(pipelineWarmupTimer);
    pipelineWarmupTimer = null;
  }
};

const enterNativePreviewFallback = (message: string) => {
  isMpPipelineReady.value = false;
  mpPreviewHint.value = message;
};

const markPipelineReady = () => {
  clearWarmupTimer();
  firstSuccessfulRender = true;
  isMpPipelineReady.value = true;
  mpPreviewHint.value = '';
};

const scheduleWarmupFallback = () => {
  clearWarmupTimer();
  pipelineWarmupTimer = setTimeout(() => {
    if (!firstSuccessfulRender) {
      enterNativePreviewFallback(
        isDevtools
          ? '开发者工具已回退到原生相机预览，滤镜实时效果请以真机为准'
          : '实时滤镜预览启动较慢，暂时回退到原生相机预览'
      );
    }
  }, isDevtools ? 1200 : 1800);
};

const syncCameraZoom = (zoom: number) => {
  if (!cameraContext || !cameraInitialized || typeof cameraContext.setZoom !== 'function') {
    return;
  }

  const normalizedZoom = Math.max(1, Math.min(zoom || 1, 5));
  cameraContext.setZoom({
    zoom: Number(normalizedZoom.toFixed(1)),
    fail: (error: any) => {
      if (!isDevtools) {
        console.warn('[RetroLens/MP] setZoom failed', error);
      }
    }
  });
};

const startFrameListenerIfReady = () => {
  if (frameListenerStarted || !cameraInitialized || !cameraContext) {
    return;
  }

  if (typeof cameraContext.onCameraFrame !== 'function') {
    enterNativePreviewFallback('当前环境暂不支持实时帧回调，已使用原生相机预览');
    return;
  }

  frameListener = cameraContext.onCameraFrame((frame: any) => {
    if (!firstFrameReceived) {
      firstFrameReceived = true;
      console.log(`[RetroLens/MP] Camera started: ${frame.width}x${frame.height}`);
    }
    currentFrameData = frame.data;
    currentFrameWidth = frame.width;
    currentFrameHeight = frame.height;
  });

  frameListener.start();
  frameListenerStarted = true;
  scheduleWarmupFallback();
};

const onCameraInitDone = () => {
  cameraInitialized = true;
  if (!firstSuccessfulRender) {
    enterNativePreviewFallback(
      isDevtools
        ? '开发者工具正在尝试启动滤镜预览，若失败将保留原生相机画面'
        : '正在启动实时滤镜预览...'
    );
  }
  syncCameraZoom(props.zoom);
  startFrameListenerIfReady();
};

const onCameraError = (event: any) => {
  const message = event?.detail?.errMsg || '无法访问摄像头，请检查开发者工具相机权限或真机授权';
  console.error('[RetroLens/MP] Camera error:', event?.detail || event);
  enterNativePreviewFallback(message);
};

const takePhoto = async (): Promise<{ tempFilePath: string, base64: string }> => {
  return new Promise((resolve, reject) => {
      // #ifdef MP-WEIXIN
      if (cameraContext && (!isMpPipelineReady.value || !_canvasNode || !_gl)) {
          cameraContext.takePhoto({
              quality: 'high',
              success: (res: any) => {
                  resolve({
                      tempFilePath: res.tempImagePath,
                      base64: ''
                  });
              },
              fail: reject
          });
          return;
      }

      if (!_canvasNode || !_gl) {
          reject(new Error('Canvas not ready'));
          return;
      }
      
      const rawWidth = _canvasNode.width;
      const rawHeight = _canvasNode.height;
      
      let targetWidth = rawWidth;
      let targetHeight = rawHeight;
      let offsetX = 0;
      let offsetY = 0;
      
      // Render to 2D offscreen canvas using blit
      const query = uni.createSelectorQuery().in(instance?.proxy);
      query.select('#capture-canvas').node().exec((res) => {
          if(!res[0] || !res[0].node) {
               reject(new Error("Capture canvas missing")); return; 
          }
          const capCanvas = res[0].node;
          // Set 物理画布大小 strictly to cropped size
          capCanvas.width = targetWidth;
          capCanvas.height = targetHeight;
          
          const ctx = capCanvas.getContext('2d');
          
          // Draw WebGL buffer with negative offset to perform clipping
          ctx.drawImage(_canvasNode, -offsetX, -offsetY, rawWidth, rawHeight);
          
          // Now safely save the exactly proportioned 2D canvas
          uni.canvasToTempFilePath({
              x: 0,
              y: 0,
              width: targetWidth,
              height: targetHeight,
              destWidth: targetWidth,
              destHeight: targetHeight,
              canvas: capCanvas,
              fileType: 'jpg',
              quality: 1,
              success: (res2) => {
                  const fs = uni.getFileSystemManager();
                  try {
                      const base64 = fs.readFileSync(res2.tempFilePath, 'base64');
                      resolve({
                          tempFilePath: res2.tempFilePath,
                          base64: 'data:image/jpeg;base64,' + base64
                      });
                  } catch(e) {
                      resolve({ tempFilePath: res2.tempFilePath, base64: '' });
                  }
              },
              fail: reject
          });
      });
      // #endif
      
      // #ifdef H5 || APP-PLUS
      reject(new Error('Not implemented for H5 here yet'));
      // #endif
  });
};

watch(() => props.ratio, () => {
    // #ifdef MP-WEIXIN
    // Let the DOM update the container size first
    setTimeout(() => {
        if (!instance || !_canvasNode) return;
        const query = uni.createSelectorQuery().in(instance.proxy);
        query.select('.camera-canvas').boundingClientRect().exec((res) => {
            if (res && res[0]) {
                const sysInfo = uni.getSystemInfoSync();
                const dpr = sysInfo.pixelRatio;
                _canvasNode.width = res[0].width * dpr;
                _canvasNode.height = res[0].height * dpr;
            }
        });
    }, 350); // wait for 0.3s CSS transition to finish
    // #endif
});

watch(() => props.zoom, (zoom) => {
    // #ifdef MP-WEIXIN
    syncCameraZoom(zoom);
    // #endif
});

defineExpose({ takePhoto });

let currentFrameData: ArrayBuffer | null = null;
let currentFrameWidth = 0;
let currentFrameHeight = 0;
let firstFrameReceived = false;
let renderLoopId: any = null;

onMounted(() => {
  if (!instance) return;
  
  const initWebGLCanvas = (retryCount = 0) => {
      const query = uni.createSelectorQuery().in(instance.proxy!);
      query.select('.camera-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            if (retryCount < 10) {
                setTimeout(() => initWebGLCanvas(retryCount + 1), 200);
            } else {
                console.error('[RetroLens/MP] Canvas node not found after retries', res);
            }
            return;
          }
          _canvasNode = res[0].node;
          const canvas = _canvasNode;
          
          // Handle High DPI displays safely based on CSS layout
          const sysInfo = uni.getSystemInfoSync();
          const dpr = sysInfo.pixelRatio;
          canvas.width = (res[0].width || sysInfo.windowWidth) * dpr;
          canvas.height = (res[0].height || sysInfo.windowHeight) * dpr;
          
          try {
              renderer = new WebGLRenderer(canvas);
              _gl = renderer['gl'];
              
              if (_gl) {
                  mainTexture = _gl.createTexture();
                  _gl.bindTexture(_gl.TEXTURE_2D, mainTexture);
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
                  _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
                  // Ensure we support NPOT byte formats
                  _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, 1);
              }
              
              cameraContext = uni.createCameraContext();
              syncCameraZoom(props.zoom);
              startFrameListenerIfReady();
              
              // We MUST use requestAnimationFrame in WeChat to flush WebGL pipelines
              const startTime = Date.now();
              const renderLoop = () => {
                  if (renderer && _gl && mainTexture && currentFrameData) {
                      _gl.bindTexture(_gl.TEXTURE_2D, mainTexture);
                      // Update texture safely
                      try {
                          _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, currentFrameWidth, currentFrameHeight, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, new Uint8Array(currentFrameData));
                          renderer.render(
                              mainTexture, 
                              props.activeFilter, 
                              Date.now() - startTime,
                              canvas.width, 
                              canvas.height,
                              props.zoom,
                              currentFrameWidth || canvas.width,
                              currentFrameHeight || canvas.height
                          );
                          if (!firstSuccessfulRender) {
                              markPipelineReady();
                          }
                      } catch (e) {
                          console.error("Frame texture push error", e);
                          if (!firstSuccessfulRender) {
                              enterNativePreviewFallback('实时滤镜渲染失败，已回退到原生相机预览');
                          }
                      }
                  }
                  if (canvas.requestAnimationFrame) {
                     renderLoopId = canvas.requestAnimationFrame(renderLoop);
                  } else {
                     // Fallback
                     renderLoopId = setTimeout(renderLoop, 1000 / 60);
                  }
              };
              
              renderLoop(); // Ignite
              
          } catch (e) {
              console.error('[RetroLens/MP] Error initializing WebGL pipeline:', e);
              enterNativePreviewFallback('滤镜管线初始化失败，已保留原生相机预览');
          }
        });
  };

  // #ifdef MP-WEIXIN
  enterNativePreviewFallback(
    isDevtools
      ? '开发者工具预览模式：优先显示原生相机画面'
      : '正在初始化相机...'
  );
  // #endif

  setTimeout(() => initWebGLCanvas(), 100);
});

onBeforeUnmount(() => {
  clearWarmupTimer();
  if (frameListener) frameListener.stop();
  if (renderer) renderer.destroy();
  if (_canvasNode && _canvasNode.cancelAnimationFrame && renderLoopId) {
      _canvasNode.cancelAnimationFrame(renderLoopId);
  }
});
// #endif

// For non-H5 logic, you would handle permissions and setup here.
// But the real rendering happens in RenderJS (for H5).
</script>

<script module="engine" lang="renderjs">
import { WebGLRenderer } from '../../core/engine/WebGLRenderer';
// Note: RenderJS runs in a logical sandbox in H5, sometimes importing enums fails if not pre-compiled nicely.
// We use plain strings or ensure clean passing from standard setup block.

export default {
  data() {
    return {
      renderer: null,
      videoElement: null,
      glCanvas: null,
      animationFrameId: null,
      mainTexture: null,
      currentFilter: 'Cyber-Punk', // Defaulting to raw string to avoid cross-module undefined errors
      zoomValue: 1.0
    };
  },
  mounted() {
    this.initCamera();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    async initCamera() {
      try {
        this.startTime = Date.now();
        // 1. Get Video Stream
        this.videoElement = this.$refs.videoSource;
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        this.videoElement.srcObject = stream;
        await this.videoElement.play();

        // 2. Setup WebGL Context
        this.glCanvas = this.$refs.webglCanvas;
        
        // Match canvas logical size to device
        const rect = this.glCanvas.getBoundingClientRect();
        this.glCanvas.width = rect.width * (window.devicePixelRatio || 1);
        this.glCanvas.height = rect.height * (window.devicePixelRatio || 1);

        this.renderer = new WebGLRenderer(this.glCanvas);
        
        // 3. Setup Texture
        const gl = this.renderer['gl']; // dirty access for setup
        if(gl) {
             this.mainTexture = gl.createTexture();
             gl.bindTexture(gl.TEXTURE_2D, this.mainTexture);
             gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
             gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
             gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        // 4. Start Render Loop
        this.renderLoop();
        
      } catch (err) {
        console.error('[RetroLens] Failed to init camera:', err);
      }
    },
    
    renderLoop(timestamp) {
      if (!this.renderer || !this.videoElement || this.videoElement.readyState < 2) {
        this.animationFrameId = requestAnimationFrame(this.renderLoop.bind(this));
        return;
      }
      
      const elapsed = Date.now() - (this.startTime || Date.now());

      const gl = this.renderer['gl'];
      
      // Update texture with new video frame
      gl.bindTexture(gl.TEXTURE_2D, this.mainTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoElement);

      // Render
      this.renderer.render(
          this.mainTexture, 
          this.currentFilter, 
          elapsed,
          this.glCanvas.width, 
          this.glCanvas.height,
          this.zoomValue || 1.0
      );

      this.animationFrameId = requestAnimationFrame(this.renderLoop.bind(this));
    },

    onFilterChange(newValue, oldValue, ownerInstance, instance) {
      this.currentFilter = newValue;
      console.log(`[RetroLens] Filter changed to: ${newValue}`);
    },

    onZoomChange(newValue) {
      if (newValue) {
          this.zoomValue = newValue;
      }
    },

    cleanup() {
      cancelAnimationFrame(this.animationFrameId);
      if (this.videoElement && this.videoElement.srcObject) {
         this.videoElement.srcObject.getTracks().forEach(track => track.stop());
      }
      if (this.renderer) {
        this.renderer.destroy();
      }
    }
  }
}
</script>

<style scoped lang="scss">
.camera-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;
}

.camera-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.native-camera,
.mp-camera-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.mp-camera-canvas {
  opacity: 0;
  transition: opacity 0.22s ease-out;
}

.mp-camera-canvas.ready {
  opacity: 1;
}

.hidden-video {
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
}

.capture-canvas {
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 300px;
  height: 300px;
}

.mp-preview-hint {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 18px;
  z-index: 5;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.26);

  text {
    display: block;
    color: rgba(255, 255, 255, 0.92);
    font-size: 12px;
    line-height: 1.45;
    text-align: center;
  }
}
</style>
