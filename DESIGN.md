# UI 设计系统 - 移动端 APP 风格

## 设计理念

### 目标平台
- **主要平台**: iOS / Android 手机
- **技术方案**: PWA (Progressive Web App)
- **设计模式**: 原生移动 APP 风格

### 核心特征
1. **底部 TabBar 导航** - 符合移动端操作习惯
2. **全屏布局** - 无最大宽度限制，填满屏幕
3. **iOS 风格组件** - 分段控制器、开关、滑块等
4. **页面切换动画** - 滑动进入/退出效果
5. **安全区域适配** - 支持刘海屏、底部手势条

## 设计系统

### 色彩方案 (iOS 风格)
```css
--color-primary: #007AFF;        /* iOS 蓝 */
--color-primary-dark: #0051D5;
--color-secondary: #34C759;      /* iOS 绿 */
--color-accent: #FF9500;         /* iOS 橙 */
--color-danger: #FF3B30;         /* iOS 红 */
--color-bg: #F2F2F7;             /* iOS 系统灰 */
--color-surface: #FFFFFF;
--color-text: #000000;
--color-text-secondary: #8E8E93;
--color-border: #C6C6C8;
```

### 布局规范
- **导航栏高度**: 48px (iOS) / 56px (Android)
- **TabBar 高度**: 64px + 安全区域
- **内容边距**: 16px
- **卡片圆角**: 10px (iOS 风格)
- **按钮高度**: 48-56px (触控友好)

### 字体规范
- **字体族**: -apple-system, BlinkMacSystemFont, 'SF Pro Display'
- **标题**: 17px, font-weight: 600
- **正文**: 17px, font-weight: 400
- **辅助文字**: 13-15px, color: #8E8E93
- **TabBar 标签**: 10px

### 动画规范
- **页面切换**: 300ms, cubic-bezier(0.25, 0.46, 0.45, 0.94)
- **按钮按下**: transform: scale(0.98), 100ms
- **淡入效果**: 300ms ease

## 页面结构

### 1. 首页 (UploadPage)
```
┌─────────────────────┐
│     导航栏           │  48px + 安全区域
│   摇摆舞分析          │
├─────────────────────┤
│                     │
│   [App Logo]        │
│   对比你的舞姿        │
│                     │
├─────────────────────┤
│ 📸 我的照片          │  iOS 卡片组
│ [上传区域]           │
├─────────────────────┤
│ 🌟 大师照片          │
│ [上传区域]           │
├─────────────────────┤
│   [开始分析]         │  主按钮
│                     │
├─────────────────────┤
│ 🏠    ⏱️    👤      │  TabBar
│首页   历史   我的    │  64px + 安全区域
└─────────────────────┘
```

### 2. 分析页 (AnalysisPage) - 全屏模式
```
┌─────────────────────┐
│ ←  分析结果          │  导航栏 + 返回按钮
├─────────────────────┤
│                     │
│    动作相似度        │
│     72%            │  大字号评分
│                     │
├─────────────────────┤
│ [叠加] [并排]        │  分段控制器
│ 开关: 关键点/骨架    │  iOS 开关
│ 滑块: 透明度         │  iOS 滑块
├─────────────────────┤
│                     │
│   [姿态对比图]       │  Canvas
│                     │
├─────────────────────┤
│ 角度对比 | AI 建议   │  Tab 切换
├─────────────────────┤
│ 💪 左肩角度  +5.2°   │  差异列表
│ 🦾 左肘角度  -3.1°   │
├─────────────────────┤
│   [再试一次]         │  底部按钮
│   [分享结果]         │
└─────────────────────┘
```

## iOS vs Android 适配

### 差异处理
| 特性 | iOS | Android |
|------|-----|---------|
| 导航栏高度 | 48px | 56px |
| 字体 | SF Pro | Roboto |
| 阴影 | 轻微 | 较重 |
| 回弹效果 | -webkit-overflow-scrolling | 默认 |
| 安全区域 | env(safe-area-inset-*) | 相同 |

### 自动适配代码
```css
@supports not (-webkit-touch-callout: none) {
  /* Android 样式 */
  :root {
    --navbar-height: 56px;
  }
}
```

## 移动端调试指南

### 1. Chrome 开发者工具 (推荐)
```
1. 打开 http://localhost:3000
2. 按 F12 打开开发者工具
3. 点击左上角手机图标
4. 选择设备: iPhone 14 Pro / Pixel 7
5. 刷新页面查看效果
```

### 2. 真机调试
```bash
# 获取电脑 IP
ifconfig | grep "inet " | head -1

# 手机浏览器访问
http://电脑IP:3000
```

### 3. iOS Safari 远程调试
```
1. iPhone 连接 Mac
2. iPhone: 设置 → Safari → 高级 → 开启 Web 检查器
3. Mac Safari: 开发菜单 → 选择 iPhone →  localhost:3000
```

## 触控优化

### 按钮尺寸
- 最小触控区域: 44x44px (Apple) / 48x48px (Material)
- 实际按钮: 48-56px 高度

### 手势支持
- 点击反馈: active 状态缩放
- 禁止文字选择: user-select: none
- 禁止图片拖动: user-drag: none

### 输入优化
- 上传区域: 点击和拖拽都支持
- 滑块: 28px 触摸手柄
- 开关: 51x31px (iOS 标准)

## PWA 配置

### manifest.json
```json
{
  "name": "摇摆舞分析器",
  "short_name": "摇摆舞分析",
  "display": "standalone",
  "background_color": "#F2F2F7",
  "theme_color": "#007AFF",
  "orientation": "portrait"
}
```

### 添加到主屏幕
- iOS: Safari → 分享 → 添加到主屏幕
- Android: Chrome → 菜单 → 添加到主屏幕

## 当前状态

### ✅ 已完成
- [x] 底部 TabBar 导航
- [x] iOS 风格 UI 组件
- [x] 安全区域适配
- [x] 触控优化
- [x] 页面切换动画
- [x] 响应式布局

### 📱 支持的设备
- iPhone SE / 12 / 13 / 14 / 15 系列
- Android 主流机型 (Pixel, Samsung, Xiaomi)
- 平板适配 (iPad, Android Tablet)

### 🔄 待优化
- [ ] 页面切换手势 (滑动返回)
- [ ] 下拉刷新
- [ ] 骨架屏加载
- [ ] 振动反馈 (Haptic)
