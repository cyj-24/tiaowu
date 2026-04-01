import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

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
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [showTransform, setShowTransform] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'

  // 视频上传
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith('video/')) {
      alert('请上传视频文件')
      return
    }

    setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setPreviewImage('')
    setKeyframes([])
    // 重置变换状态
    resetTransform()
    setShowTransform(false)

    // 获取视频信息并提取关键帧
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

  // 视频时间更新
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  // 视频加载完成
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      // 设置到2秒位置（避开开头）
      videoRef.current.currentTime = 2
    }
  }

  // 时间轴拖动
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  // 提取当前帧（应用变换）
  const extractCurrentFrame = async () => {
    if (!videoFile || !videoRef.current) return

    setIsExtracting(true)
    try {
      // 先提取原始帧
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('timestamp', currentTime.toString())

      const response = await fetch(`${API_BASE_URL}/api/extract-frame`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('提取帧失败')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.detail || '提取帧失败')
      }

      // 如果有变换，在前端应用
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

  // 使用Canvas应用变换到图片
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

        // 根据旋转角度设置画布尺寸
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

  // 选择推荐的关键帧
  const selectKeyframe = (frame: {timestamp: number, image: string}) => {
    setCurrentTime(frame.timestamp)
    if (videoRef.current) {
      videoRef.current.currentTime = frame.timestamp
    }
    setPreviewImage(frame.image)
    onFrameExtracted(frame.image)
  }

  // 格式化时间
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // 视频变换控制
  const rotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360)
  const rotateRight = () => setRotation((prev) => (prev + 90) % 360)
  const toggleFlipH = () => setFlipH((prev) => !prev)
  const toggleFlipV = () => setFlipV((prev) => !prev)
  const resetTransform = () => {
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
  }

  if (!videoFile) {
    return (
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-900 font-medium text-sm">{label}</p>
        <p className="text-gray-400 text-xs mt-1">点击或拖拽上传视频</p>
        <p className="text-gray-400 text-xs">支持 MP4, MOV</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 视频播放器 - 包装在变换容器中，但控制条不受影响 */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <div
          className="w-full max-h-64 flex items-center justify-center transition-transform"
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            transformOrigin: 'center center'
          }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-64"
            style={{ touchAction: 'pan-y' }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
        {/* 自定义播放控制条 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                  } else {
                    videoRef.current.play();
                  }
                  setIsPlaying(!isPlaying);
                }
              }}
              className="text-white hover:text-purple-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                {isPlaying ? (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                ) : (
                  <path d="M8 5v14l11-7z"/>
                )}
              </svg>
            </button>
            <span className="text-white text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* 变换控制开关 */}
      <button
        onClick={() => setShowTransform(!showTransform)}
        className="w-full py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
      >
        {showTransform ? '隐藏角度调整' : '调整视频角度 / 翻转'}
      </button>

      {/* 变换控制面板 */}
      {showTransform && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {/* 左旋转 */}
            <button
              onClick={rotateLeft}
              className="flex items-center gap-1 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              左转
            </button>

            {/* 右旋转 */}
            <button
              onClick={rotateRight}
              className="flex items-center gap-1 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
              右转
            </button>

            {/* 水平翻转 */}
            <button
              onClick={toggleFlipH}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border ${
                flipH ? 'bg-purple-100 text-purple-600 border-purple-300' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              左右
            </button>

            {/* 垂直翻转 */}
            <button
              onClick={toggleFlipV}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border ${
                flipV ? 'bg-purple-100 text-purple-600 border-purple-300' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              上下
            </button>

            {/* 重置 */}
            <button
              onClick={resetTransform}
              className="flex items-center gap-1 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重置
            </button>
          </div>

          {/* 当前状态 */}
          <div className="text-center text-xs text-gray-500">
            旋转: {rotation}° | 左右: {flipH ? '翻转' : '正常'} | 上下: {flipV ? '翻转' : '正常'}
          </div>

          <div className="text-xs text-orange-500 text-center">
            💡 调整后会实时预览，提取帧时会应用这些变换
          </div>
        </div>
      )}

      {/* 时间轴控制 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full ios-slider"
        />
      </div>

      {/* 推荐关键帧 */}
      {keyframes.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">推荐关键帧（点击选择）：</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {keyframes.map((frame, index) => (
              <button
                key={index}
                onClick={() => selectKeyframe(frame)}
                className={`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${
                  Math.abs(currentTime - frame.timestamp) < 0.5
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={frame.image}
                  alt={`关键帧 ${index + 1}`}
                  className="w-24 h-16 object-cover"
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                  {formatTime(frame.timestamp)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 提取按钮 */}
      <button
        onClick={extractCurrentFrame}
        disabled={isExtracting}
        className="w-full ios-button ios-button-secondary"
      >
        {isExtracting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            提取中...
          </span>
        ) : (
          '使用当前帧'
        )}
      </button>

      {/* 预览 */}
      {previewImage && (
        <div className="border rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-2">已选择：</p>
          <img
            src={previewImage}
            alt="选中的帧"
            className="w-full rounded-lg"
          />
        </div>
      )}

      {/* 重新上传 */}
      <button
        onClick={() => {
          setVideoFile(null)
          setVideoUrl('')
          setPreviewImage('')
          setKeyframes([])
          resetTransform()
          setShowTransform(false)
        }}
        className="w-full py-2 text-red-500 text-sm font-medium"
      >
        重新上传视频
      </button>

      {/* 隐藏的画布用于提取帧 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
