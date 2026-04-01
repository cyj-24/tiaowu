# 摇摆舞动作分析器 - 开发指南

## 项目结构

```
swing-dance-analyzer/
├── web/                    # 前端 (React + PWA)
│   ├── src/
│   │   ├── components/     # UI组件
│   │   ├── pages/          # 页面
│   │   └── utils/          # 工具函数
│   └── public/
├── server/                 # 后端 (FastAPI)
│   ├── api/                # API路由
│   ├── models/             # AI模型
│   └── utils/              # 工具函数
└── README.md
```

## 开发命令

### 前端
```bash
cd web
npm install
npm run dev
```

### 后端
```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## 技术要点

1. **姿态估计**: MediaPipe Pose (33个关键点)
2. **多人检测**: YOLOv8 (边界框检测)
3. **可视化**: Canvas API 绘制骨架
4. **文件存储**: 本地存储 + 后端缓存

## API 设计

### POST /api/analyze
上传两张图片，返回姿态分析结果

**Request:**
```json
{
  "image1": "base64_string",
  "image2": "base64_string"
}
```

**Response:**
```json
{
  "persons1": [{"id": 0, "bbox": [x,y,w,h]}],
  "persons2": [{"id": 0, "bbox": [x,y,w,h]}],
  "pose1": {"keypoints": [[x,y,z], ...]},
  "pose2": {"keypoints": [[x,y,z], ...]},
  "analysis": {
    "angle_diffs": {},
    "suggestions": "..."
  }
}
```
