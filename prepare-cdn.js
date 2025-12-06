/**
 * 准备 CDN 上传文件
 * 将所有需要上传到 CDN 的文件复制到 cdn-assets 文件夹
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');
const cdnDir = path.join(__dirname, 'cdn-assets');

// 需要复制的文件列表
const filesToCopy = [
  // 照片文件
  ...Array.from({ length: 27 }, (_, i) => {
    const num = i + 1;
    if (num === 25) return 'photos/25.PNG';
    if (num >= 26) return `photos/${num}.png`;
    return `photos/${num}.jpg`;
  }),
  'photos/top.png',
  'photos/phone_bg.png',
  'photos/flower3.png',
  'photos/flower4.png',
  'photos/flower5.png',
  'photos/flower6.png',
  'photos/flower7.png',
  'photos/flower8.png',
  'photos/flower10.png',
  'photos/flower11.png',
  'photos/flower12.png',
  'photos/flower13.png',
  // HDR 环境贴图
  'dikhololo_night_1k.hdr',
  // 字体文件
  '全新硬笔行书简.ttf'
];

// 创建 cdn-assets 目录
if (!fs.existsSync(cdnDir)) {
  fs.mkdirSync(cdnDir, { recursive: true });
}

// 创建 photos 子目录
const photosDir = path.join(cdnDir, 'photos');
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

console.log('📦 开始准备 CDN 文件...\n');

let totalSize = 0;
let copiedCount = 0;

filesToCopy.forEach(file => {
  const sourcePath = path.join(publicDir, file);
  const destPath = path.join(cdnDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    const stats = fs.statSync(destPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    totalSize += stats.size;
    copiedCount++;
    console.log(`✓ ${file} (${sizeMB} MB)`);
  } else {
    console.log(`✗ ${file} (文件不存在)`);
  }
});

console.log(`\n✅ 完成！共复制 ${copiedCount} 个文件`);
console.log(`📊 总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`📁 输出目录: ${cdnDir}`);
console.log('\n📤 下一步：将 cdn-assets 文件夹上传到你的 CDN');
