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

    try {
      const newOffset = syncResult.offset + adjustment
      const mergedBlob = await mergeVideos(video1, video2, newOffset)
      const mergedUrl = URL.createObjectURL(mergedBlob)

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

  const steps = [
    { label: '准备素材', status: 'upload' },
    { label: 'AI 对齐', status: 'syncing' },
    { label: '深度对比', status: 'player' }
  ]



  return (
    <div className="space-y-6">
      {/* 极简步骤条 */}
      <div className="flex items-center justify-between px-4 mb-4">
        {steps.map((s, index) => {
          const isActive = step === s.status || (step === 'merging' && index === 1) || (step === 'player' && index === 2)
          return (
            <div key={index} className="flex flex-col items-center gap-2 relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 border ${
                isActive 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200 scale-110' 
                  : 'bg-white text-gray-300 border-gray-100'
              }`}>
                {index + 1}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-gray-900' : 'text-gray-300'}`}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* 视频上传对 - 1 */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100/50">
              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-900">我的实时练习</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Your Performance</p>
                  </div>
                </div>
                {video1 && (
                  <button onClick={() => { setVideo1(null); setVideo1Url(''); }} className="text-rose-500 text-[10px] font-black uppercase tracking-widest p-2 hover:bg-rose-50 rounded-lg transition-colors">
                    重新选择
                  </button>
                )}
              </div>

              {!video1 ? (
                <div
                  {...dropzone1.getRootProps()}
                  className={`
                    border-2 border-dashed rounded-2xl p-12 transition-all text-center
                    ${dropzone1.isDragActive ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/30'}
                  `}
                >
                  <input {...dropzone1.getInputProps()} />
                  <Upload className="w-7 h-7 text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">DRAG VIDEO HERE</p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-50 border border-gray-100 shadow-inner">
                  <video src={video1Url} className="w-full h-full object-contain" />
                </div>
              )}
            </div>

            {/* 视频上传对 - 2 */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100/50">
              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-900">大师参考视频</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Master Reference</p>
                  </div>
                </div>
                {video2 && (
                  <button onClick={() => { setVideo2(null); setVideo2Url(''); }} className="text-rose-500 text-[10px] font-black uppercase tracking-widest p-2 hover:bg-rose-50 rounded-lg transition-colors">
                    重新选择
                  </button>
                )}
              </div>

              {!video2 ? (
                <div
                  {...dropzone2.getRootProps()}
                  className={`
                    border-2 border-dashed rounded-2xl p-12 transition-all text-center
                    ${dropzone2.isDragActive ? 'border-purple-500 bg-purple-50/50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/30'}
                  `}
                >
                  <input {...dropzone2.getInputProps()} />
                  <Upload className="w-7 h-7 text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">DRAG REFERENCE HERE</p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-50 border border-gray-100 shadow-inner">
                  <video src={video2Url} className="w-full h-full object-contain" />
                </div>
              )}
            </div>

            {/* AI 开始按钮 */}
            {video1 && video2 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleSync}
                className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-[15px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center justify-center gap-3 group transition-all active:scale-95"
              >
                <span>准备开始 AI 节拍对齐</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            )}
            
            <div className="bg-gray-50 rounded-[28px] p-5 border border-gray-100/50">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                对齐原理说明
              </h4>
              <p className="text-[12px] leading-relaxed text-gray-500 font-medium italic">
                AI 会提取两段视频的音频指纹，根据音乐节拍自动精准对齐，消除手动寻找同步点的烦恼。
              </p>
            </div>
          </motion.div>
        )}

        {/* 处理中状态 */}
        {(step === 'syncing' || step === 'merging') && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-12 text-center shadow-2xl shadow-gray-100 border border-gray-50 flex flex-col items-center"
          >
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 border-4 border-gray-50 rounded-full" />
              <div className={`absolute inset-0 border-4 rounded-full animate-spin ${step === 'syncing' ? 'border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent' : 'border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent'}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                {step === 'syncing' ? <Music className="w-10 h-10 text-blue-500 animate-pulse" /> : <ArrowRight className="w-10 h-10 text-emerald-500" />}
              </div>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              {step === 'syncing' ? '正在匹配音频指纹' : '正在合成并排预览'}
            </h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              {step === 'syncing' ? 'Analyzing Audio Beats...' : 'Generating Side-by-Side View...'}
            </p>
          </motion.div>
        )}

        {/* 播放器步骤 */}
        {step === 'player' && mergedVideoUrl && syncResult && video1 && video2 && (
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                  <Check className="w-5 h-5" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-[17px] font-black text-gray-900">AI 对齐已就绪</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence: {Math.round(syncResult.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  showDebug ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {showDebug ? '隐藏调试区' : '手动调整对齐'}
              </button>
            </div>

            <AnimatePresence>
              {showDebug && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
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

      {/* 错误模块 */}
      {(error || (syncResult && !syncResult.success)) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-100 p-5 rounded-[28px] flex items-start gap-4"
        >
          <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-rose-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-black text-rose-600 mb-1">对齐流程中断</h4>
            <p className="text-[12px] font-medium text-rose-500 leading-tight">
              {error || syncResult?.message}
            </p>
            <button onClick={handleReset} className="mt-3 text-[10px] font-black text-rose-600 uppercase tracking-widest border-b-2 border-rose-200">
              重置并尝试手动上传
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
