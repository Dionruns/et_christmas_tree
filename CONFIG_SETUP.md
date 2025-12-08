# 配置说明

## CDN 配置

本项目支持两种方式配置 CDN 地址，避免将敏感信息上传到 GitHub。

### 方式一：使用环境变量（推荐）

1. **本地开发**：创建 `.env.local` 文件（已在 .gitignore 中）
   ```bash
   VITE_CDN_BASE_URL=http://your-cdn-domain.com/path
   VITE_MEDIAPIPE_WASM_PATH=http://your-cdn-domain.com/path/mediapipe-wasm
   ```

2. **Vercel 部署**：在项目设置中添加环境变量
   - `VITE_CDN_BASE_URL`
   - `VITE_MEDIAPIPE_WASM_PATH`

3. **Cloudflare Pages 部署**：在项目设置中添加环境变量
   - `VITE_CDN_BASE_URL`（留空则使用本地资源）
   - `VITE_MEDIAPIPE_WASM_PATH`（留空则使用 `/mediapipe-wasm`）

### 方式二：使用配置文件（备选）

1. 复制示例配置文件：
   ```bash
   cp src/config.private.example.ts src/config.private.ts
   ```

2. 编辑 `src/config.private.ts`，填入你的实际 CDN 地址：
   ```typescript
   export const PRIVATE_CDN_BASE_URL = 'http://your-cdn-domain.com/path';
   export const PRIVATE_MEDIAPIPE_WASM_PATH = 'http://your-cdn-domain.com/path/mediapipe-wasm';
   ```

3. `config.private.ts` 已经添加到 `.gitignore`，不会被上传到 GitHub

### 本地开发

本地开发时，项目会自动使用本地资源（public 目录），无需配置 CDN。

### 生产部署模式

1. **Cloudflare Pages**（推荐）：
   - 无需配置 CDN，直接使用本地静态资源
   - 环境变量留空即可

2. **Vercel + 外部 CDN**：
   - 需要配置外部 CDN（如 MinIO/S3）
   - 设置环境变量 `VITE_CDN_BASE_URL`

## 注意事项

- **不要**将 `config.private.ts` 或 `.env.local` 上传到 GitHub
- **不要**在公开的代码中硬编码 CDN 地址
- 环境变量优先级高于配置文件
- 示例文件 `config.private.example.ts` 可以上传，用于说明配置格式
