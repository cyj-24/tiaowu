import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Activity, X, RefreshCw } from 'lucide-react'

interface WaveformData {
  duration: number
  waveform: number[]
  onset: number[]
  onset_times: number[]
  beat_times: number[]
  bpm: number
  chroma: number[][]  // 12 x N 的音高特征矩阵
  chroma_times: number[]
}

interface SyncDebugData {
  success: boolean
  video1: WaveformData
  video2: WaveformData
  algorithms?: {
    mel: { offset: number; score: number }
    onset: { offset: number; score: number }
    chroma: { offset: number; score: number }
  }
}

interface SyncDebugPanelProps {
  video1: File
  video2: File
  offset: number
  confidence: number
  onClose: () => void
  onAdjustOffset?: (adjustment: number) => void
}

export default function SyncDebugPanel({ video1, video2, offset, confidence, onClose, onAdjustOffset }: SyncDebugPanelProps) {
  const [data, setData] = useState<SyncDebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualOffset, setManualOffset] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chromaCanvasRef = useRef<HTMLCanvasElement>(null)

  // 获取波形数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const formData = new FormData()
        formData.append('video1', video1)
        formData.append('video2', video2)

        const response = await fetch('http://localhost:8000/api/audio-waveform', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('获取波形数据失败')
        }

        const result = await response.json()
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [video1, video2])

  // 绘制相位图
  useEffect(() => {
    if (!data || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // 清空画布
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    const v1 = data.video1
    const v2 = data.video2

    // 计算最大时长
    const maxDuration = Math.max(v1.duration, v2.duration)
    const effectiveOffset = offset + manualOffset

    // 绘制参数
    const padding = 40
    const graphHeight = (height - padding * 3) / 2
    const graphWidth = width - padding * 2

    // 辅助函数：时间转x坐标
    const timeToX = (time: number, videoOffset: number = 0) => {
      return padding + ((time + videoOffset) / maxDuration) * graphWidth
    }

    // 绘制视频1的onset（蓝色）
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1
    ctx.beginPath()
    v1.onset.forEach((value, i) => {
      const x = timeToX(v1.onset_times[i])
      const y = padding + graphHeight - (value / Math.max(...v1.onset)) * graphHeight * 0.8
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 绘制视频2的onset（紫色，带偏移）
    ctx.strokeStyle = '#a855f7'
    ctx.lineWidth = 1
    ctx.beginPath()
    v2.onset.forEach((value, i) => {
      const x = timeToX(v2.onset_times[i], effectiveOffset)
      const y = padding * 2 + graphHeight * 2 - (value / Math.max(...v2.onset)) * graphHeight * 0.8
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 绘制节拍线
    ctx.setLineDash([2, 2])

    // 视频1节拍线
    ctx.strokeStyle = '#60a5fa'
    v1.beat_times.forEach(time => {
      const x = timeToX(time)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + graphHeight)
      ctx.stroke()
    })

    // 视频2节拍线（带偏移）
    ctx.strokeStyle = '#c084fc'
    v2.beat_times.forEach(time => {
      const x = timeToX(time, effectiveOffset)
      ctx.beginPath()
      ctx.moveTo(x, padding * 2 + graphHeight)
      ctx.lineTo(x, padding * 2 + graphHeight * 2)
      ctx.stroke()
    })

    ctx.setLineDash([])

    // 绘制标签
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px sans-serif'
    ctx.fillText(`视频1 (BPM: ${v1.bpm.toFixed(1)})`, padding, padding - 10)
    ctx.fillText(`视频2 (BPM: ${v2.bpm.toFixed(1)})`, padding, padding * 2 + graphHeight - 10)

    // 绘制时间轴
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, height - padding / 2)
    ctx.lineTo(width - padding, height - padding / 2)
    ctx.stroke()

    // 时间刻度
    for (let t = 0; t <= maxDuration; t += 5) {
      const x = timeToX(t)
      ctx.fillStyle = '#64748b'
      ctx.fillText(`${t}s`, x - 10, height - 10)
    }

    // 绘制对齐提示线
    const centerX = width / 2
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(centerX, padding)
    ctx.lineTo(centerX, height - padding)
    ctx.stroke()
    ctx.setLineDash([])

    // 对齐提示文字
    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText('对齐点', centerX - 15, padding - 20)

  }, [data, offset, manualOffset])

  // 绘制音高（Chroma）热力图
  useEffect(() => {
    if (!data || !chromaCanvasRef.current) return

    const canvas = chromaCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // 清空画布
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    const v1 = data.video1
    const v2 = data.video2
    const effectiveOffset = offset + manualOffset

    // 12个半音名称
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

    const padding = 40
    const graphWidth = width - padding * 2
    const rowHeight = (height - padding * 2) / 12 / 2  // 两个视频，每个12行

    const maxDuration = Math.max(v1.duration, v2.duration)

    // 辅助函数：时间转x坐标
    const timeToX = (time: number, videoOffset: number = 0) => {
      return padding + ((time + videoOffset) / maxDuration) * graphWidth
    }

    // 绘制单个视频的 Chroma 热力图
    const drawChroma = (chroma: number[][], chromaTimes: number[], videoOffset: number, baseY: number, color: string) => {
      const nFrames = chroma[0]?.length || 0

      for (let noteIdx = 0; noteIdx < 12; noteIdx++) {
        const y = baseY + (11 - noteIdx) * rowHeight  // 倒序，C在下面

        // 绘制每一帧
        for (let i = 0; i < nFrames; i++) {
          const time = chromaTimes[i] || (i * maxDuration / nFrames)
          const x = timeToX(time, videoOffset)
          const nextX = timeToX(chromaTimes[i + 1] || time + 0.1, videoOffset)
          const barWidth = Math.max(1, nextX - x)

          const intensity = chroma[noteIdx]?.[i] || 0
          const alpha = Math.min(1, intensity * 2)  // 增强对比度

          if (color === 'blue') {
            ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`
          } else {
            ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`
          }

          ctx.fillRect(x, y, barWidth, rowHeight - 1)
        }
      }
    }

    // 绘制视频1的 Chroma（上半部分，蓝色）
    drawChroma(v1.chroma, v1.chroma_times, 0, padding, 'blue')

    // 绘制视频2的 Chroma（下半部分，紫色，带偏移）
    drawChroma(v2.chroma, v2.chroma_times, effectiveOffset, padding + rowHeight * 12 + 10, 'purple')

    // 绘制分隔线
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding + rowHeight * 12 + 5)
    ctx.lineTo(width - padding, padding + rowHeight * 12 + 5)
    ctx.stroke()

    // 绘制音高标签
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px sans-serif'
    for (let i = 0; i < 12; i++) {
      const y1 = padding + (11 - i) * rowHeight + rowHeight / 2
      const y2 = padding + rowHeight * 12 + 10 + (11 - i) * rowHeight + rowHeight / 2
      ctx.fillText(notes[i], 10, y1)
      ctx.fillText(notes[i], 10, y2)
    }

    // 绘制时间轴
    ctx.strokeStyle = '#475569'
    ctx.beginPath()
    ctx.moveTo(padding, height - padding / 2)
    ctx.lineTo(width - padding, height - padding / 2)
    ctx.stroke()

    for (let t = 0; t <= maxDuration; t += 5) {
      const x = timeToX(t)
      ctx.fillStyle = '#64748b'
      ctx.fillText(`${t}s`, x - 10, height - 10)
    }

    // 绘制对齐提示线
    const centerX = width / 2
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(centerX, padding)
    ctx.lineTo(centerX, height - padding)
    ctx.stroke()

  }, [data, offset, manualOffset])

  const handleApplyOffset = () => {
    if (onAdjustOffset) {
      onAdjustOffset(manualOffset)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
          <span className="text-white">加载音频分析数据...</span>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-red-500/10"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-red-400 font-semibold">加载失败</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-white/50 text-sm">{error}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* 头部 */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="font-semibold text-white">音频相位调试</h3>
            <p className="text-white/50 text-xs">
              自动偏移: {offset.toFixed(3)}s | 置信度: {(confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 相位图 */}
      <div className="p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-64 rounded-lg bg-[#1a1a2e]"
          style={{ width: '100%', height: '256px', touchAction: 'pan-y' }}
        />
        <p className="text-white/40 text-xs mt-2 text-center">
          蓝色 = 视频1节拍强度 | 紫色 = 视频2节拍强度（应用偏移后）| 虚线 = 检测到的节拍
        </p>
      </div>

      {/* 音高（Chroma）热力图 */}
      <div className="px-4 pb-4">
        <canvas
          ref={chromaCanvasRef}
          className="w-full h-48 rounded-lg bg-[#1a1a2e]"
          style={{ width: '100%', height: '192px', touchAction: 'pan-y' }}
        />
        <p className="text-white/40 text-xs mt-2 text-center">
          音高热力图：上行=视频1，下行=视频2（带偏移）| 颜色深浅=该音高（C, C#, D...B）的强度
        </p>
      </div>

      {/* 手动调整 */}
      <div className="px-4 pb-4 space-y-3">
        {/* 滑块调整 */}
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-sm whitespace-nowrap">手动微调:</span>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.05"
            value={manualOffset}
            onChange={(e) => setManualOffset(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
          <span className={`font-mono text-sm w-16 text-right ${
            manualOffset !== 0 ? 'text-orange-400' : 'text-white/50'
          }`}>
            {manualOffset > 0 ? '+' : ''}{manualOffset.toFixed(2)}s
          </span>
        </div>

        {/* 精确输入 */}
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-sm whitespace-nowrap">精确输入:</span>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              min="-15"
              max="15"
              step="0.01"
              value={manualOffset}
              onChange={(e) => setManualOffset(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500"
            />
            <span className="text-white/50 text-sm">秒</span>
          </div>
          <span className="text-white/50 text-xs">
            最终: {(offset + manualOffset).toFixed(3)}s
          </span>
        </div>

        {manualOffset !== 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 flex gap-2"
          >
            <button
              onClick={handleApplyOffset}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              应用调整 ({(offset + manualOffset).toFixed(3)}s)
            </button>
            <button
              onClick={() => setManualOffset(0)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
            >
              重置
            </button>
          </motion.div>
        )}
      </div>

      {/* 算法对比 */}
      {data?.algorithms && (
        <div className="px-4 pb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <h4 className="text-white/70 text-xs font-medium mb-2">三种算法对比</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-500/10 rounded p-2">
                <div className="text-blue-400 text-xs font-medium">梅尔频谱</div>
                <div className="text-white font-mono text-sm">{data.algorithms.mel.offset.toFixed(2)}s</div>
                <div className="text-white/40 text-xs">{(data.algorithms.mel.score * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-purple-500/10 rounded p-2">
                <div className="text-purple-400 text-xs font-medium">节拍检测</div>
                <div className="text-white font-mono text-sm">{data.algorithms.onset.offset.toFixed(2)}s</div>
                <div className="text-white/40 text-xs">{(data.algorithms.onset.score * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-green-500/10 rounded p-2">
                <div className="text-green-400 text-xs font-medium">音高特征</div>
                <div className="text-white font-mono text-sm">{data.algorithms.chroma.offset.toFixed(2)}s</div>
                <div className="text-white/40 text-xs">{(data.algorithms.chroma.score * 100).toFixed(0)}%</div>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-2">
              系统优先使用「节拍检测+音高特征」融合结果。如果三个算法差异较大，建议手动调整。
            </p>
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="px-4 pb-4">
        <div className="bg-white/5 rounded-lg p-3 text-xs text-white/50 space-y-1">
          <p>• 上方图表显示两段视频的节拍强度曲线</p>
          <p>• 橙色虚线表示对齐参考点</p>
          <p>• 拖动滑块微调偏移，点击"应用调整"重新合并视频</p>
        </div>
      </div>
    </motion.div>
  )
}
