// CDN 配置
// 如果是本地开发环境，使用本地资源；生产环境使用 CDN
const isDevelopment = import.meta.env.DEV;

// 导入私密配置（生产环境需要）
// 请复制 config.private.example.ts 为 config.private.ts 并填入实际的 CDN 地址
import { PRIVATE_CDN_BASE_URL, PRIVATE_MEDIAPIPE_WASM_PATH } from './config.private';

export const CDN_BASE_URL = isDevelopment 
  ? '' 
  : PRIVATE_CDN_BASE_URL;

// MediaPipe WASM 文件路径
export const MEDIAPIPE_WASM_PATH = isDevelopment
  ? '/mediapipe-wasm'
  : PRIVATE_MEDIAPIPE_WASM_PATH;

// 获取资源的完整 URL
export const getCDNUrl = (path: string) => {
  return `${CDN_BASE_URL}${path}`;
};

// 所有需要从 CDN 加载的资源路径
export const CDN_ASSETS = {
  // 照片资源
  photos: {
    top: '/photos/top.png',
    background: '/photos/phone_bg.png',
    numbered: Array.from({ length: 27 }, (_, i) => {
      const num = i + 1;
      return `/photos/${num}.jpg`;
    })
  },
  // 环境贴图
  hdr: '/dikhololo_night_1k.hdr',
  // 字体文件
  font: '/全新硬笔行书简.ttf'
};
