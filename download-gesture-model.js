import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const OUTPUT_DIR = path.join(__dirname, 'public', 'mediapipe-models');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'gesture_recognizer.task');

// 创建目录
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('✓ 创建目录:', OUTPUT_DIR);
}

console.log('开始下载 MediaPipe 手势识别模型...');
console.log('URL:', MODEL_URL);
console.log('保存到:', OUTPUT_FILE);
console.log('');

const file = fs.createWriteStream(OUTPUT_FILE);
let downloadedBytes = 0;

https.get(MODEL_URL, (response) => {
  const totalBytes = parseInt(response.headers['content-length'], 10);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
  
  console.log(`文件大小: ${totalMB} MB`);
  console.log('');

  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
    const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(2);
    process.stdout.write(`\r下载进度: ${progress}% (${downloadedMB}/${totalMB} MB)`);
  });

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('\n');
    console.log('✓ 下载完成！');
    console.log('✓ 文件已保存到:', OUTPUT_FILE);
  });
}).on('error', (err) => {
  fs.unlink(OUTPUT_FILE, () => {});
  console.error('\n✗ 下载失败:', err.message);
  process.exit(1);
});
