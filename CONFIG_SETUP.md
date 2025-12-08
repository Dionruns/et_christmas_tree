# 配置说明

## CDN 配置

本项目使用私密配置文件来存储 CDN 地址，避免将敏感信息上传到 GitHub。

### 设置步骤

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

### 生产部署

生产环境部署时，确保：
1. 已创建 `src/config.private.ts` 文件
2. 填入正确的 CDN 地址
3. CDN 服务器已正确配置 CORS

## 注意事项

- **不要**将 `config.private.ts` 上传到 GitHub
- **不要**在公开的代码中硬编码 CDN 地址
- 示例文件 `config.private.example.ts` 可以上传，用于说明配置格式
