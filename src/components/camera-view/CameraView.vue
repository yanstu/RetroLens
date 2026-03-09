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
    <!-- Hidden camera element for mp-weixin to capture frames -->
    <camera 
      device-position="back" 
      flash="off" 
      frame-size="medium" 
      class="hidden-video"
      :zoom="zoom"
    ></camera>
    <canvas 
      type="webgl" 
      id="webgl-canvas"
      class="camera-canvas"
    ></canvas>
    <canvas
      type="2d"
      id="capture-canvas"
      class="capture-canvas"
    ></canvas>
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

// #ifdef MP-WEIXIN
let renderer: WebGLRenderer | null = null;
let cameraContext: any = null;
let frameListener: any = null;
let mainTexture: WebGLTexture | null = null;
let _gl: any = null;
let _canvasNode: any = null;
const instance = getCurrentInstance();

const takePhoto = async (): Promise<{ tempFilePath: string, base64: string }> => {
  return new Promise((resolve, reject) => {
      // #ifdef MP-WEIXIN
      if (!_canvasNode || !_gl) {
          reject(new Error('Canvas not ready'));
          return;
      }
      
      const width = _canvasNode.width;
      const height = _canvasNode.height;
      
      // Render to 2D offscreen canvas using blit (Instant hardware copy, Zero JS loops)
      const query = uni.createSelectorQuery().in(instance?.proxy);
      query.select('#capture-canvas').node().exec((res) => {
          if(!res[0] || !res[0].node) {
               reject(new Error("Capture canvas missing")); return; 
          }
          const capCanvas = res[0].node;
          capCanvas.width = width;
          capCanvas.height = height;
          const ctx = capCanvas.getContext('2d');
          
          // Draw WebGL buffer directly to 2D context using native engine
          ctx.drawImage(_canvasNode, 0, 0, width, height);
          
          // Now safely save the 2D canvas with exact dimensions
          uni.canvasToTempFilePath({
              x: 0,
              y: 0,
              width: width,
              height: height,
              destWidth: width,
              destHeight: height,
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
                      } catch (e) {
                          console.error("Frame texture push error", e);
                      }
                  }
                  if (canvas.requestAnimationFrame) {
                     renderLoopId = canvas.requestAnimationFrame(renderLoop);
                  } else {
                     // Fallback
                     renderLoopId = setTimeout(renderLoop, 1000 / 60);
                  }
              };
              
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
              renderLoop(); // Ignite
              
          } catch (e) {
              console.error('[RetroLens/MP] Error initializing WebGL pipeline:', e);
          }
        });
  };

  setTimeout(() => initWebGLCanvas(), 100);
});

onBeforeUnmount(() => {
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
  width: 100vw;
  height: 100vh;
  background-color: #000;
  overflow: hidden;
}

.camera-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.hidden-video {
  /* Native camera component ignores opacity and z-index, must be physically moved off-screen */
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
</style>
