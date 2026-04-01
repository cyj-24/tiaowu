# 🕺 摇摆舞动作分析器

帮助摇摆舞者对比自己和大师的动作差异，获得专业分析建议。

## 产品规划

### 版本 1：图片对比分析（MVP）
- [ ] 上传两张跳舞照片（自己和大师）
- [ ] AI 姿态识别（单人/双人）
- [ ] 骨架叠加对比可视化
- [ ] 动作差异分析报告
- [ ] 改进建议生成

### 版本 2：视频对比分析
- [ ] 上传两段跳舞视频
- [ ] 关键帧自动提取/手动选择
- [ ] 多人物追踪（支持双人舞选择）
- [ ] 时序动作对比
- [ ] 动态轨迹可视化

## 技术架构

### 前端
- **框架**: React + TypeScript
- **移动端**: PWA（渐进式 Web 应用）
- **样式**: Tailwind CSS
- **媒体处理**: FFmpeg.js（视频）

### 后端
- **服务**: Node.js / Python FastAPI
- **AI 模型**:
  - MediaPipe Pose（人体姿态识别）
  - YOLO（多人检测）
- **存储**: 本地 IndexedDB / 云存储

### AI 分析能力
1. **姿态估计**: 提取 33 个关键点
2. **角度计算**: 关节角度、身体倾斜度
3. **相似度计算**: 余弦相似度 / DTW 算法
4. **动作描述**: 基于规则 / LLM 生成建议

## 文件结构

```
swing-dance-analyzer/
├── web/                    # 前端应用
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── pages/          # 页面
│   │   ├── utils/          # 工具函数
│   │   └── hooks/          # 自定义 hooks
│   └── public/
├── server/                 # 后端服务
│   ├── api/                # API 路由
│   ├── models/             # AI 模型封装
│   └── utils/              # 工具函数
└── docs/                   # 文档
```

## 快速开始

### 开发环境
```bash
cd web
npm install
npm run dev
```

### 构建
```bash
npm run build
```

## 部署

- 前端: Vercel / GitHub Pages
- 后端: Render / Railway
