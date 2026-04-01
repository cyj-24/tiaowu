import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Activity, X } from 'lucide-react'

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
        if (!response.ok) throw new Error('获取详情分析数据失败')
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

  // Phase Chart
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

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)

    const v1 = data.video1
    const v2 = data.video2
    const maxDuration = Math.max(v1.duration, v2.duration)
    const effectiveOffset = offset + manualOffset
    const padding = 60
    const graphHeight = (height - padding * 3) / 2
    const graphWidth = width - padding * 2

    const timeToX = (time: number, videoOffset: number = 0) => padding + ((time + videoOffset) / maxDuration) * graphWidth

    // Drawing V1 Onset (Deep Navy)
    ctx.strokeStyle = '#0F172A'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    v1.onset.forEach((value, i) => {
      const x = timeToX(v1.onset_times[i])
      const y = padding + graphHeight - (value / Math.max(...v1.onset)) * graphHeight * 0.8
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Drawing V2 Onset (Emerald)
    ctx.strokeStyle = '#10B981'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    v2.onset.forEach((value, i) => {
      const x = timeToX(v2.onset_times[i], effectiveOffset)
      const y = padding * 2 + graphHeight * 2 - (value / Math.max(...v2.onset)) * graphHeight * 0.8
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    ctx.setLineDash([2, 4])
    ctx.strokeStyle = '#E2E8F0'
    v1.beat_times.forEach(time => {
      const x = timeToX(time)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + graphHeight)
      ctx.stroke()
    })

    v2.beat_times.forEach(time => {
      const x = timeToX(time, effectiveOffset)
      ctx.beginPath()
      ctx.moveTo(x, padding * 2 + graphHeight)
      ctx.lineTo(x, padding * 2 + graphHeight * 2)
      ctx.stroke()
    })
    ctx.setLineDash([])

    // Labels
    ctx.fillStyle = '#94A3B8'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText(`MASTER (BPM: ${v1.bpm.toFixed(0)})`, padding, padding - 15)
    ctx.fillText(`CURRENT (BPM: ${v2.bpm.toFixed(0)})`, padding, padding * 2 + graphHeight - 15)

    const centerX = width / 2
    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(centerX, padding / 2)
    ctx.lineTo(centerX, height - padding / 2)
    ctx.stroke()

  }, [data, offset, manualOffset])

  // Chroma Chart
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

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)

    const v1 = data.video1
    const v2 = data.video2
    const effectiveOffset = offset + manualOffset
    const padding = 40
    const graphWidth = width - padding * 2
    const rowHeight = (height - padding * 2) / 24 
    const maxDuration = Math.max(v1.duration, v2.duration)

    const timeToX = (time: number, videoOffset: number = 0) => padding + ((time + videoOffset) / maxDuration) * graphWidth

    const drawChroma = (chroma: number[][], chromaTimes: number[], videoOffset: number, baseY: number, baseColor: string) => {
      const nFrames = chroma[0]?.length || 0
      for (let noteIdx = 0; noteIdx < 12; noteIdx++) {
        const y = baseY + (11 - noteIdx) * rowHeight
        for (let i = 0; i < nFrames; i++) {
          const time = chromaTimes[i] || (i * maxDuration / nFrames)
          const x = timeToX(time, videoOffset)
          const barWidth = Math.max(1, (graphWidth / nFrames))
          const intensity = chroma[noteIdx]?.[i] || 0
          const alpha = Math.min(1, intensity * 1.5)
          ctx.fillStyle = baseColor.replace('1)', `${alpha})`)
          ctx.fillRect(x, y, barWidth, rowHeight - 0.5)
        }
      }
    }

    drawChroma(v1.chroma, v1.chroma_times, 0, padding, 'rgba(15, 23, 42, 1)')
    drawChroma(v2.chroma, v2.chroma_times, effectiveOffset, padding + rowHeight * 12 + 10, 'rgba(16, 185, 129, 1)')

  }, [data, offset, manualOffset])

  const handleApplyOffset = () => onAdjustOffset?.(manualOffset)

  if (loading) {
    return (
      <div className="bg-white rounded-[40px] p-12 shadow-xl flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin" />
        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">正在解析音频频谱</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-[40px] p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900">解析异常</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 text-rose-600 text-sm font-bold">{error}</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden"
    >
      {/* 头部精简设计 */}
      <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 fill-white flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 leading-tight">音频指纹分析 / Audio Phase</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Offset: {offset.toFixed(3)}s
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                Match: {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-all active:scale-95">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8 space-y-10">
        {/* Onset Analysis */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-900 animate-pulse" />
              节拍能量对齐 / Beat Onset Analysis
            </h4>
          </div>
          <div className="relative rounded-[32px] overflow-hidden border border-gray-100 shadow-inner bg-gray-50/30">
            <canvas ref={canvasRef} className="w-full h-64" style={{ height: '256px' }} />
          </div>
        </div>

        {/* Chroma Analysis */}
        <div className="space-y-4">
          <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-widest px-2">音高特征热力图 / Pitch Chroma Graph</h4>
          <div className="relative rounded-[32px] overflow-hidden border border-gray-100 shadow-inner bg-gray-50/30">
            <canvas ref={chromaCanvasRef} className="w-full h-48" style={{ height: '192px' }} />
          </div>
        </div>

        {/* Manual Fine Tuning */}
        <div className="bg-gray-50/50 rounded-[32px] p-8 space-y-8 border border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">毫秒级手动微调 / Fine Tuning</h4>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums transition-colors ${manualOffset !== 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                {manualOffset > 0 ? '+' : ''}{manualOffset.toFixed(2)}
              </span>
              <span className="text-[10px] font-black text-gray-400 uppercase">SEC</span>
            </div>
          </div>
          
          <input
            type="range"
            min="-15"
            max="15"
            step="0.05"
            value={manualOffset}
            onChange={(e) => setManualOffset(parseFloat(e.target.value))}
            className="w-full h-3 bg-white rounded-full appearance-none cursor-pointer accent-gray-900 border border-gray-100"
          />

          <div className="flex gap-4">
            <button
              onClick={handleApplyOffset}
              disabled={manualOffset === 0}
              className={`
                flex-1 py-5 rounded-[24px] font-black text-sm tracking-widest uppercase transition-all shadow-xl
                ${manualOffset === 0 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' 
                  : 'bg-gray-900 text-white shadow-gray-200 hover:scale-[1.02] active:scale-[0.98]'
                }
              `}
            >
              更新对齐方案
            </button>
            <button
              onClick={() => setManualOffset(0)}
              className="px-10 py-5 rounded-[24px] border-2 border-gray-200 font-black text-sm tracking-widest uppercase text-gray-400 hover:bg-white hover:text-gray-900 transition-all active:scale-95"
            >
              重置
            </button>
          </div>
        </div>

        {/* Algorithm Comparison */}
        {data?.algorithms && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '梅尔频谱', key: 'mel' },
              { label: '重拍强度', key: 'onset' },
              { label: '音色映射', key: 'chroma' }
            ].map(algo => (
              <div key={algo.key} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm text-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{algo.label}</span>
                <div className="text-lg font-black text-gray-900">{(data.algorithms as any)[algo.key].offset.toFixed(2)}s</div>
                <div className="text-[10px] font-bold text-emerald-500 mt-1">{((data.algorithms as any)[algo.key].score * 100).toFixed(0)}% Match</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-8 py-6 bg-gray-900 flex items-center justify-center">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Professional Audio Synchronization Toolset v2.0</p>
      </div>
    </motion.div>
  )
}
