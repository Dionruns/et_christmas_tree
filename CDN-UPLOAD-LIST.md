# CDN 上传文件清单

## 📦 需要上传到 CDN 的文件

### 1. 照片文件夹 `/photos/` (约 50+ 张图片)
```
public/photos/1.jpg ~ 24.jpg
public/photos/25.PNG
public/photos/26.png
public/photos/27.png
public/photos/top.png
public/photos/phone_bg.png
public/photos/flower3.png ~ flower13.png
```

### 2. 环境贴图 (约 18MB)
```
public/dikhololo_night_1k.hdr
```

### 3. 字体文件
```
public/全新硬笔行书简.ttf
```

---

## 📋 上传步骤

### 方案 1：使用对象存储（推荐）

**阿里云 OSS / 腾讯云 COS / 七牛云**

1. 创建存储桶（Bucket）
2. 上传 `public` 文件夹下的所有文件
3. 保持目录结构：
   ```
   your-bucket/
   ├── photos/
   │   ├── 1.jpg
   │   ├── 2.jpg
   │   └── ...
   ├── dikhololo_night_1k.hdr
   └── 全新硬笔行书简.ttf
   ```
4. 获取 CDN 加速域名（例如：`https://cdn.example.com`）

### 方案 2：使用 GitHub Pages / Cloudflare Pages

1. 创建新的 GitHub 仓库
2. 上传 `public` 文件夹
3. 启用 GitHub Pages
4. 使用 jsDelivr CDN：`https://cdn.jsdelivr.net/gh/username/repo@main/`

---

## ⚙️ 配置 CDN 地址

修改 `src/config.ts` 文件：

```typescript
export const CDN_BASE_URL = import.meta.env.PROD 
  ? 'https://your-cdn-domain.com' // 替换为你的 CDN 域名
  : '';
```

例如：
- 阿里云 OSS: `'https://your-bucket.oss-cn-hangzhou.aliyuncs.com'`
- 腾讯云 COS: `'https://your-bucket-1234567890.cos.ap-guangzhou.myqcloud.com'`
- jsDelivr: `'https://cdn.jsdelivr.net/gh/username/repo@main'`

---

## 🚀 构建和部署

1. **开发环境**（使用本地文件）：
   ```bash
   npm run dev
   ```

2. **生产环境**（使用 CDN）：
   ```bash
   npm run build
   ```

3. 部署 `dist` 文件夹到服务器

---

## 📊 文件大小统计

- 照片文件：约 20-30 MB
- HDR 环境贴图：约 18 MB
- 字体文件：约 5 MB
- **总计：约 45-55 MB**

使用 CDN 后，这些文件将从 CDN 加载，大大提升访问速度！

---

## 💡 优化建议

1. **图片压缩**：使用 TinyPNG 或 ImageOptim 压缩照片
2. **CDN 缓存**：设置长期缓存（1年）
3. **GZIP 压缩**：启用 CDN 的 GZIP 压缩
4. **多地域加速**：选择支持全球加速的 CDN
