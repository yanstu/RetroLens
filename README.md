# RetroLens 📸

当前版本：**1.1.0**

RetroLens 是一款基于 **UniApp (Vue 3 + TypeScript)** 构建的复古胶片相机小程序，核心目标是在微信小程序中提供更接近真实胶片机的实时取景、机械交互与暗房体验。

## 本版本重点

- 默认特效调整为 `HK-Neon`
- 当前特效与画幅比例支持持久化
- 微信开发者工具下增加相机预览兜底，避免黑屏
- 所有页面支持：
  - 转发给好友
  - 分享到朋友圈
- 特效切换菜单完成多轮交互与视觉优化

## ✨ 核心特性

- **实时滤镜渲染**
  - 基于 WebGL / GLSL 的实时图像处理
  - 支持港风、拍立得、电影感、VHS、CCD 等多种复古风格

- **复古拍摄交互**
  - 快门动画
  - 机械音效
  - 震动反馈
  - 捏合变焦

- **偏好持久化**
  - 默认特效记忆
  - 画幅比例记忆
  - 声音与震动开关记忆

- **暗房系统**
  - 本地照片列表
  - 点击预览
  - 小程序端持久化保存

- **分享能力**
  - 相机页、暗房页、设置页均支持转发
  - 支持分享到朋友圈

## 🛠 技术栈

- UniApp
- Vue 3 Composition API
- TypeScript
- SCSS
- Pinia
- WebGL / GLSL
- Vite

## 📦 快速开始

### 安装依赖

```bash
npm install
```

### 微信小程序开发

```bash
npm run dev:mp-weixin
```

然后在微信开发者工具中导入：

```text
dist/dev/mp-weixin
```

### 微信小程序构建

```bash
npm run build:mp-weixin
```

构建产物目录：

```text
dist/build/mp-weixin
```

## 📚 文档索引

- [前端文档](./docs/FRONTEND.md)
- [后端文档](./docs/BACKEND.md)
- [部署文档](./docs/DEPLOYMENT.md)
- [使用手册](./docs/USER_MANUAL.md)
- [更新日志](./CHANGELOG.md)

## 📂 项目结构

```text
src/
├── bridge/
├── components/
├── core/
├── pages/
├── store/
└── utils/
```

## 📝 开发维护约定

本仓库已内置协作规则，详见：

- [AGENTS.md](./AGENTS.md)

其中包括：

- 每次代码改动必须同步更新版本号
- 每次代码改动必须同步更新 README、前后端文档、部署文档、使用手册与更新日志

## 📜 License

MIT
