# 🚀 GitHub + jsDelivr CDN 快速指南

## ✅ 第一步：创建 GitHub 仓库

1. 访问：https://github.com/new
2. 填写信息：
   - **Repository name**: `christmas-tree-cdn`
   - **Public** ✓（必须是公开仓库）
   - 不要勾选其他选项
3. 点击 **Create repository**

---

## ✅ 第二步：上传文件

### 方法 1：网页上传（推荐）

1. 在新仓库页面，点击 **uploading an existing file**
2. 打开本地的 `christmas-tree/cdn-assets` 文件夹
3. 选择所有文件和文件夹，拖拽到 GitHub 页面
4. 等待上传完成（41个文件，约21MB）
5. 在底部填写：`Add CDN assets`
6. 点击 **Commit changes**

### 方法 2：Git 命令行

```bash
cd christmas-tree/cdn-assets
git init
git add .
git commit -m "Add CDN assets"
git remote add origin https://github.com/你的用户名/christmas-tree-cdn.git
git branch -M main
git push -u origin main
```

---

## ✅ 第三步：配置 CDN 地址

上传完成后，编辑 `src/config.ts`：

```typescript
export const CDN_BASE_URL = import.meta.env.PROD 
  ? 'https://cdn.jsdelivr.net/gh/你的用户名/christmas-tree-cdn@main'
  : '';
```

**示例：**
- GitHub 用户名：`zhangsan`
- 仓库名：`christmas-tree-cdn`
- CDN 地址：`https://cdn.jsdelivr.net/gh/zhangsan/christmas-tree-cdn@main`

---

## ✅ 第四步：测试

### 开发环境（使用本地文件）
```bash
npm run dev
```
访问 http://localhost:5174

### 生产环境（使用 CDN）
```bash
npm run build
npm run preview
```

---

## 📁 上传后的 GitHub 仓库结构

```
christmas-tree-cdn/
├── photos/
│   ├── 1.jpg
│   ├── 2.jpg
│   ├── ...
│   ├── 27.png
│   ├── top.png
│   ├── phone_bg.png
│   └── flower*.png
├── dikhololo_night_1k.hdr
└── 全新硬笔行书简.ttf
```

---

## 🔗 CDN 访问示例

上传后，你的文件可以通过以下地址访问：

```
https://cdn.jsdelivr.net/gh/你的用户名/christmas-tree-cdn@main/photos/1.jpg
https://cdn.jsdelivr.net/gh/你的用户名/christmas-tree-cdn@main/dikhololo_night_1k.hdr
https://cdn.jsdelivr.net/gh/你的用户名/christmas-tree-cdn@main/全新硬笔行书简.ttf
```

---

## ⚡ jsDelivr 优势

- ✅ **完全免费**
- ✅ **全球 CDN 加速**
- ✅ **自动 HTTPS**
- ✅ **无需注册账号**
- ✅ **支持版本管理**（@main 可以改为 @v1.0.0）
- ✅ **自动压缩和优化**

---

## 🔄 更新文件

如果需要更新 CDN 文件：

1. 在 GitHub 仓库中直接编辑或上传新文件
2. jsDelivr 会自动更新（可能需要等待几分钟）
3. 或者使用版本标签：`@v1.0.1`

---

## 💡 提示

1. **首次访问可能较慢**：jsDelivr 需要缓存文件
2. **清除缓存**：访问 `https://purge.jsdelivr.net/gh/用户名/仓库名@main/文件路径`
3. **查看统计**：访问 `https://www.jsdelivr.com/package/gh/用户名/仓库名`

---

## ❓ 常见问题

**Q: 上传后访问 404？**
A: 等待 1-2 分钟，jsDelivr 需要时间缓存

**Q: 文件太大上传失败？**
A: GitHub 单个文件限制 100MB，你的文件都在限制内

**Q: 想要更快的速度？**
A: 可以考虑国内 CDN（阿里云、腾讯云），但需要付费

---

## 🎯 完成检查清单

- [ ] 创建 GitHub 公开仓库
- [ ] 上传 cdn-assets 文件夹内容
- [ ] 修改 src/config.ts 配置
- [ ] 运行 npm run build 测试
- [ ] 部署到服务器

完成后，你的圣诞树项目就可以使用全球 CDN 加速了！🎄✨
