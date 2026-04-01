import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Music, Check, AlertCircle,
  Play, Pause, Activity, Settings2,
  Video, Sparkles, ChevronRight, RotateCcw,
  Camera
} from 'lucide-react'
import { syncVideos, mergeVideos, VideoSyncResult } from '../utils/api'
import { extractFrameFromVideo } from '../utils/api'

// 步骤类型
type Step = 'upload' | 'syncing' | 'preview'

interface VideoSyncPageProps {
  onSyncComplete?: (
    result: VideoSyncResult,
    frame1: string,
    frame2: string,
    video1: File,
    video2: File
  ) => void
}

export default function VideoSyncPage({ onSyncComplete }: VideoSyncPageProps) {
  // 视频文件状态
  const [video1, setVideo1] = useState<File | null>(null)
  const [video2, setVideo2] = useState<File | null>(null)
  const [video1Url, setVideo1Url] = useState<string>('')
  const [video2Url, setVideo2Url] = useState<string>('')

  // 流程状态
  const [step, setStep] = useState<Step>('upload')
  const [syncResult, setSyncResult] = useState<VideoSyncResult | null>(null)
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)

  // 调试面板
  const [showDebug, setShowDebug] = useState(false)
  const [manualOffset, setManualOffset] = useState(0)

  // 错误提示
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // 视频1上传
  const onDropVideo1 = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setVideo1(file)
    setVideo1Url(URL.createObjectURL(file))
    setError(null)
  }, [])

  // 视频2上传
  const onDropVideo2 = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setVideo2(file)
    setVideo2Url(URL.createObjectURL(file))
    setError(null)
  }, [])

  const dropzone1 = useDropzone({
    onDrop: onDropVideo1,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] },
    multiple: false
  })

  const dropzone2 = useDropzone({
    onDrop: onDropVideo2,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] },
    multiple: false
  })

  // 开始对齐
  const handleSync = async () => {
    if (!video1 || !video2) return

    setStep('syncing')
    setError(null)

    try {
      // 第一步：音频同步分析
      const result = await syncVideos(video1, video2)
      setSyncResult(result)

      if (result.success) {
        // 第二步：合并视频
        const mergedBlob = await mergeVideos(video1, video2, result.offset + manualOffset)
        const mergedUrl = URL.createObjectURL(mergedBlob)
        setMergedVideoUrl(mergedUrl)
        setStep('preview')
      } else {
        setStep('upload')
        setError(result.message)
      }
    } catch (err: any) {
      setStep('upload')
      setError(err.message || '对齐失败')
    }
  }

  // 重新对齐（带手动调整）
  const handleReMerge = async () => {
    if (!video1 || !video2 || !syncResult) return

    try {
      const newOffset = syncResult.offset + manualOffset
      const mergedBlob = await mergeVideos(video1, video2, newOffset)
      const mergedUrl = URL.createObjectURL(mergedBlob)

      if (mergedVideoUrl) {
        URL.revokeObjectURL(mergedVideoUrl)
      }

      setMergedVideoUrl(mergedUrl)
    } catch (err: any) {
      setError(err.message || '重新合并失败')
    }
  }

  // 播放控制
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  // 计算当前时间对应的两个视频的原始时间
  const getOriginalTimes = useCallback((mergedTime: number) => {
    if (!syncResult) return { time1: 0, time2: 0 }
    const start1 = Math.max(0, syncResult.offset)
    const start2 = Math.max(0, -syncResult.offset)
    return {
      time1: start1 + mergedTime,
      time2: start2 + mergedTime
    }
  }, [syncResult])

  // 提取当前帧
  const handleExtractFrame = useCallback(async () => {
    if (!video1 || !video2 || !syncResult || !onSyncComplete) return

    setIsExtracting(true)
    try {
      const { time1, time2 } = getOriginalTimes(currentTime)

      const [result1, result2] = await Promise.all([
        extractFrameFromVideo(video1, time1),
        extractFrameFromVideo(video2, time2)
      ])

      if (result1.success && result2.success) {
        onSyncComplete(syncResult, result1.image, result2.image, video1, video2)
      }
    } catch (err) {
      console.error('提取帧失败:', err)
    } finally {
      setIsExtracting(false)
    }
  }, [currentTime, getOriginalTimes, video1, video2, syncResult, onSyncComplete])

  // 重置
  const handleReset = () => {
    setStep('upload')
    setVideo1(null)
    setVideo2(null)
    setVideo1Url('')
    setVideo2Url('')
    setSyncResult(null)
    setMergedVideoUrl('')
    setManualOffset(0)
    setError(null)
  }

  // 步骤指示器
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 py-6">
      {[
        { id: 'upload', label: '上传视频', icon: Video },
        { id: 'syncing', label: '智能对齐', icon: Activity },
        { id: 'preview', label: '预览对比', icon: Play }
      ].map((s, index) => {
        const isActive = step === s.id
        const isCompleted =
          (step === 'syncing' && s.id === 'upload') ||
          (step === 'preview' && s.id !== 'preview')

        return (
          <div key={s.id} className="flex items-center">
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
              ${isActive ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : ''}
              ${isCompleted ? 'bg-white/10 text-orange-400' : 'bg-white/5 text-white/40'}
            `}>
              <s.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            {index < 2 && (
              <ChevronRight className="w-4 h-4 text-white/20 mx-2" />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0F0F0F] pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#0F0F0F]/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">视频对齐</h1>
              <p className="text-white/40 text-xs">AI 智能节拍同步</p>
            </div>
          </div>

          {step === 'preview' && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-xl transition-colors ${
                showDebug ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              <Settings2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* 步骤指示器 */}
      <StepIndicator />

      <div className="px-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* 上传步骤 */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* 主标题 */}
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  上传两段舞蹈视频
                </h2>
                <p className="text-white/50">
                  系统会自动识别音乐节拍并精准对齐
                </p>
              </div>

              {/* 视频1上传卡片 */}
              <motion.div
                className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/5"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                      <span className="text-xl">🎬</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">我的视频</h3>
                      <p className="text-white/40 text-sm">你的舞蹈录制</p>
                    </div>
                  </div>
                </div>

                {!video1 ? (
                  <div className="p-4">
                    <div
                      {...dropzone1.getRootProps()}
                      className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer"
                    >
                      <input {...dropzone1.getRootProps()} />
                      <Upload className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                      <p className="text-white font-medium">点击或拖拽上传</p>
                      <p className="text-white/40 text-sm mt-1">支持 MP4, MOV 格式</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      <video
                        src={video1Url}
                        className="w-full h-48 object-cover"
                        controls
                      />
                      <button
                        onClick={() => { setVideo1(null); setVideo1Url('') }}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 text-white rounded-full flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-white/50 text-xs mt-2 text-center">
                      {video1.name} · {(video1.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                )}
              </motion.div>

              {/* 视频2上传卡片 */}
              <motion.div
                className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/5"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                      <span className="text-xl">🌟</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">参考视频</h3>
                      <p className="text-white/40 text-sm">大师或对比视频</p>
                    </div>
                  </div>
                </div>

                {!video2 ? (
                  <div className="p-4">
                    <div
                      {...dropzone2.getRootProps()}
                      className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer"
                    >
                      <input {...dropzone2.getRootProps()} />
                      <Upload className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                      <p className="text-white font-medium">点击或拖拽上传</p>
                      <p className="text-white/40 text-sm mt-1">支持 MP4, MOV 格式</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      <video
                        src={video2Url}
                        className="w-full h-48 object-cover"
                        controls
                      />
                      <button
                        onClick={() => { setVideo2(null); setVideo2Url('') }}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 text-white rounded-full flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-white/50 text-xs mt-2 text-center">
                      {video2.name} · {(video2.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                )}
              </motion.div>

              {/* 对齐按钮 */}
              {video1 && video2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-4"
                >
                  <button
                    onClick={handleSync}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Music className="w-5 h-5" />
                    开始智能对齐
                  </button>
                  <p className="text-center text-white/40 text-sm mt-3">
                    AI 将自动分析音频节拍并计算最佳同步点
                  </p>
                </motion.div>
              )}

              {/* 错误提示 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 对齐中步骤 */}
          {step === 'syncing' && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-10 h-10 text-orange-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">正在分析音频...</h3>
              <p className="text-white/50 text-center">
                提取音频特征 · 检测节拍 · 计算同步点
              </p>
            </motion.div>
          )}

          {/* 预览步骤 */}
          {step === 'preview' && syncResult && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* 对齐结果卡片 */}
              <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">对齐成功</p>
                      <p className="text-white/40 text-sm">
                        偏移 {syncResult.offset > 0 ? '+' : ''}{syncResult.offset.toFixed(2)}s ·
                        置信度 {(syncResult.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="p-2 text-white/40 hover:text-white"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 调试面板 */}
              <AnimatePresence>
                {showDebug && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5"
                  >
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-orange-400" />
                      手动微调
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="-3"
                          max="3"
                          step="0.01"
                          value={manualOffset}
                          onChange={(e) => setManualOffset(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-white/10 rounded-lg appearance-none"
                        />
                        <span className="text-orange-400 font-mono text-sm w-16 text-right">
                          {manualOffset > 0 ? '+' : ''}{manualOffset.toFixed(2)}s
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleReMerge}
                          className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          应用调整 ({(syncResult.offset + manualOffset).toFixed(2)}s)
                        </button>
                        <button
                          onClick={() => setManualOffset(0)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors"
                        >
                          重置
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 视频播放器 */}
              {mergedVideoUrl && (
                <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/5">
                  <div className="relative aspect-video bg-black">
                    <video
                      ref={videoRef}
                      src={mergedVideoUrl}
                      className="w-full h-full object-contain"
                      playsInline
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    />

                    {/* 播放按钮覆盖层 */}
                    {!isPlaying && (
                      <button
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/40"
                      >
                        <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* 控制栏 */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center justify-center gap-4 flex-1">
                      <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </button>
                    </div>

                    {onSyncComplete && (
                      <button
                        onClick={handleExtractFrame}
                        disabled={isExtracting}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
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
                    )}
                  </div>
                </div>
              )}

              {/* 使用提示 */}
              <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-2xl p-4 border border-orange-500/20">
                <h4 className="text-white font-medium mb-2">💡 使用提示</h4>
                <ul className="text-white/60 text-sm space-y-1">
                  <li>• 播放视频检查同步效果</li>
                  <li>• 如需微调，点击右上角设置按钮</li>
                  <li>• 满意后可截图或录屏保存对比</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
