import { Person, AnalysisResult } from '../types'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

// 真实 API - 人物检测
export async function detectPersons(imageBase64: string): Promise<Person[]> {
  const response = await fetch(`${API_BASE_URL}/api/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 })
  })

  if (!response.ok) {
    throw new Error('Detection failed')
  }

  return await response.json()
}

// 真实 API - 姿态分析
export async function analyzePoses(
  myImage: string,
  masterImage: string,
  myPersonId: number,
  masterPersonId: number
): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image1: myImage,
      image2: masterImage,
      person1_id: myPersonId,
      person2_id: masterPersonId
    })
  })

  if (!response.ok) {
    throw new Error('Analysis failed')
  }

  const result = await response.json()
  console.log('API Response:', result)
  console.log('myPose keypoints count:', result.myPose?.keypoints?.length)
  console.log('masterPose keypoints count:', result.masterPose?.keypoints?.length)

  // 统计 visibility >= 0.5 的关键点
  const myVisible = result.myPose?.keypoints?.filter((kp: any) => kp.visibility >= 0.5).length
  const masterVisible = result.masterPose?.keypoints?.filter((kp: any) => kp.visibility >= 0.5).length
  console.log('myPose visible keypoints (>=0.5):', myVisible)
  console.log('masterPose visible keypoints (>=0.5):', masterVisible)

  // 查看 masterPose 各关键点的 visibility
  console.log('masterPose visibilities:', result.masterPose?.keypoints?.map((kp: any, i: number) => `${i}:${kp.visibility.toFixed(2)}`).join(', '))

  // 生成可直接发给大模型的完整 Prompt
  const KEYPOINT_NAMES = [
    '鼻子', '左眼内', '左眼', '左眼外', '右眼内', '右眼', '右眼外', '左耳', '右耳',
    '嘴左', '嘴右', '左肩', '右肩', '左肘', '右肘', '左腕', '右腕',
    '左小指', '右小指', '左食指', '右食指', '左拇指', '右拇指',
    '左髋', '右髋', '左膝', '右膝', '左踝', '右踝', '左脚', '右脚', '左趾', '右趾'
  ]

  const ANGLE_NAMES: Record<string, string> = {
    leftShoulderAngle: '左肩角度（手臂展开）',
    rightShoulderAngle: '右肩角度（手臂展开）',
    leftElbowAngle: '左肘角度',
    rightElbowAngle: '右肘角度',
    leftHipAngle: '左髋角度',
    rightHipAngle: '右髋角度',
    leftKneeAngle: '左膝角度',
    rightKneeAngle: '右膝角度',
    torsoAngle: '躯干角度',
    shoulderTilt: '肩膀倾斜度（正值=左肩高）'
  }

  // 构建关键点差异描述
  const keypointDiffs: string[] = []
  const myKps = result.myPose?.keypoints || []
  const masterKps = result.masterPose?.keypoints || []

  for (let i = 0; i < 33; i++) {
    const uk = myKps[i]
    const mk = masterKps[i]
    if (uk?.visibility > 0.5 && mk?.visibility > 0.5) {
      const diffX = uk.x - mk.x
      const diffY = uk.y - mk.y
      if (Math.abs(diffX) > 0.03 || Math.abs(diffY) > 0.03) {
        const directionX = diffX > 0 ? '偏右' : '偏左'
        const directionY = diffY > 0 ? '偏下' : '偏上'
        keypointDiffs.push(`- ${KEYPOINT_NAMES[i]}: 相对于大师 ${directionX}${Math.abs(diffX).toFixed(3)} ${directionY}${Math.abs(diffY).toFixed(3)}`)
      }
    }
  }

  // 构建角度差异描述
  const angleDiffs: string[] = []
  for (const [key, value] of Object.entries(result.angleDiffs || {})) {
    const numValue = value as number
    const name = ANGLE_NAMES[key] || key
    const direction = numValue > 0 ? '偏大' : '偏小'
    const severity = Math.abs(numValue) > 20 ? '显著' : Math.abs(numValue) > 10 ? '明显' : '轻微'
    angleDiffs.push(`- ${name}: ${numValue > 0 ? '+' : ''}${numValue.toFixed(1)}° (${severity}${direction})`)
  }

  const prompt = `你是一位专业的摇摆舞（Swing Dance）教练。请根据以下AI姿态分析数据，给学员提供具体、可操作的舞蹈改进建议。

## 分析数据

### 整体相似度
${result.similarity.toFixed(1)}%${result.similarity > 80 ? '（优秀）' : result.similarity > 60 ? '（良好）' : '（需要改进）'}

### 关节角度差异
${angleDiffs.join('\n') || '- 无明显角度差异'}

### 关键点位置差异（相对于大师）
${keypointDiffs.slice(0, 15).join('\n') || '- 无明显位置差异'}

### 姿态特征对比
**用户姿态特点：**
${myKps[11]?.visibility > 0.5 ? `- 左肩位置: (${myKps[11].x.toFixed(3)}, ${myKps[11].y.toFixed(3)})` : '- 左肩未检测到'}
${myKps[12]?.visibility > 0.5 ? `- 右肩位置: (${myKps[12].x.toFixed(3)}, ${myKps[12].y.toFixed(3)})` : '- 右肩未检测到'}
${myKps[23]?.visibility > 0.5 ? `- 左髋位置: (${myKps[23].x.toFixed(3)}, ${myKps[23].y.toFixed(3)})` : '- 左髋未检测到'}
${myKps[24]?.visibility > 0.5 ? `- 右髋位置: (${myKps[24].x.toFixed(3)}, ${myKps[24].y.toFixed(3)})` : '- 右髋未检测到'}

**大师姿态特点：**
${masterKps[11]?.visibility > 0.5 ? `- 左肩位置: (${masterKps[11].x.toFixed(3)}, ${masterKps[11].y.toFixed(3)})` : '- 左肩未检测到'}
${masterKps[12]?.visibility > 0.5 ? `- 右肩位置: (${masterKps[12].x.toFixed(3)}, ${masterKps[12].y.toFixed(3)})` : '- 右肩未检测到'}
${masterKps[23]?.visibility > 0.5 ? `- 左髋位置: (${masterKps[23].x.toFixed(3)}, ${masterKps[23].y.toFixed(3)})` : '- 左髋未检测到'}
${masterKps[24]?.visibility > 0.5 ? `- 右髋位置: (${masterKps[24].x.toFixed(3)}, ${masterKps[24].y.toFixed(3)})` : '- 右髋未检测到'}

## 要求（请严格遵守）

1. **具体可操作**：每条建议必须包含：
   - **具体问题**：用舞者能懂的语言描述（如"耸肩"、"站得太直"）
   - **具体做法**：给出1-2个可执行的动作指令
   - **检验方法**：如何知道自己做对了（如"对着镜子看..."、"应该感觉..."）

2. **避免抽象词汇**：不要用"放松"、"自然"、"保持"等模糊词，改用具体动作描述

3. **结合摇摆舞**：提及具体舞步概念（如 Swing Out 的 1-2 拍准备姿势、Triple Step 的 bounce）

4. **数据对照**：解释角度差异意味着什么（如"+42° 肩膀抬高" vs "大师的肩膀是下沉的"）

5. **优先级排序**：最多3个主要问题，按影响程度排序

6. **练习要具体**：每个练习不超过5分钟，能立即做

请用中文回复，格式如下：

**整体评价**：1句话概括 + 1句鼓励（不说"还有很大提升空间"这种废话）

**需要改进的地方**（最多3个，按重要性）：

🔴 **【部位】具体问题**（数据：XX°）
- **问题描述**：用通俗语言说清差距（如"你在耸肩，大师肩膀是沉下去的"）
- **具体做法**：1-2个可执行的动作步骤
- **检验方法**：怎么知道自己做对了

**练习建议**（3个，每个3-5分钟）：
1. 【练习名称】：具体做法
2. 【练习名称】：具体做法
3. 【练习名称】：具体做法

**鼓励的话**：1句具体的肯定 + 1句期望（不说空话）`

  console.log('%c========== 可直接复制给 LLM 的 Prompt ==========', 'color: green; font-size: 14px; font-weight: bold;')
  console.log('%c' + prompt, 'color: #333;')
  console.log('%c================================================', 'color: green; font-size: 14px; font-weight: bold;')
  console.log('%c💡 复制上面的内容，粘贴到 Claude/ChatGPT/通义千问即可', 'color: blue;')

  return result
}

// 视频同步相关类型
export interface VideoSyncResult {
  success: boolean
  offset: number
  confidence: number
  video1_duration: number
  video2_duration: number
  video1_bpm?: number
  video2_bpm?: number
  message: string
}

export interface SyncedFramesResult extends VideoSyncResult {
  synced_time1: number
  synced_time2: number
  frames?: [string | null, string | null]
}

// 同步两段视频
export async function syncVideos(
  video1: File,
  video2: File
): Promise<VideoSyncResult> {
  const formData = new FormData()
  formData.append('video1', video1)
  formData.append('video2', video2)

  const response = await fetch(`${API_BASE_URL}/api/sync-videos`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Sync failed')
  }

  return await response.json()
}

// 获取同步后的对齐帧
export async function getSyncedFrames(
  video1: File,
  video2: File,
  timestamp1: number,
  timestamp2: number
): Promise<SyncedFramesResult> {
  const formData = new FormData()
  formData.append('video1', video1)
  formData.append('video2', video2)
  formData.append('timestamp1', timestamp1.toString())
  formData.append('timestamp2', timestamp2.toString())

  const response = await fetch(`${API_BASE_URL}/api/sync-frames`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Sync frames failed')
  }

  return await response.json()
}

// 合并视频为并排视频
export async function mergeVideos(
  video1: File,
  video2: File,
  offset: number
): Promise<Blob> {
  const formData = new FormData()
  formData.append('video1', video1)
  formData.append('video2', video2)
  formData.append('offset', offset.toString())

  const response = await fetch(`${API_BASE_URL}/api/merge-videos`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Merge failed')
  }

  return await response.blob()
}

// 从视频中提取指定时间的帧
export async function extractFrameFromVideo(
  video: File,
  timeSec: number
): Promise<{ success: boolean; image: string; time: number }> {
  const formData = new FormData()
  formData.append('video', video)
  formData.append('time_sec', timeSec.toString())

  const response = await fetch(`${API_BASE_URL}/api/extract-frame`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Extract frame failed')
  }

  return await response.json()
}
