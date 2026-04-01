import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Camera, SkipBack, SkipForward, RotateCcw } from 'lucide-react'

interface VideoSyncPlayerProps {
  mergedVideoUrl: string
  video1: File
  video2: File
  syncResult: {
    offset: number
    confidence: number
    video1_duration: number
    video2_duration: number
  }
  onFrameSelect: (frame1: string, frame2: string, time1: number, time2: number) => void
  onReset: () => void
}

export default function VideoSyncPlayer({
  mergedVideoUrl,
  video1,
  video2,
  syncResult,
  onFrameSelect,
  onReset
}: VideoSyncPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveDuration = Math.min(
    syncResult.video1_duration - Math.max(0, syncResult.offset),
    syncResult.video2_duration - Math.max(0, -syncResult.offset)
  )

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [mergedVideoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [mergedVideoUrl])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    isPlaying ? video.pause() : video.play()
  }, [isPlaying])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const getOriginalTimes = useCallback((mergedTime: number) => {
    const start1 = Math.max(0, syncResult.offset)
    const start2 = Math.max(0, -syncResult.offset)
    return { time1: start1 + mergedTime, time2: start2 + mergedTime }
  }, [syncResult.offset])

  const handleExtractFrame = useCallback(async () => {
    setIsExtracting(true)
    setError(null)
    try {
      const { time1, time2 } = getOriginalTimes(currentTime)
      const { extractFrameFromVideo } = await import('../utils/api')
      const [result1, result2] = await Promise.all([
        extractFrameFromVideo(video1, time1),
        extractFrameFromVideo(video2, time2)
      ])
      if (result1.success && result2.success) {
        onFrameSelect(result1.image, result2.image, time1, time2)
      } else {
        throw new Error('提取帧失败')
      }
    } catch (err: any) {
      setError(err.message || '提取帧失败')
    } finally {
      setIsExtracting(false)
    }
  }, [currentTime, getOriginalTimes, video1, video2, onFrameSelect])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 10)
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`
  }

  return (
    <div className="space-y-6">
      {/* 核心工作台 */}
      <div className="bg-white rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-100/50">
        <div className="relative aspect-video bg-gray-900 group">
          <video
            ref={videoRef}
            src={mergedVideoUrl}
            className="w-full h-full object-contain"
            playsInline
            onLoadedData={(e) => e.currentTarget.blur()}
          />

          <AnimatePresence>
            {!isPlaying && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all hover:bg-black/10"
              >
                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center scale-110 shadow-2xl">
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 交互控制层 */}
        <div className="p-8 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest tabular-nums">
                {formatTime(currentTime)}
              </span>
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest tabular-nums">
                {formatTime(duration || effectiveDuration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || effectiveDuration}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-gray-900"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 0.1 }}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 active:scale-95"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-[24px] bg-gray-900 flex items-center justify-center text-white shadow-xl shadow-gray-200 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
              </button>
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime += 0.1 }}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-100 active:scale-95"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleExtractFrame}
              disabled={isExtracting}
              className={`
                px-8 py-5 rounded-[24px] font-black text-[15px] transition-all flex items-center gap-3 shadow-xl
                ${isExtracting 
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                  : 'bg-emerald-500 text-white shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98]'
                }
              `}
            >
              {isExtracting ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              <span>锁定当前动作进行对比</span>
            </button>
          </div>
        </div>
      </div>

      {/* 详细数据卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100/50">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">对齐偏移 / Offset</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-gray-900">
              {syncResult.offset > 0 ? '+' : ''}{syncResult.offset.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-gray-400">SEC</span>
          </div>
        </div>
        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100/50">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">AI 匹配度 / Match</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-500">
              {Math.round(syncResult.confidence * 100)}
            </span>
            <span className="text-[10px] font-bold text-emerald-400">%</span>
          </div>
        </div>
      </div>

      {/* 操作提示 & 重置 */}
      <div className="bg-gray-50/50 rounded-[28px] p-6 border border-gray-100 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">💡</span>
          </div>
          <p className="text-[12px] leading-relaxed text-gray-500 font-medium italic">
            播放视频观察动作一致性，如有毫厘偏差，可点击右上角展开手动微调工具，直到音乐重拍完全重合。
          </p>
        </div>
        <button
          onClick={onReset}
          className="w-full py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-rose-500 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3 h-3" />
          重置视频并重新上传素材
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl text-xs font-bold border border-rose-100"
        >
          {error}
        </motion.div>
      )}
    </div>
  )
}
