# RustFS/MinIO CORS 配置指南

## 问题说明

虽然 RustFS 会自动添加 `Content-Length` 响应头，但由于浏览器的 CORS 安全限制，前端 JavaScript 默认无法读取这个头。

需要在服务器端配置 CORS，明确允许前端读取 `Content-Length` 头。

## MinIO CORS 配置

### 方法 1: 使用 mc 命令行工具

```bash
# 1. 配置 MinIO 别名（如果还没配置）
mc alias set myminio http://122.51.20.250:9000 YOUR_ACCESS_KEY YOUR_SECRET_KEY

# 2. 创建 CORS 配置文件
cat > cors.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["Content-Length", "Content-Type", "ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# 3. 应用 CORS 配置到 bucket
mc anonymous set-json cors.json myminio/etchristmastree
```

### 方法 2: 使用 MinIO Web 控制台

1. 访问 `http://122.51.20.250:9000`
2. 登录后进入 `etchristmastree` bucket
3. 点击 "Access" 或"访问控制"
4. 添加 CORS 规则：
   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET", "HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["Content-Length", "Content-Type", "ETag"],
     "MaxAgeSeconds": 3600
   }
   ```

### 方法 3: 使用 AWS CLI（MinIO 兼容 S3 API）

```bash
# 1. 配置 AWS CLI
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set default.region us-east-1

# 2. 创建 CORS 配置文件
cat > cors.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["Content-Length", "Content-Type", "ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# 3. 应用配置
aws s3api put-bucket-cors \
  --bucket etchristmastree \
  --cors-configuration file://cors.json \
  --endpoint-url http://122.51.20.250:9000
```

## 验证配置

配置完成后，可以通过浏览器开发者工具验证：

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 刷新页面，找到模型文件的请求
4. 查看响应头，应该能看到：
   ```
   Access-Control-Expose-Headers: Content-Length, Content-Type, ETag
   Content-Length: 8373440
   ```

## 关键配置项说明

- **AllowedOrigins**: 允许的来源，`*` 表示允许所有域名
- **AllowedMethods**: 允许的 HTTP 方法
- **AllowedHeaders**: 允许的请求头
- **ExposeHeaders**: **关键！** 允许前端 JavaScript 读取的响应头
- **MaxAgeSeconds**: 预检请求的缓存时间

## 如果仍然无法获取进度

如果配置后仍然无法获取下载进度，可能的原因：

1. **代理服务器问题**：如果前面有 Nginx 或其他代理，需要配置代理也转发这些头
2. **浏览器缓存**：清除浏览器缓存或使用无痕模式测试
3. **配置未生效**：重启 MinIO 服务

## 当前方案

目前代码已经实现了**模拟进度条**作为后备方案：
- 如果能获取真实进度，使用真实进度
- 如果无法获取，使用平滑的模拟进度（0% → 90% → 100%）
- 用户体验不受影响

所以即使不配置 CORS，功能也能正常工作！
