/**
 * 下载 MediaPipe WASM 文件到本地
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEDIAPIPE_VERSION = '0.10.3';
const BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;

// 需要下载的文件列表
const files = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm'
];

const outputDir = path.join(__dirname, 'public', 'mediapipe-wasm');

// 创建输出目录
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('📦 开始下载 MediaPipe WASM 文件...\n');

let downloadedCount = 0;

files.forEach(file => {
  const url = `${BASE_URL}/${file}`;
  const outputPath = path.join(outputDir, file);
  
  console.log(`⏳ 下载: ${file}...`);
  
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        const stats = fs.statSync(outputPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✓ ${file} (${sizeMB} MB)`);
        
        downloadedCount++;
        if (downloadedCount === files.length) {
          console.log(`\n✅ 完成！共下载 ${files.length} 个文件`);
          console.log(`📁 输出目录: ${outputDir}`);
          console.log('\n📝 下一步：修改 src/App.tsx 使用本地文件');
        }
      });
    } else {
      console.log(`✗ ${file} 下载失败 (${response.statusCode})`);
    }
  }).on('error', (err) => {
    console.error(`✗ ${file} 下载出错:`, err.message);
  });
});
