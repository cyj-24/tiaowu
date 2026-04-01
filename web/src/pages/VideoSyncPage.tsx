import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Music, Check, AlertCircle,
  Play, Pause, Activity, Settings2,
  Video, Sparkles, ChevronRight, RotateCcw,
  Camera, ChevronLeft
} from 'lucide-react'
import { syncVideos, mergeVideos, VideoSyncResult, extractFrameFromVideo } from '../utils/api'

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

  // 重新对齐
  const handleReMerge = async () => {
    if (!video1 || !video2 || !syncResult) return
    try {
      const newOffset = syncResult.offset + manualOffset
      const mergedBlob = await mergeVideos(video1, video2, newOffset)
      const mergedUrl = URL.createObjectURL(mergedBlob)
      if (mergedVideoUrl) URL.revokeObjectURL(mergedVideoUrl)
      setMergedVideoUrl(mergedUrl)
    } catch (err: any) {
      setError(err.message || '重新合并失败')
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.pause()
    else video.play()
    setIsPlaying(!isPlaying)
  }

  const getOriginalTimes = useCallback((mergedTime: number) => {
    if (!syncResult) return { time1: 0, time2: 0 }
    const start1 = Math.max(0, syncResult.offset + manualOffset)
    const start2 = Math.max(0, -(syncResult.offset + manualOffset))
    return {
      time1: start1 + mergedTime,
      time2: start2 + mergedTime
    }
  }, [syncResult, manualOffset])

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
    <div className="flex items-center justify-center gap-2 py-8">
      {[
        { id: 'upload', label: '素材上传', icon: Video },
        { id: 'syncing', label: '核心算法', icon: Activity },
        { id: 'preview', label: '对齐效果', icon: Play }
      ].map((s, index) => {
        const isActive = step === s.id
        const isCompleted =
          (step === 'syncing' && s.id === 'upload') ||
          (step === 'preview' && s.id !== 'preview')

        return (
          <div key={s.id} className="flex items-center">
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500
              ${isActive ? 'bg-[#007AFF] text-white shadow-[0_4px_15px_rgba(0,122,255,0.3)]' : ''}
              ${isCompleted ? 'bg-blue-50 text-blue-600' : isActive ? '' : 'text-gray-300'}
            `}>
              <s.icon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
            </div>
            {index < 2 && (
              <ChevronRight className="w-4 h-4 text-gray-200 mx-2" />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 顶部饰条 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

      {/* 导航栏 */}
      <header className="navbar">
        <button onClick={handleReset} className="navbar-back flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
        <h1 className="navbar-title text-[var(--text-primary)] font-bold">智能对齐</h1>
        {step === 'preview' ? (
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              showDebug ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'
            }`}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        ) : <div className="w-10" />}
      </header>

      <div className="relative pt-[calc(var(--navbar-height)+var(--safe-top)+8px)] px-6 max-w-2xl mx-auto">
        <StepIndicator />

        <AnimatePresence mode="wait">
          {/* 上传步骤 */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* 我的视频 */}
              <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50/50">
                 <div className="p-5 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                       <Video className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                       <h3 className="font-bold text-[var(--text-primary)]">我的录制</h3>
                       <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase opacity-40">Your Performance</p>
                    </div>
                 </div>

                 <div className="p-5">
                    {!video1 ? (
                       <div 
                         {...dropzone1.getRootProps()} 
                         className="border-2 border-dashed border-gray-100 rounded-[24px] py-10 text-center hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer"
                       >
                          <input {...dropzone1.getInputProps()} />
                          <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-50" />
                          <p className="text-[var(--text-primary)] font-bold text-sm">选择你的舞蹈视频</p>
                       </div>
                    ) : (
                       <div className="relative rounded-[24px] overflow-hidden bg-gray-900 shadow-xl">
                          <video src={video1Url} className="w-full aspect-video object-cover" />
                          <button 
                            onClick={() => { setVideo1(null); setVideo1Url('') }}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/20"
                          >
                             <RotateCcw className="w-4 h-4" />
                          </button>
                       </div>
                    )}
                 </div>
              </div>

              {/* 参考视频 */}
              <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50/50">
                 <div className="p-5 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                       <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                       <h3 className="font-bold text-[var(--text-primary)]">参考素材</h3>
                       <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase opacity-40">Master Reference</p>
                    </div>
                 </div>

                 <div className="p-5">
                    {!video2 ? (
                       <div 
                         {...dropzone2.getRootProps()} 
                         className="border-2 border-dashed border-gray-100 rounded-[24px] py-10 text-center hover:border-purple-200 hover:bg-purple-50/20 transition-all cursor-pointer"
                       >
                          <input {...dropzone2.getInputProps()} />
                          <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2 opacity-50" />
                          <p className="text-[var(--text-primary)] font-bold text-sm">上传对比样张视频</p>
                       </div>
                    ) : (
                       <div className="relative rounded-[24px] overflow-hidden bg-gray-900 shadow-xl">
                          <video src={video2Url} className="w-full aspect-video object-cover" />
                          <button 
                            onClick={() => { setVideo2(null); setVideo2Url('') }}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/20"
                          >
                             <RotateCcw className="w-4 h-4" />
                          </button>
                       </div>
                    )}
                 </div>
              </div>

              {/* 对齐动作 */}
              <AnimatePresence>
                {video1 && video2 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-4">
                    <button
                      onClick={handleSync}
                      className="w-full py-5 bg-[#1C1C1E] text-white rounded-[24px] font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <Music className="w-6 h-6 text-blue-500" />
                      立即启动智能对齐
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-500 text-xs font-bold">{error}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* 对齐核心算法状态 */}
          {step === 'syncing' && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-40 h-40 mb-10">
                 <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-100 animate-[spin_10s_linear_infinite]" />
                 <div className="absolute inset-4 rounded-full bg-blue-50 flex items-center justify-center">
                    <Activity className="w-12 h-12 text-blue-600 animate-pulse" />
                 </div>
                 {[0, 1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      className="absolute inset-0 border-2 border-blue-500 rounded-full"
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                    />
                 ))}
              </div>
              <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-2 text-center">AI 节拍对齐中...</h3>
              <p className="text-[var(--text-secondary)] text-sm font-bold opacity-40 text-center uppercase tracking-widest">
                Analyzing waveform • Computing Phase
              </p>
            </motion.div>
          )}

          {/* 预览对比视图 */}
          {step === 'preview' && syncResult && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] font-black text-sm tracking-tight">智能对齐成功</p>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40 uppercase">
                      Confidence {(syncResult.confidence * 100).toFixed(0)}% • Sync Offset {syncResult.offset.toFixed(2)}s
                    </p>
                  </div>
                </div>
                <button onClick={handleReset} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              {/* 微调控制面板 */}
              <AnimatePresence>
                {showDebug && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-[32px] p-6 shadow-xl border border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="font-black text-[var(--text-primary)] uppercase tracking-widest text-xs">Manual Sync Tuning</h4>
                       <span className="text-blue-600 font-mono font-black text-sm">
                          {manualOffset > 0 ? '+' : ''}{manualOffset.toFixed(2)}s
                       </span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.01"
                      value={manualOffset}
                      onChange={(e) => setManualOffset(parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-100 rounded-full appearance-none accent-blue-600 mb-8"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={handleReMerge} className="py-4 bg-[#1C1C1E] text-white rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all">
                        重制预览
                      </button>
                      <button onClick={() => setManualOffset(0)} className="py-4 bg-gray-50 text-[var(--text-secondary)] rounded-2xl font-bold text-sm active:scale-95 transition-all">
                        还原默认
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 核心预览播放器 */}
              {mergedVideoUrl && (
                <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-gray-100 p-2">
                  <div className="relative aspect-video bg-gray-900 rounded-[32px] overflow-hidden group">
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
                    {!isPlaying && (
                      <button onClick={togglePlay} className="absolute inset-0 bg-white/5 backdrop-blur-[2px] flex items-center justify-center transition-all group-hover:backdrop-blur-sm">
                        <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                           <Play className="w-8 h-8 text-blue-600 ml-1.5" />
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="p-6 flex items-center justify-between">
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 active:scale-90 transition-all"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>
                    
                    {onSyncComplete && (
                      <button
                        onClick={handleExtractFrame}
                        disabled={isExtracting}
                        className="px-8 py-4 bg-gray-50 hover:bg-blue-50 text-[var(--text-primary)] hover:text-blue-600 rounded-[24px] font-black text-sm transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        {isExtracting ? (
                          <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                        ) : <Camera className="w-5 h-5" />}
                        使用此对比点
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 贴士 */}
              <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-50">
                 <h4 className="text-blue-600 text-xs font-black uppercase tracking-widest mb-3">Training Insight</h4>
                 <p className="text-[var(--text-primary)] text-sm font-medium leading-relaxed opacity-60">
                   对齐后你可以清晰看到两者在节拍对应上的身体幅度。建议选择“大招”时刻进行提取分析。
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
