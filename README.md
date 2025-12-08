# 🎄 3D 交互式圣诞树

> 一个基于 **React**, **Three.js (R3F)** 和 **AI 手势识别** 的 3D 圣诞树 Web 应用。

这是一个承载记忆的交互式画廊。成千上万个粒子、璀璨的彩灯和悬浮的拍立得照片共同组成了一棵圣诞树。用户可以通过手势控制树的形态（聚合/散开）和视角旋转，还可以生成个性化祝福截图。

## 🌐 在线体验

- **Cloudflare 版本**: [https://etett.qzz.io/](https://etett.qzz.io/)
- **Vercel 版本**: 已暂时关闭

## ✨ 核心特性

* **3D 视觉体验**：由 08042 个发光粒子组成的树身，配合动态光晕 (Bloom) 和辉光效果
* **记忆画廊**：照片以"拍立得"风格悬浮在树上，每一张都是独立的发光体
* **AI 手势控制**（可选）：通过摄像头捕捉手势控制树的形态（聚合/散开）和视角旋转
* **个性化祝福**：输入名字生成专属祝福语，支持截图保存
* **移动端适配**：支持触摸缩放、旋转，双击恢复UI
* **全屏模式**：沉浸式体验，隐藏所有UI元素

## 🛠️ 技术栈

* **框架**: React 18, Vite
* **3D 引擎**: React Three Fiber (Three.js)
* **工具库**: @react-three/drei, Maath
* **后期处理**: @react-three/postprocessing
* **AI 视觉**: MediaPipe Tasks Vision (Google)

## 🚀 快速开始

### 1. 环境准备
确保你的电脑已安装 [Node.js](https://nodejs.org/) (建议 v18 或更高版本)。

### 2. 安装依赖
```bash
npm install
```

### 3. 启动项目
```bash
npm run dev
```

### 4. 构建生产版本
```bash
npm run build
```

## 🖼️ 自定义照片

### 1. 准备照片
找到项目目录下的 `public/photos/` 文件夹。

- **顶端大图/封面图**：命名为 `top.png`（将显示在树顶的立体五角星上）
- **树身照片**：命名为 `1.png`, `2.png`, `3.png` ... 依次类推

建议：使用正方形或 4:3 比例的图片，文件大小不宜过大（建议单张 500kb 以内以保证流畅度）

### 2. 替换照片
直接将你自己的照片复制到 `public/photos/` 文件夹中，覆盖原有的图片即可。请保持文件名格式不变（`1.png`, `2.png` 等）。

### 3. 修改照片数量
如果你放入了更多照片（例如从默认的 27 张增加到 50 张），需要修改代码：

打开文件：`src/App.tsx`

找到大约 **第 24 行** 的代码：
```javascript
// --- 动态生成照片列表 (使用 CDN 配置) ---
// 实际有27张编号照片：1-op.png
const TOTAL_NUMBERED_PHOTOS = 27; // <--- 修改这个数字！
```

## 🖐️ 手势控制说明

本项目内置了 AI 手势识别系统（需要用户确认后启用），请站在摄像头前进行操作：

| 手势 | 功能 | 说明 |
|------|------|------|
| 🖐 张开手掌 (Open Palm) | Disperse (散开) | 圣诞树炸裂成漫天飞舞的粒子和照片 |
| ✊ 握紧拳头 (Closed Fist) | Assemble (聚合) | 所有元素瞬间聚合成一棵完美的圣诞树 |
| 👋 手掌左右移动 | 旋转视角 | 手向左移，树向左转；手向右移，树向右转 |
| 👋 手掌上下移动 | 俯仰视角 | 手向上移，视角抬高；手向下移，视角降低 |

**注意**：AI 功能需要下载约 8MB 的模型文件，首次使用会提示确认。

## 📱 移动端操作

- **单指拖动**：旋转视角
- **双指捏合**：缩放
- **双击屏幕**：恢复隐藏的UI按钮

## 🎨 按钮功能

- **聚合/散开**：切换圣诞树的形态
- **启用AI手势**：开启摄像头手势识别（可选）
- **全屏**：进入/退出全屏模式
- **截图**：生成带祝福语的截图并下载
- **隐藏UI**：隐藏所有按钮（双击恢复）

## ⚙️ 配置说明

### CDN 配置（重要！）

为了保护隐私，CDN 地址使用环境变量配置，不会上传到 GitHub。

#### 方式一：环境变量（推荐）

1. **本地开发**：复制并编辑环境变量文件
   ```bash
   cp .env.example .env.local
   ```
   编辑 `.env.local`，填入你的 CDN 地址（或留空使用本地资源）

2. **Cloudflare Pages 部署**：
   - 无需配置，直接使用本地静态资源
   - 或在项目设置中添加环境变量（可选）

3. **Vercel 部署**：
   - 在项目设置中添加环境变量：
     - `VITE_CDN_BASE_URL`：你的 CDN 地址
     - `VITE_MEDIAPIPE_WASM_PATH`：MediaPipe WASM 路径

#### 方式二：配置文件（备选）

详细说明请查看 [CONFIG_SETUP.md](./CONFIG_SETUP.md)

### 视觉参数调整
如果你熟悉代码，可以在 `src/App.tsx` 中的 `CONFIG` 对象里调整更多视觉参数：

```javascript
const CONFIG = {
  colors: { ... }, // 修改树、灯光、边框的颜色
  counts: {
    foliage: 8042,    // 修改树叶粒子数量
    ornaments: 270,   // 修改悬挂的照片数量
    lights: 420       // 修改彩灯数量
  },
  tree: { height: 27 * 1.990, radius: 8.42 * 1.990 }, // 修改树的大小
};
```

## 📦 部署

### Vercel 部署
```bash
npm run build
# 将 dist 文件夹部署到 Vercel
```

### Cloudflare Pages 部署
```bash
npm run build
# 将 dist 文件夹部署到 Cloudflare Pages
```

## 📄 版权声明

本网站图片来源：华晨宇工作室（微博）  
若有侵权，联系作者删除  
邮箱：Dionruns@163.com

## 📝 License

MIT License. Feel free to use and modify for your own holiday celebrations!

---

**Merry Christmas! 🎄✨**
