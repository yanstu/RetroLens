# RetroLens 📸

RetroLens 是一款基于 **UniApp (Vue 3 + TypeScript)** 构建的高性能复古胶片相机小程序。
它抛弃了常见的后期加滤镜的做法，而是构建了一个**全新的 WebGL 实时数字图像流处理引擎**。你不仅可以在取景器里“所见即所得”地预览极致的色彩科学，还可以体验到仿佛手持一台真正的老式机械相机一般的声音、震动以及交互。

## ✨ 核心特性

- **🚀 零 GC 实时渲染引擎 (Zero-GC Render Pipeline)**
  深度定制了 WebGL 底层逻辑引擎，通过建立 UniformCache、预分配 Buffer 数组与指针池化，将所有的计算工作全部压入 GPU 着色器 (GLSL)，实现了 60FPS 满帧运行，彻底消灭由于 JavaScript 垃圾回收引发的取景器卡顿。
  
- **🎨 硬件级复古滤镜 (Hardware-level Film Emulation)**
  不使用任何 CSS Filter 或者贴图糊弄，直接编写纯粹的 GLSL 着色器。默认首发顶级特效阵列：
  - `Cyber-Punk`: 赛博朋克深孔雀蓝与霓虹粉交叉渲染，自带动态色差与跳动噪点。
  - `HK-Neon`: 港风霓虹，高对比度复古街头感。
  - `Insta-Polar`: 经典拍立得色彩模拟，褪色暗角。
  - `Classic-Cine`: 电影感宽容度映射，高级 Teal & Orange 电影级调色。
  - `VHS-1990` / `CCD-2000` / `Lo-Fi TV` 等更多质感特性。

- **📐 真正的实时变焦与画幅裁切**
  支持 `4:3`, `1:1`, `16:9` 自由画幅切换；支持双指捏合无级数码变焦。这些操作全部直接作用于 WebGL 的 UV 坐标轴以及最终出片的真理层，保证“你看到什么，拍下来就是什么”。

- **📳 沉浸式仿生交互 (Immersive Bionics UX)**
  - **HapticsManager**: 基于触发器的微秒级震动反馈系统，在拨盘转动、快门释放、胶条过卷时带来物理机械般的咔哒手感。
  - **AudioManager**: 精心调配的全套机械音效（环境底噪、快门开合、过卷齿轮），可自由配置开关。
  
- **💾 独立的暗房系统 (Darkroom Gallery)**
  内置应用专属相册。拍摄的照片不仅会保存到手机系统相册中，还会直接持久化沙盒备份到 `USER_DATA_PATH` 内，形成应用独有的私人暗房。

## 🛠 技术栈

- **框架**: UniApp (Vue 3 Composition API)
- **语言**: TypeScript, SCSS, GLSL (OpenGL ES 2.0)
- **状态管理**: Pinia
- **构建工具**: Vite
- **运行环境**: 主要针对微信小程序端 (MP-WEIXIN) 深度优化，代码预留 H5 以及 App 端兼容。

## 📦 快速开始

### 1. 安装依赖

请确保你已经安装了 [Node.js](https://nodejs.org/)。

\`\`\`bash
npm install
\`\`\`

### 2. 运行与编译

针对微信小程序环境，实时编译并监听：

\`\`\`bash
npm run dev:mp-weixin
\`\`\`

编译完成后，打开 **微信开发者工具**，将目标目录指向本项目的 `dist/dev/mp-weixin`，即可在模拟器以及真机中进行预览。

### 3. 构建发布

\`\`\`bash
npm run build:mp-weixin
\`\`\`

打包后提取 `dist/build/mp-weixin` 目录代码，在开发者工具上传即可。

## 📂 项目结构图

\`\`\`text
src/
├── bridge/          # 跨平台/底层原生交互层 (Hardware/OS Bridging)
│   ├── audio/       # 骨架声效管理器
│   └── haptics/     # 触觉震频控制器
├── components/      # UI及核心组件
│   ├── camera-view/ # 核心相机流预览组件 (WebGL Canvas挂载点)
│   └── retro-dial/  # 复古特性切换拨盘组件
├── core/            # 核心系统 (The Brains)
│   ├── engine/      # WebGL渲染调度器、相机设备句柄、帧捕捉
│   └── shader/      # GLSL 着色器库房、矩阵及变量缓存器
├── pages/           # 页面路由
│   ├── camera/      # 主界面 - 相机
│   ├── gallery/     # 画廊 - 暗房
│   └── settings/    # 系统偏好设置
└── store/           # 集中式状态管理 (Pinia)
    ├── filmStore.ts #胶卷、相册快照管理
    └── preferenceStore.ts #配置管理
\`\`\`

## 📝 贡献指南

1. 这个项目使用了定制的零 GC WebGL 渲染管线，如果你要修改或添加新滤镜，请直接前往 `src/core/shader/ShaderLib.ts` 编写对应的 Fragment Shader 的 GLSL 代码。
2. 切勿在每帧渲染的 `Renderer` 循环中引入任何会触发垃圾回收机制的新对象产生动作。

## 📜 许可证 (License)

MIT License.
