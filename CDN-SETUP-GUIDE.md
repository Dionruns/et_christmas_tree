# 🚀 CDN 配置指南

## 快速开始

### 1️⃣ 准备 CDN 文件

运行以下命令，将所有大文件复制到 `cdn-assets` 文件夹：

```bash
npm run prepare-cdn
```

这会创建一个 `cdn-assets` 文件夹，包含所有需要上传的文件（约 45-55 MB）。

### 2️⃣ 上传到 CDN

选择一个 CDN 服务商并上传 `cdn-assets` 文件夹：

#### 推荐方案 A：阿里云 OSS
1. 登录阿里云控制台
2. 创建 OSS Bucket
3. 上传 `cdn-assets` 文件夹
4. 获取 CDN 域名（例如：`https://your-bucket.oss-cn-hangzhou.aliyuncs.com`）

#### 推荐方案 B：GitHub + jsDelivr（免费）
1. 创建 GitHub 仓库（例如：`christmas-tree-assets`）
2. 上传 `cdn-assets` 文件夹内容到仓库
3. 使用 jsDelivr CDN：
   ```
   https://cdn.jsdelivr.net/gh/你的用户名/christmas-tree-assets@main
   ```

#### 推荐方案 C：Cloudflare R2（免费额度大）
1. 登录 Cloudflare
2. 创建 R2 Bucket
3. 上传文件
4. 绑定自定义域名或使用 R2.dev 域名

### 3️⃣ 配置 CDN 地址

编辑 `src/config.ts` 文件，替换 CDN 域名：

```typescript
export const CDN_BASE_URL = import.meta.env.PROD 
  ? 'https://your-cdn-domain.com' // 👈 替换这里
  : '';
```

**示例：**
```typescript
// 阿里云 OSS
export const CDN_BASE_URL = import.meta.env.PROD 
  ? 'https://christmas-tree.oss-cn-hangzhou.aliyuncs.com'
  : '';

// jsDelivr
export const CDN_BASE_URL = import.meta.env.PROD 
  ? 'https://cdn.jsdelivr.net/gh/username/christmas-tree-assets@main'
  : '';

// Cloudflare R2
export const CDN_BASE_URL = import.meta.env.PROD 
  ? 'https://assets.yourdomain.com'
  : '';
```

### 4️⃣ 测试和构建

**开发环境测试（使用本地文件）：**
```bash
npm run dev
```

**生产环境构建（使用 CDN）：**
```bash
npm run build
```

构建完成后，`dist` 文件夹只有几 MB，所有大文件都从 CDN 加载！

---

## 📁 文件结构

```
christmas-tree/
├── cdn-assets/              # 👈 上传这个文件夹到 CDN
│   ├── photos/
│   │   ├── 1.jpg ~ 27.jpg
│   │   ├── top.png
│   │   ├── phone_bg.png
│   │   └── flower*.png
│   ├── dikhololo_night_1k.hdr
│   └── 全新硬笔行书简.ttf
├── src/
│   ├── config.ts           # 👈 配置 CDN 地址
│   └── App.tsx
└── public/                  # 本地开发使用
```

---

## ⚙️ 环境变量

项目会自动检测环境：
- **开发环境** (`npm run dev`)：使用本地 `public` 文件夹
- **生产环境** (`npm run build`)：使用 CDN 地址

---

## 🔧 高级配置

### 使用环境变量

创建 `.env.production` 文件：

```env
VITE_CDN_BASE_URL=https://your-cdn-domain.com
```

修改 `src/config.ts`：

```typescript
export const CDN_BASE_URL = import.meta.env.VITE_CDN_BASE_URL || '';
```

### CDN 缓存设置

建议在 CDN 控制台设置：
- **缓存时间**：1 年（31536000 秒）
- **GZIP 压缩**：启用
- **HTTPS**：强制启用
- **跨域 CORS**：允许所有域名

---

## 📊 性能对比

| 项目 | 不使用 CDN | 使用 CDN |
|------|-----------|---------|
| 首次加载 | ~50 MB | ~5 MB |
| 加载速度 | 慢 | 快 |
| 服务器带宽 | 高 | 低 |
| 全球访问 | 慢 | 快 |

---

## ❓ 常见问题

**Q: 开发环境能看到图片，生产环境看不到？**
A: 检查 `src/config.ts` 中的 CDN 地址是否正确，确保文件已上传到 CDN。

**Q: 字体没有加载？**
A: 字体文件需要单独处理，建议使用 Web Font Loader 或内联 base64。

**Q: 如何测试生产环境？**
A: 运行 `npm run build && npm run preview`

---

## 💡 提示

1. 上传前压缩图片可以节省 50% 的空间
2. 使用 WebP 格式可以进一步减小文件大小
3. 定期清理 CDN 缓存以更新资源
4. 使用版本号管理资源（例如：`/v1/photos/1.jpg`）
