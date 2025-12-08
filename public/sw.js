// Service Worker - 缓存策略优化
const CACHE_NAME = 'christmas-tree-v1';
const CACHE_ASSETS = [
  // 这里不预缓存，让浏览器自然缓存即可
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: 缓存已打开');
      return cache.addAll(CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: 清除旧缓存', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 拦截请求 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只缓存同源请求和静态资源
  if (url.origin !== location.origin && !url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|mp3|hdr|ttf|woff|woff2|task)$/)) {
    return;
  }

  // 对于图片、音频、字体等静态资源使用缓存优先策略
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|mp3|hdr|ttf|woff|woff2|task)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Service Worker: 从缓存返回', url.pathname);
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // 只缓存成功的响应
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: 缓存新资源', url.pathname);
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
  }
});
