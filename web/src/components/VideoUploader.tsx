import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  RotateCw, 
  RotateCcw, 
  FlipHorizontal, 
  FlipVertical, 
  RefreshCcw, 
  Play, 
  Pause, 
  Scissors,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoUploaderProps {
  onFrameExtracted: (imageBase64: string) => void
  label: string
}

export default function VideoUploader({ onFrameExtracted, label }: VideoUploaderProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>('')
  const [keyframes, setKeyframes] = useState<{timestamp: number, image: string}[]>([])
  const [isPlaying, setIsPlaying] = useState(false)

  // 视频变换状态
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [showTransform, setShowTransform] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('请上传视频文件')
      return
    }

    setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setPreviewImage('')
    setKeyframes([])
    resetTransform()
    setShowTransform(false)

    try {
      const formData = new FormData()
      formData.append('video', file)
      formData.append('num_frames', '5')

      const response = await fetch(`${API_BASE_URL}/api/extract-keyframes`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setKeyframes(data.keyframes)
        }
      }
    } catch (e) {
      console.error('提取关键帧失败:', e)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    multiple: false
  })

  // 同步应用变换到图片
  const applyTransformToImage = (
    imageBase64: string,
    rot: number,
    fh: boolean,
    fv: boolean
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        if (rot === 90 || rot === 270) {
          canvas.width = img.height
          canvas.height = img.width
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rot * Math.PI) / 180)
        ctx.scale(fh ? -1 : 1, fv ? -1 : 1)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()
        resolve(canvas.toDataURL('image/jpeg', 0.95))
      }
      img.src = imageBase64
    })
  }

  const extractCurrentFrame = async () => {
    if (!videoFile || !videoRef.current) return
    setIsExtracting(true)
    try {
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('timestamp', currentTime.toString())

      const response = await fetch(`${API_BASE_URL}/api/extract-frame`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('提取帧失败')
      const data = await response.json()
      if (!data.success) throw new Error(data.detail || '提取帧失败')

      let finalImage = data.image
      if (rotation !== 0 || flipH || flipV) {
        finalImage = await applyTransformToImage(data.image, rotation, flipH, flipV)
      }
      setPreviewImage(finalImage)
      onFrameExtracted(finalImage)
    } catch (e) {
      console.error('提取帧失败:', e)
      alert('提取帧失败，请重试')
    } finally {
      setIsExtracting(false)
    }
  }

  const selectKeyframe = (frame: {timestamp: number, image: string}) => {
    setCurrentTime(frame.timestamp)
    if (videoRef.current) {
      videoRef.current.currentTime = frame.timestamp
    }
    setPreviewImage(frame.image)
    onFrameExtracted(frame.image)
  }

  const resetTransform = () => {
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!videoFile) {
    return (
      <div
        {...getRootProps()}
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-[32px] p-10
          transition-all duration-300
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-center">
          <div className={`
            w-16 h-16 rounded-3xl flex items-center justify-center mb-6
            shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-transform duration-300 group-hover:scale-110
            ${isDragActive ? 'bg-blue-500 text-white' : 'bg-white text-gray-400'}
          `}>
            <Upload className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-1">{label}</h3>
          <p className="text-gray-400 text-sm font-medium">点击或将视频文件拖拽至此</p>
          <div className="mt-6 flex items-center gap-3">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">MP4</span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">MOV</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 视频工作台 */}
      <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100/50">
        {/* 透明变换容器 */}
        <div className="relative bg-gray-50 group aspect-video flex items-center justify-center overflow-hidden">
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-500"
            style={{
              transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>

          {/* 视频浮动控制 */}
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/20 to-transparent flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                if (videoRef.current) {
                  isPlaying ? videoRef.current.pause() : videoRef.current.play()
                }
              }}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current pl-0.5" />}
            </button>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full relative overflow-hidden backdrop-blur-sm">
              <div 
                className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-black text-white/90 tabular-nums">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>

        {/* 交互控制区域 */}
        <div className="p-6 space-y-6">
          {/* 变换工具栏切换 */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">播放进度控制</span>
              <button 
                onClick={() => setShowTransform(!showTransform)}
                className="flex items-center gap-1.5 text-[11px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                角度与翻转 {showTransform ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const time = parseFloat(e.target.value)
                setCurrentTime(time)
                if (videoRef.current) videoRef.current.currentTime = time
              }}
              className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-gray-900"
            />

            <AnimatePresence>
              {showTransform && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-5 gap-2 pt-2 pb-1">
                    {[
                      { icon: RotateCcw, action: () => setRotation((r) => (r - 90 + 360) % 360), label: '左转' },
                      { icon: RotateCw, action: () => setRotation((r) => (r + 90) % 360), label: '右转' },
                      { icon: FlipHorizontal, action: () => setFlipH(!flipH), active: flipH, label: '水平' },
                      { icon: FlipVertical, action: () => setFlipV(!flipV), active: flipV, label: '垂直' },
                      { icon: RefreshCcw, action: resetTransform, label: '重置' }
                    ].map((tool, i) => (
                      <button
                        key={i}
                        onClick={tool.action}
                        className={`
                          flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all
                          ${tool.active 
                            ? 'bg-blue-50 border-blue-200 text-blue-600' 
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                          }
                        `}
                      >
                        <tool.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 推荐关键帧 */}
          {keyframes.length > 0 && (
            <div className="space-y-3">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">AI 推荐关键帧</span>
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                {keyframes.map((frame, index) => {
                  const isActive = Math.abs(currentTime - frame.timestamp) < 0.5
                  return (
                    <button
                      key={index}
                      onClick={() => selectKeyframe(frame)}
                      className={`
                        flex-shrink-0 group relative w-28 aspect-video rounded-xl overflow-hidden border-2 transition-all
                        ${isActive ? 'border-blue-500 scale-95 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}
                      `}
                    >
                      <img src={frame.image} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white backdrop-blur-sm">
                        {formatTime(frame.timestamp)}
                      </span>
                      {isActive && (
                        <div className="absolute top-1 left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm scale-75">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 提取操作按钮 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={extractCurrentFrame}
              disabled={isExtracting}
              className={`
                w-full py-4 rounded-2xl font-black text-[15px] transition-all flex items-center justify-center gap-3 shadow-xl
                ${isExtracting 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-900 text-white shadow-gray-200 hover:scale-[1.02] active:scale-[0.98]'
                }
              `}
            >
              {isExtracting ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>正在精准定位舞蹈动作...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5" />
                  <span>锁定该舞姿进行分析</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setVideoFile(null)
                setVideoUrl('')
                setPreviewImage('')
                setKeyframes([])
                resetTransform()
                setShowTransform(false)
              }}
              className="w-full py-3 text-sm font-black text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors tracking-tight"
            >
              重新上传练习视频
            </button>
          </div>
        </div>
      </div>

      {/* 选定帧预览卡片 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50/50 rounded-[28px] p-5 border border-emerald-100/50 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[12px] font-black text-emerald-700 tracking-tight">已锁定目标动作，准备开始分析</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-emerald-200/30">
              <img src={previewImage} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
