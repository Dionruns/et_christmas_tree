// CDN 配置
export const CDN_BASE_URL = '';

// MediaPipe WASM 文件路径
export const MEDIAPIPE_WASM_PATH = '/mediapipe-wasm';

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
      if (num === 25) return '/photos/25.PNG';
      if (num >= 26) return `/photos/${num}.png`;
      return `/photos/${num}.jpg`;
    })
  },
  // 环境贴图
  hdr: '/dikhololo_night_1k.hdr',
  // 字体文件
  font: '/全新硬笔行书简.ttf'
};
