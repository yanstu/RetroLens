# 前端文档

当前版本：**1.1.0**

## 技术栈

- UniApp + Vue 3 + TypeScript
- Pinia
- SCSS
- WebGL / GLSL

## 页面结构

### 1. 相机页 `/pages/camera/index`
- 实时取景
- 特效切换
- 比例切换（`4:3 / 1:1 / 16:9`）
- 捏合变焦
- 快门动画、音效、震动
- 页面分享 / 分享到朋友圈

### 2. 暗房页 `/pages/gallery/index`
- 本地照片列表
- 点击预览照片
- 页面分享 / 分享到朋友圈

### 3. 设置页 `/pages/settings/index`
- 震动开关
- 声音开关
- 页面分享 / 分享到朋友圈

## 核心组件

### `src/components/camera-view/CameraView.vue`
- H5 / App 走 WebRTC + WebGL
- 微信小程序走 `camera + onCameraFrame + WebGL`
- 在微信开发者工具中支持原生相机预览兜底

### `src/components/retro-dial/RetroDial.vue`
- 横向特效选择菜单
- 选中项定位聚焦
- 轻量机械刻度风格选中态

## 状态管理

### `src/store/preferenceStore.ts`
- 保存：
  - `selectedFilter`
  - `selectedRatio`
  - `hapticsEnabled`
  - `soundEnabled`
  - `highQualityRender`

### `src/store/filmStore.ts`
- 维护暗房照片列表
- 负责本地照片持久化

## 分享能力

- 页面级配置位于 `src/pages.json`
- 页面级分享逻辑位于 `src/utils/share.ts`
- 当前 3 个页面均支持：
  - 转发给好友
  - 分享到朋友圈
