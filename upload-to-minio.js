import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MinIO 配置
const MINIO_ENDPOINT = '122.51.20.250:9000';
const BUCKET_NAME = 'etchristmastree';
const ACCESS_KEY = 'YOUR_ACCESS_KEY'; // 请替换为你的 Access Key
const SECRET_KEY = 'YOUR_SECRET_KEY'; // 请替换为你的 Secret Key

console.log('MinIO 上传工具');
console.log('================');
console.log('');
console.log('⚠️  请先配置你的 MinIO 凭证：');
console.log('   编辑此文件，替换 ACCESS_KEY 和 SECRET_KEY');
console.log('');
console.log('或者使用 MinIO Client (mc) 命令：');
console.log('');
console.log('1. 安装 mc:');
console.log('   https://min.io/docs/minio/linux/reference/minio-mc.html');
console.log('');
console.log('2. 配置别名:');
console.log(`   mc alias set myminio http://${MINIO_ENDPOINT} YOUR_ACCESS_KEY YOUR_SECRET_KEY`);
console.log('');
console.log('3. 上传文件:');
console.log(`   mc cp --recursive public/* myminio/${BUCKET_NAME}/`);
console.log('');
console.log('4. 设置公开访问:');
console.log(`   mc anonymous set download myminio/${BUCKET_NAME}`);
console.log('');
console.log('5. 验证上传:');
console.log(`   curl http://${MINIO_ENDPOINT}/${BUCKET_NAME}/photos/1.jpg`);
console.log('');

// 列出需要上传的文件
const publicDir = path.join(__dirname, 'public');

function listFiles(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath, baseDir));
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({
        path: fullPath,
        relativePath: relativePath,
        size: stat.size
      });
    }
  }
  
  return files;
}

console.log('需要上传的文件列表：');
console.log('==================');

const files = listFiles(publicDir);
let totalSize = 0;

files.forEach(file => {
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);
  console.log(`  ${file.relativePath} (${sizeMB} MB)`);
  totalSize += file.size;
});

console.log('');
console.log(`总计: ${files.length} 个文件, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log('');
console.log('上传后的访问地址示例：');
console.log(`  http://${MINIO_ENDPOINT}/${BUCKET_NAME}/photos/1.jpg`);
console.log(`  http://${MINIO_ENDPOINT}/${BUCKET_NAME}/dikhololo_night_1k.hdr`);
console.log(`  http://${MINIO_ENDPOINT}/${BUCKET_NAME}/mediapipe-models/gesture_recognizer.task`);
