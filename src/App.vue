<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('[RetroLens] App Launched');
});

onShow(() => {
  console.log('[RetroLens] App Show');
});

onHide(() => {
  console.log('[RetroLens] App Hide');
});
</script>

<style lang="scss">
/* Global styles for RetroLens */
page {
  background-color: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}

/* Remove scrollbars */
::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
  -webkit-appearance: none;
  background: transparent;
}
</style>
