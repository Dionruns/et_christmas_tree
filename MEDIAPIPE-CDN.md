# MediaPipe WASM 文件管理

## 📦 当前配置

MediaPipe 的 WASM 文件已下载到本地：
```
public/mediapipe-wasm/
├── vision_wasm_internal.js (0.20 MB)
├── vision_wasm_internal.wasm (8.29 MB)
├── vision_wasm_nosimd_internal.js (0.20 MB)
└── vision_wasm_nosimd_internal.wasm (8.16 MB)
```

总大小：约 16.85 MB

---

## 🔧 配置文件

### src/config.ts
```typescript
// MediaPipe WASM 文件路径
export const MEDIAPIPE_WASM_PATH = '/mediapipe-wasm';
```

### src/App.tsx
```typescript
const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
```

---

## 🚀 后期迁移到 CDN

当你准备好 CDN 后，只需修改 `src/config.ts`：

```typescript
// 方案 1：使用环境变量
export const MEDIAPIPE_WASM_PATH = import.meta.env.VITE_MEDIAPIPE_CDN || '/mediapipe-wasm';

// 方案 2：直接指定 CDN 地址
export const MEDIAPIPE_WASM_PATH = import.meta.env.PROD 
  ? 'https://your-cdn.com/mediapipe-wasm'
  : '/mediapipe-wasm';
```

---

## 📤 上传到 CDN

### 1. 准备文件

运行脚本会自动包含 MediaPipe 文件：
```bash
npm run prepare-cdn
```

### 2. 上传到 CDN

将 `cdn-assets/mediapipe-wasm/` 文件夹上传到你的 CDN

### 3. 更新配置

修改 `src/config.ts` 中的 `MEDIAPIPE_WASM_PATH`

---

## 💡 为什么使用本地文件？

1. **速度更快** - 不依赖外部 CDN
2. **更稳定** - 避免 jsDelivr 在国内的不稳定
3. **可控性强** - 可以随时迁移到自己的 CDN
4. **离线可用** - 开发时不需要网络

---

## 📊 文件大小对比

| 方案 | 首次加载 | 优点 | 缺点 |
|------|---------|------|------|
| 外部 CDN | ~17 MB | 不占用服务器 | 可能被墙/慢 |
| 本地文件 | ~17 MB | 快速稳定 | 占用服务器空间 |
| 自己的 CDN | ~17 MB | 完全可控 | 需要 CDN 服务 |

---

## 🔄 更新 MediaPipe 版本

如果需要更新到新版本：

1. 修改 `download-mediapipe.js` 中的版本号：
   ```javascript
   const MEDIAPIPE_VERSION = '0.10.4'; // 改为新版本
   ```

2. 重新下载：
   ```bash
   npm run download-mediapipe
   ```

3. 测试功能是否正常

---

## ✅ 当前状态

- ✓ MediaPipe 文件已下载到本地
- ✓ 代码已更新使用本地文件
- ✓ 支持后期迁移到 CDN
- ✓ `prepare-cdn` 脚本已包含 MediaPipe 文件
