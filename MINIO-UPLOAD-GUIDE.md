# MinIO/S3 上传指南

## CDN 配置
- **Bucket 名称**: `etchristmastree`
- **访问地址**: `http://122.51.20.250:9000/etchristmastree`

## 需要上传的文件结构

请将 `public` 文件夹中的所有内容上传到 MinIO bucket，保持以下目录结构：

```
etchristmastree/
├── photos/
│   ├── 1.jpg
│   ├── 2.jpg
│   ├── ... (3-24.jpg)
│   ├── 25.PNG
│   ├── 26.png
│   ├── 27.png
│   ├── top.png
│   ├── phone_bg.png
│   ├── bg.png
│   ├── flower3.png
│   ├── flower4.png
│   ├── ... (flower5-13.png)
│   └── ...
├── mediapipe-wasm/
│   ├── wasm/
│   │   ├── vision_wasm_internal.js
│   │   ├── vision_wasm_internal.wasm
│   │   └── vision_wasm_nosimd_internal.wasm
│   └── vision_bundle.mjs
├── mediapipe-models/
│   └── gesture_recognizer.task (8 MB)
├── dikhololo_night_1k.hdr
└── 全新硬笔行书简.ttf
```

## 上传命令示例

如果使用 MinIO Client (mc):

```bash
# 配置 MinIO 别名
mc alias set myminio http://122.51.20.250:9000 YOUR_ACCESS_KEY YOUR_SECRET_KEY

# 上传整个 public 文件夹
mc cp --recursive public/* myminio/etchristmastree/

# 或者分别上传
mc cp --recursive public/photos myminio/etchristmastree/
mc cp --recursive public/mediapipe-wasm myminio/etchristmastree/
mc cp --recursive public/mediapipe-models myminio/etchristmastree/
mc cp public/dikhololo_night_1k.hdr myminio/etchristmastree/
mc cp public/全新硬笔行书简.ttf myminio/etchristmastree/
```

## 设置公开访问

确保 bucket 或文件设置为公开可读：

```bash
# 设置 bucket 策略为公开读取
mc anonymous set download myminio/etchristmastree
```

## 验证上传

上传完成后，可以通过浏览器访问测试：

- 照片: `http://122.51.20.250:9000/etchristmastree/photos/1.jpg`
- HDR: `http://122.51.20.250:9000/etchristmastree/dikhololo_night_1k.hdr`
- AI 模型: `http://122.51.20.250:9000/etchristmastree/mediapipe-models/gesture_recognizer.task`

## 文件大小统计

- **照片文件**: 约 50-100 MB
- **AI 模型**: 8 MB
- **HDR 环境贴图**: 1.7 MB
- **MediaPipe WASM**: 约 3 MB
- **字体文件**: 约 5 MB
- **总计**: 约 70-120 MB

## 注意事项

1. 确保所有文件都设置为公开可读
2. 保持文件路径和文件名大小写一致
3. 特别注意 `25.PNG` 是大写的 PNG
4. 确保 CORS 设置允许跨域访问（如果需要）

## CORS 配置（如果需要）

如果遇到跨域问题，需要在 MinIO 中设置 CORS：

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

使用命令设置：
```bash
mc admin config set myminio api cors_allow_origin="*"
```
