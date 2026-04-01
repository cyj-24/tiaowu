import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
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

  // 计算有效时长（取两个视频中较短的有效时长）
  const effectiveDuration = Math.min(
    syncResult.video1_duration - Math.max(0, syncResult.offset),
    syncResult.video2_duration - Math.max(0, -syncResult.offset)
  )

  // 当视频源变化时重置状态
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [mergedVideoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    // 防止视频拦截滚动
    const preventScrollLock = () => {
      video.blur()
    }

    // 视频加载后延迟移除焦点
    video.addEventListener('loadeddata', preventScrollLock)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('loadeddata', preventScrollLock)
    }
  }, [mergedVideoUrl])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }, [isPlaying])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    const video = videoRef.current
    if (video) {
      video.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const skipBackward = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 1)
    }
  }, [])

  const skipForward = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.min(duration, video.currentTime + 1)
    }
  }, [duration])

  // 计算当前时间对应的两个视频的原始时间
  const getOriginalTimes = useCallback((mergedTime: number) => {
    // merged video 的起始点是两个视频对齐后的起始点
    // video1 从 max(0, offset) 开始
    // video2 从 max(0, -offset) 开始
    const start1 = Math.max(0, syncResult.offset)
    const start2 = Math.max(0, -syncResult.offset)

    const time1 = start1 + mergedTime
    const time2 = start2 + mergedTime

    return { time1, time2 }
  }, [syncResult.offset])

  const handleExtractFrame = useCallback(async () => {
    setIsExtracting(true)
    setError(null)

    try {
      const { time1, time2 } = getOriginalTimes(currentTime)

      // 从两个原始视频中分别提取当前帧
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
    const ms = Math.floor((time % 1) * 100)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4" style={{ touchAction: 'pan-y' }}>
      {/* 视频播放器 */}
      <div className="card overflow-hidden bg-black" style={{ touchAction: 'pan-y' }}>
        <div className="relative aspect-video">
          <video
            ref={videoRef}
            src={mergedVideoUrl}
            className="w-full h-full object-contain"
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            onLoadedData={(e) => {
              // 防止视频自动获得焦点导致滚动锁定
              e.currentTarget.blur()
            }}
            style={{
              touchAction: 'pan-y pan-x',
              pointerEvents: 'auto',
              WebkitTouchCallout: 'none',
              userSelect: 'none'
            }}
          />

          {/* 中央播放按钮覆盖层 */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/20 z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* 控制栏 */}
        <div className="p-4 space-y-3">
          {/* 进度条 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 font-mono w-16">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || effectiveDuration}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${(currentTime / (duration || effectiveDuration)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || effectiveDuration)) * 100}%, rgba(255,255,255,0.2) 100%)`
              }}
            />
            <span className="text-xs text-white/50 font-mono w-16 text-right">
              {formatTime(duration || effectiveDuration)}
            </span>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={skipBackward}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-400 hover:to-purple-400 flex items-center justify-center transition-all hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={skipForward}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* 提取帧按钮 */}
            <button
              onClick={handleExtractFrame}
              disabled={isExtracting}
              className="btn btn-primary flex items-center gap-2"
            >
              {isExtracting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  提取中...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  选择当前帧
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 同步信息 */}
      <div className="card p-4 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-white/40">时间偏移</span>
              <span className="ml-2 font-mono text-white">
                {syncResult.offset > 0 ? '+' : ''}{syncResult.offset.toFixed(2)}s
              </span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div>
              <span className="text-white/40">匹配度</span>
              <span className="ml-2 font-mono text-white">
                {(syncResult.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <button
            onClick={onReset}
            className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重新对齐
          </button>
        </div>
      </div>

      {/* 使用说明 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card bg-white/5 p-4"
      >
        <h4 className="text-sm font-medium text-white mb-2">如何使用</h4>
        <ul className="text-xs text-white/50 space-y-1">
          <li>• 播放视频查看同步效果</li>
          <li>• 拖动进度条或点击快进/快退精确调整位置</li>
          <li>• 在想要对比的动作处点击"选择当前帧"</li>
          <li>• 系统将自动提取两个视频的对应帧进行分析</li>
        </ul>
      </motion.div>

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-red-500/10 border-red-500/30 p-3"
        >
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  )
}
