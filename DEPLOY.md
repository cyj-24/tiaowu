# 🕺 摇摆舞动作分析器 - 部署指南

## 项目结构

```
swing-dance-analyzer/
├── web/                    # 前端 (React + TypeScript)
│   ├── dist/              # 构建输出
│   ├── src/               # 源代码
│   └── package.json
├── server/                 # 后端 (FastAPI + Python)
│   ├── main.py
│   ├── models/
│   └── requirements.txt
└── PLAN.md
```

## 本地开发

### 1. 启动前端开发服务器

```bash
cd web
npm install
npm run dev
```
前端运行在 http://localhost:3000

### 2. 启动后端服务器

```bash
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
后端运行在 http://localhost:8000

## 部署

### 方案一：Vercel + Render（推荐）

#### 前端部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 设置构建命令：`npm run build`
4. 设置输出目录：`dist`

#### 后端部署到 Render

1. 创建新的 Web Service
2. 选择 Python 环境
3. 设置启动命令：`uvicorn main:app --host 0.0.0.0 --port $PORT`
4. 添加环境变量（如需 OpenAI API）

### 方案二：单一服务器部署

```bash
# 1. 构建前端
cd web
npm run build

# 2. 复制前端到后端静态目录
cp -r dist/* ../server/static/

# 3. 部署后端
cd ../server
# 使用 Docker 或直接部署
```

## 环境变量

后端需要的环境变量（创建 `.env` 文件）：

```env
OPENAI_API_KEY=your_api_key_here  # 用于生成改进建议（可选）
```

## 当前状态

### ✅ 已完成
- [x] 前端 UI/UX 设计
- [x] 图片上传组件
- [x] 人物检测（模拟）
- [x] 姿态可视化（骨架叠加）
- [x] 分析面板和 AI 建议
- [x] 响应式设计（移动端友好）
- [x] 后端 API 框架

### 🚧 待完成（接入真实 AI）
- [ ] 集成 MediaPipe 姿态估计
- [ ] 集成 YOLO 人物检测
- [ ] 接入 OpenAI 生成建议
- [ ] 视频分析功能

## 演示

当前版本使用模拟数据演示功能。上传任意两张人物照片即可看到：

1. 人物检测边界框
2. 姿态关键点可视化
3. 角度差异分析
4. AI 改进建议

---

**注意**: MVP 版本使用前端模拟数据，如需真实 AI 分析，需要部署后端并连接 MediaPipe/YOLO 模型。

---

# 多用户生产环境部署

## 架构变更

```
开发环境（单用户）:
本地文件系统 → SQLite
    videos/         → 本地磁盘
    thumbnails/     → 本地磁盘
    swing_dance.db  → SQLite

生产环境（多用户）:
云存储 → 云数据库
    阿里云 OSS      → 视频/图片文件
    阿里云 RDS      → MySQL/PostgreSQL
```

## 部署步骤

### 1. 购买云服务

| 服务 | 推荐 | 用途 | 预估月费 |
|------|------|------|---------|
| 服务器 | 阿里云 ECS (2核4G) | 运行后端API | ~100元 |
| 对象存储 | 阿里云 OSS | 存储视频/图片 | ~10元/100GB |
| 数据库 | 阿里云 RDS MySQL | 用户数据 | ~50元 |
| CDN | 阿里云 CDN | 加速视频播放 | ~15元/100GB |
| **总计** | | | **~175元/月** |

### 2. 配置环境变量

创建 `server/.env` 文件：

```bash
# 数据库（生产环境用MySQL）
DATABASE_URL=mysql+pymysql://username:password@rds-endpoint:3306/swing_dance

# 阿里云 OSS
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET_NAME=your-bucket-name
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
OSS_DOMAIN=videos.yourdomain.com  # CDN域名

# 短信服务（可选）
SMS_ACCESS_KEY_ID=your-sms-key
SMS_ACCESS_KEY_SECRET=your-sms-secret

# JWT密钥
JWT_SECRET_KEY=your-random-secret-key
```

### 3. 后端改造文件

已创建以下改造文件：

| 文件 | 说明 |
|------|------|
| `models/database_v2.py` | 多用户数据库模型（User + DanceRecord） |
| `utils/storage.py` | 阿里云OSS上传工具 |
| `api/auth.py` | 手机号登录认证 |
| `api/calendar_v2.py` | 多用户日历API |

### 4. 安装生产依赖

```bash
cd server
pip install pymysql oss2 python-jose passlib
```

### 5. 修改 main.py

```python
# 使用多用户版本
from models.database_v2 import init_db
from api.calendar_v2 import router as calendar_router
from api.auth import router as auth_router

app.include_router(calendar_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
```

## 安全建议

1. **视频访问控制**: OSS Bucket设置为私有，通过后端生成临时访问URL
2. **HTTPS**: 配置SSL证书
3. **文件大小限制**: 视频最大 100MB
4. **频率限制**: 单用户每天最多上传 10 个视频
