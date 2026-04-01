# 大模型建议生成 - 成本分析

## 方案对比

### 输入/输出估算

每次分析请求的 Token 估算：
- **输入**：姿态数据（关键点坐标、角度差异）+ Prompt ≈ **800 tokens**
- **输出**：建议文本 ≈ **400 tokens**

### 各方案成本对比（单次请求）

| 提供商 | 模型 | 输入价格 | 输出价格 | 单次成本 | 月成本(1000次) |
|--------|------|----------|----------|----------|----------------|
| **Anthropic** | Claude 3.5 Sonnet | $3/MTok | $15/MTok | **¥0.015** | **¥15** |
| Anthropic | Claude 3 Opus | $15/MTok | $75/MTok | ¥0.075 | ¥75 |
| Anthropic | Claude 3 Haiku | $0.25/MTok | $1.25/MTok | ¥0.0013 | ¥1.3 |
| **OpenAI** | GPT-4o mini | $0.15/MTok | $0.60/MTok | **¥0.0015** | **¥1.5** |
| OpenAI | GPT-4o | $2.50/MTok | $10/MTok | ¥0.025 | ¥25 |
| OpenAI | GPT-3.5 Turbo | $0.50/MTok | $1.50/MTok | ¥0.003 | ¥3 |
| **阿里** | 通义千问-Turbo | ¥2/MTok | ¥6/MTok | **¥0.002** | **¥2** |
| 阿里 | 通义千问-Plus | ¥4/MTok | ¥12/MTok | ¥0.004 | ¥4 |
| 阿里 | 通义千问-Max | ¥20/MTok | ¥60/MTok | ¥0.020 | ¥20 |

*汇率按 $1 = ¥7 计算*

---

## 推荐方案

### 🥇 首推：GPT-4o mini（OpenAI）

**理由**：
- 成本最低：单次仅 ¥0.0015（不到2分钱）
- 质量足够：对于舞蹈建议生成任务表现良好
- 响应快：适合实时场景

**适用场景**：预算有限、请求量大

### 🥈 备选：Claude 3.5 Sonnet（Anthropic）

**理由**：
- 推理能力强：对结构化数据理解更好
- 中文表达自然：生成的建议更流畅
- 适中的价格：单次 ¥0.015

**适用场景**：追求建议质量、预算充足

### 🥉 国内选择：通义千问-Turbo（阿里）

**理由**：
- 价格便宜：单次 ¥0.002
- 国内访问快：无需代理
- 支持支付宝充值

**适用场景**：国内用户、希望用人民币支付

---

## 使用量预估

### 个人用户
- 每天分析 5-10 张照片
- 月请求量：150-300 次
- **月成本**：¥0.2 - ¥4.5

### 小型舞团（10人）
- 每天分析 20-50 张照片
- 月请求量：600-1500 次
- **月成本**：¥0.9 - ¥22.5

### 大型应用（1000用户）
- 月请求量：10,000-50,000 次
- **月成本**：¥15 - ¥750

---

## 成本优化策略

### 1. 缓存机制
对相同的大师姿态只生成一次建议模板，用户姿态与不同模板对比时复用。

**节省**：30-50%

### 2. 降级策略
- 相似度 > 90%：使用规则生成（免费）
- 相似度 < 90%：使用 LLM 生成

**节省**：40-60%

### 3. 批量处理
累积多个分析请求，批量调用 API（部分 API 支持批量折扣）

### 4. 混合方案
使用规则生成基础建议，LLM 只在检测到显著差异时介入补充专业建议。

---

## 配置示例

### 方案 A：最省钱
```bash
USE_LLM_SUGGESTIONS=true
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4o-mini
```
月成本：约 ¥2（1000次）

### 方案 B：平衡质量
```bash
USE_LLM_SUGGESTIONS=true
LLM_PROVIDER=claude
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```
月成本：约 ¥15（1000次）

### 方案 C：完全免费（回退规则）
```bash
USE_LLM_SUGGESTIONS=false
```
月成本：¥0

---

## 快速开始

1. 复制配置文件
```bash
cp server/.env.example server/.env
```

2. 编辑 `.env`，填入你的 API Key

3. 安装依赖
```bash
cd server
pip install anthropic openai dashscope
```

4. 重启服务
```bash
source venv/bin/activate
uvicorn main:app --reload
```

---

## API Key 获取地址

- **Claude**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/
- **通义千问**: https://dashscope.aliyun.com/
