# 部署文档

当前版本：**1.1.0**

## 环境要求

- Node.js 18+
- npm
- 微信开发者工具

## 安装依赖

```bash
npm install
```

## 本地开发

```bash
npm run dev:mp-weixin
```

然后在微信开发者工具中导入：

```text
dist/dev/mp-weixin
```

## 构建生产包

```bash
npm run build:mp-weixin
```

构建产物目录：

```text
dist/build/mp-weixin
```

## 微信开发者工具发布流程

1. 打开微信开发者工具
2. 导入 `dist/build/mp-weixin`
3. 检查 AppID 与项目配置
4. 验证相机权限、特效切换、分享菜单
5. 执行上传
6. 在微信公众平台提交审核 / 发布

## 发布前检查

- 相机页能正常预览
- 开发者工具下原生预览兜底正常
- 真机下滤镜预览正常
- 特效与比例偏好能持久化
- 暗房页可预览照片
- 分享给好友 / 分享到朋友圈菜单可见
