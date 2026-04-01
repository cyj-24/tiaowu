import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { syncVideos, mergeVideos, VideoSyncResult } from '../utils/api'
import { Upload, Music, Check, AlertCircle, ArrowRight, Activity } from 'lucide-react'
import VideoSyncPlayer from './VideoSyncPlayer'
import SyncDebugPanel from './SyncDebugPanel'

interface VideoSyncUploaderProps {
  onSyncComplete: (result: VideoSyncResult, frame1: string, frame2: string, video1: File, video2: File) => void
}

export default function VideoSyncUploader({ onSyncComplete }: VideoSyncUploaderProps) {
  const [video1, setVideo1] = useState<File | null>(null)
  const [video2, setVideo2] = useState<File | null>(null)
  const [video1Url, setVideo1Url] = useState<string>('')
  const [video2Url, setVideo2Url] = useState<string>('')
  const [, setIsSyncing] = useState(false)
  const [, setIsMerging] = useState(false)
  const [syncResult, setSyncResult] = useState<VideoSyncResult | null>(null)
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'syncing' | 'merging' | 'player'>('upload')
  const [showDebug, setShowDebug] = useState(false)
  const [manualAdjust, setManualAdjust] = useState(0)

  const onDropVideo1 = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setVideo1(file)
    setVideo1Url(URL.createObjectURL(file))
    setSyncResult(null)
    setMergedVideoUrl(null)
    setError(null)
    setStep('upload')
  }, [])

  const onDropVideo2 = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setVideo2(file)
    setVideo2Url(URL.createObjectURL(file))
    setSyncResult(null)
    setMergedVideoUrl(null)
    setError(null)
    setStep('upload')
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

  const handleSync = async () => {
    if (!video1 || !video2) return

    setIsSyncing(true)
    setError(null)
    setStep('syncing')

    try {
      const result = await syncVideos(video1, video2)
      setSyncResult(result)

      if (result.success) {
        // 同步成功，开始合并视频
        setStep('merging')
        setIsMerging(true)

        try {
          const mergedBlob = await mergeVideos(video1, video2, result.offset)
          const mergedUrl = URL.createObjectURL(mergedBlob)
          setMergedVideoUrl(mergedUrl)
          setStep('player')
        } catch (mergeErr: any) {
          setError(mergeErr.message || '视频合并失败')
          setStep('upload')
        } finally {
          setIsMerging(false)
        }
      } else {
        setStep('upload')
        setError(result.message)
      }
    } catch (err: any) {
      setStep('upload')
      setError(err.message || '同步失败')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFrameSelect = (frame1: string, frame2: string, _time1: number, _time2: number) => {
    if (syncResult && video1 && video2) {
      onSyncComplete(syncResult, frame1, frame2, video1, video2)
    }
  }

  const handleManualAdjust = async (adjustment: number) => {
    if (!video1 || !video2 || !syncResult) return

    setIsMerging(true)
    setError(null)
    setManualAdjust(adjustment)

    try {
      const newOffset = syncResult.offset + adjustment
      const mergedBlob = await mergeVideos(video1, video2, newOffset)
      const mergedUrl = URL.createObjectURL(mergedBlob)

      // 释放旧URL
      if (mergedVideoUrl) {
        URL.revokeObjectURL(mergedVideoUrl)
      }

      setMergedVideoUrl(mergedUrl)
    } catch (mergeErr: any) {
      setError(mergeErr.message || '重新合并视频失败')
    } finally {
      setIsMerging(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setSyncResult(null)
    setMergedVideoUrl(null)
    setError(null)
    if (mergedVideoUrl) {
      URL.revokeObjectURL(mergedVideoUrl)
    }
  }

  return (
    <div className="space-y-4">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {['上传', '对齐', '播放'].map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              index === 0 || (index === 1 && step !== 'upload') || (index === 2 && (step === 'player' || step === 'merging'))
                ? 'bg-gradient-to-r from-orange-500 to-purple-500 text-white'
                : 'bg-white/10 text-white/40'
            }`}>
              {index < 2 ? index + 1 : <Check className="w-4 h-4" />}
            </div>
            <span className={`text-xs ${
              index <= (step === 'player' ? 2 : step === 'syncing' || step === 'merging' ? 1 : 0)
                ? 'text-white'
                : 'text-white/40'
            }`}>
              {label}
            </span>
            {index < 2 && <div className="w-8 h-px bg-white/20 mx-2" />}
          </div>
        ))}
      </div>

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
            {/* 视频1 */}
            <div className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xl">🎬</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">我的视频</h3>
                    <p className="text-white/40 text-xs">跳同一支舞的视频</p>
                  </div>
                </div>
              </div>

              {!video1 ? (
                <div className="p-4">
                  <div
                    {...dropzone1.getRootProps()}
                    className={`upload-zone ${dropzone1.isDragActive ? 'drag-active' : ''}`}
                  >
                    <input {...dropzone1.getInputProps()} />
                    <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-white font-medium text-sm">点击或拖拽上传</p>
                    <p className="text-white/40 text-xs">MP4, MOV</p>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <video
                      src={video1Url}
                      className="w-full h-40 object-cover"
                      controls
                    />
                    <button
                      onClick={() => { setVideo1(null); setVideo1Url(''); setSyncResult(null) }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  {video1 && (
                    <p className="text-white/50 text-xs mt-2 text-center">
                      {video1.name} · {(video1.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 视频2 */}
            <div className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <span className="text-xl">🌟</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">对比视频</h3>
                    <p className="text-white/40 text-xs">大师或参考视频</p>
                  </div>
                </div>
              </div>

              {!video2 ? (
                <div className="p-4">
                  <div
                    {...dropzone2.getRootProps()}
                    className={`upload-zone ${dropzone2.isDragActive ? 'drag-active' : ''}`}
                  >
                    <input {...dropzone2.getInputProps()} />
                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-medium text-sm">点击或拖拽上传</p>
                    <p className="text-white/40 text-xs">MP4, MOV</p>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <video
                      src={video2Url}
                      className="w-full h-40 object-cover"
                      controls
                    />
                    <button
                      onClick={() => { setVideo2(null); setVideo2Url(''); setSyncResult(null) }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  {video2 && (
                    <p className="text-white/50 text-xs mt-2 text-center">
                      {video2.name} · {(video2.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 对齐按钮 */}
            {video1 && video2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  onClick={handleSync}
                  className="btn btn-primary btn-lg btn-block animate-pulse-glow"
                >
                  <Music className="w-5 h-5" />
                  开始音乐对齐
                </button>
                <p className="text-center text-white/40 text-xs mt-3">
                  系统会通过音频指纹识别两段视频的时间偏移
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* 同步中状态 */}
        {step === 'syncing' && (
          <motion.div
            key="syncing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-8 text-center"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Music className="w-8 h-8 text-orange-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">正在分析音频...</h3>
            <p className="text-white/50 text-sm">
              提取音频指纹 · 检测节拍 · 计算偏移
            </p>
          </motion.div>
        )}

        {/* 合并中状态 */}
        {step === 'merging' && (
          <motion.div
            key="merging"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-8 text-center"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-white/10" />
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">正在合并视频...</h3>
            <p className="text-white/50 text-sm">
              对齐时间轴 · 拼接并排视频 · 生成预览
            </p>
          </motion.div>
        )}

        {/* 播放器步骤 */}
        {step === 'player' && mergedVideoUrl && syncResult && video1 && video2 && (
          <motion.div
            key="player"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* 调试按钮 */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showDebug
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Activity className="w-4 h-4" />
                {showDebug ? '关闭调试' : '音频相位调试'}
              </button>
              {manualAdjust !== 0 && (
                <span className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm">
                  手动调整: {manualAdjust > 0 ? '+' : ''}{manualAdjust.toFixed(2)}s
                </span>
              )}
            </div>

            {/* 调试面板 */}
            <AnimatePresence>
              {showDebug && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <SyncDebugPanel
                    video1={video1}
                    video2={video2}
                    offset={syncResult.offset}
                    confidence={syncResult.confidence}
                    onClose={() => setShowDebug(false)}
                    onAdjustOffset={handleManualAdjust}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <VideoSyncPlayer
              mergedVideoUrl={mergedVideoUrl}
              video1={video1}
              video2={video2}
              syncResult={syncResult}
              onFrameSelect={handleFrameSelect}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 同步结果提示（仅显示错误） */}
      {syncResult && !syncResult.success && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 bg-red-500/5 border-red-500/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-red-400">对齐失败</h3>
              <p className="text-white/50 text-xs">{syncResult.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 错误提示 */}
      {error && !syncResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card bg-red-500/10 border-red-500/30 p-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* 使用说明 */}
      {step === 'upload' && (
        <div className="card bg-white/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-orange-400">💡</span> 视频对齐说明
          </h3>
          <ul className="text-sm text-white/50 space-y-2">
            <li>1. 上传两段跳同一支舞的视频</li>
            <li>2. 系统通过音乐指纹自动对齐节拍</li>
            <li>3. 播放合并后的并排视频</li>
            <li>4. 在任意时刻选择帧进行姿态对比</li>
          </ul>
        </div>
      )}
    </div>
  )
}
