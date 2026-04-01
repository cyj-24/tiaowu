import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { AnalysisResult, Person } from '../types'
import ImagePreview from '../components/ImagePreview'
import PersonSelector from '../components/PersonSelector'
import VideoUploader from '../components/VideoUploader'
import VideoSyncPage from './VideoSyncPage'
import CalendarVideoSelector from '../components/CalendarVideoSelector'
import { detectPersons, analyzePoses, VideoSyncResult } from '../utils/api'
import { Image as ImageIcon, Video, Music, ChevronLeft, Sparkles, Calendar } from 'lucide-react'

// 功能模式
type Mode = 'home' | 'image' | 'video' | 'sync' | 'calendar'

interface UploadPageProps {
  onAnalysisComplete: (result: AnalysisResult, myImage: string, masterImage: string) => void
}

export default function UploadPage({ onAnalysisComplete }: UploadPageProps) {
  const [mode, setMode] = useState<Mode>('home')

  // 图片模式状态
  const [myImage, setMyImage] = useState<string | null>(null)
  const [masterImage, setMasterImage] = useState<string | null>(null)
  const [myPersons, setMyPersons] = useState<Person[]>([])
  const [masterPersons, setMasterPersons] = useState<Person[]>([])
  const [selectedMyPerson, setSelectedMyPerson] = useState<number | null>(null)
  const [selectedMasterPerson, setSelectedMasterPerson] = useState<number | null>(null)

  // 视频模式状态（使用 videoFrame 标记已选择）
  const [, setMyVideoFrame] = useState<string | null>(null)
  const [, setMasterVideoFrame] = useState<string | null>(null)

  // 通用状态
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 图片上传处理
  const onDropMy = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setMyImage(base64)
      setError(null)
      setIsLoading(true)
      try {
        const persons = await detectPersons(base64)
        setMyPersons(persons)
        if (persons.length > 0) setSelectedMyPerson(persons[0].id)
      } catch (err) {
        setError('检测失败')
      } finally {
        setIsLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const onDropMaster = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setMasterImage(base64)
      setError(null)
      setIsLoading(true)
      try {
        const persons = await detectPersons(base64)
        setMasterPersons(persons)
        if (persons.length > 0) setSelectedMasterPerson(persons[0].id)
      } catch (err) {
        setError('检测失败')
      } finally {
        setIsLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const myDropzone = useDropzone({ onDrop: onDropMy, accept: { 'image/*': ['.png', '.jpg', '.jpeg'] }, multiple: false })
  const masterDropzone = useDropzone({ onDrop: onDropMaster, accept: { 'image/*': ['.png', '.jpg', '.jpeg'] }, multiple: false })

  // 视频模式处理
  const handleMyFrameExtracted = async (imageBase64: string) => {
    setMyImage(imageBase64)
    setMyVideoFrame(imageBase64)
    setIsLoading(true)
    try {
      const persons = await detectPersons(imageBase64)
      setMyPersons(persons)
      if (persons.length > 0) setSelectedMyPerson(persons[0].id)
    } catch (err) {
      setError('检测失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMasterFrameExtracted = async (imageBase64: string) => {
    setMasterImage(imageBase64)
    setMasterVideoFrame(imageBase64)
    setIsLoading(true)
    try {
      const persons = await detectPersons(imageBase64)
      setMasterPersons(persons)
      if (persons.length > 0) setSelectedMasterPerson(persons[0].id)
    } catch (err) {
      setError('检测失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 视频对齐处理
  const handleVideoSyncComplete = (
    _result: VideoSyncResult,
    frame1: string,
    frame2: string,
    _video1: File,
    _video2: File
  ) => {
    // 对齐后，使用 frame1 作为我的图，frame2 作为对比图
    setMyImage(frame1)
    setMasterImage(frame2)
    setError(null)
    setIsLoading(true)
    Promise.all([detectPersons(frame1), detectPersons(frame2)])
      .then(([persons1, persons2]) => {
        setMyPersons(persons1)
        setMasterPersons(persons2)
        if (persons1.length > 0) setSelectedMyPerson(persons1[0].id)
        if (persons2.length > 0) setSelectedMasterPerson(persons2[0].id)
      })
      .catch(() => setError('同步后检测失败'))
      .finally(() => setIsLoading(false))
  }

  // 日历视频选择处理
  const handleCalendarFrameSelected = async (side: 'my' | 'master', frameBase64: string) => {
    setError(null)
    setIsLoading(true)
    try {
      const persons = await detectPersons(frameBase64)
      if (side === 'my') {
        setMyImage(frameBase64)
        setMyPersons(persons)
        if (persons.length > 0) setSelectedMyPerson(persons[0].id)
      } else {
        setMasterImage(frameBase64)
        setMasterPersons(persons)
        if (persons.length > 0) setSelectedMasterPerson(persons[0].id)
      }
    } catch (err) {
      setError('检测失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!myImage || !masterImage) return
    if (selectedMyPerson === null || selectedMasterPerson === null) {
      setError('请选择舞者')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await analyzePoses(myImage, masterImage, selectedMyPerson, selectedMasterPerson)
      onAnalysisComplete(result, myImage, masterImage)
    } catch (err) {
      setError('分析失败')
    } finally {
      setIsLoading(false)
    }
  }

  const canAnalyze = myImage && masterImage && selectedMyPerson !== null && selectedMasterPerson !== null && !isLoading

  // 返回首页
  const goHome = () => {
    setMode('home')
    // 重置状态
    setMyImage(null)
    setMasterImage(null)
    setMyVideoFrame(null)
    setMasterVideoFrame(null)
    setMyPersons([])
    setMasterPersons([])
    setSelectedMyPerson(null)
    setSelectedMasterPerson(null)
    setError(null)
  }

  // 渲染首页
  if (mode === 'home') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
        {/* 简洁的顶部 */}
        <header className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">摇摆舞分析</h1>
              <p className="text-white/50 text-xs">AI 辅助舞蹈姿态对比</p>
            </div>
          </div>
        </header>

        {/* 功能卡片 */}
        <div className="px-6 space-y-4 mt-4">
          {/* 图片对比 */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setMode('image')}
            className="w-full card card-hover card-active p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">图片对比</h3>
                <p className="text-white/50 text-sm">直接上传两张跳舞照片进行姿态对比</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-white/30 rotate-180" />
            </div>
          </motion.button>

          {/* 视频对比 */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setMode('video')}
            className="w-full card card-hover card-active p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Video className="w-7 h-7 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">视频截帧对比</h3>
                <p className="text-white/50 text-sm">上传两段视频，手动选择关键帧进行对比</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-white/30 rotate-180" />
            </div>
          </motion.button>

          {/* 视频对齐 */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setMode('sync')}
            className="w-full card card-hover card-active p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                <Music className="w-7 h-7 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">视频对齐</h3>
                <p className="text-white/50 text-sm">两段相同音乐的视频自动对齐节拍后分析</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-white/30 rotate-180" />
            </div>
          </motion.button>

          {/* 从日历选择 */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setMode('calendar')}
            className="w-full card card-hover card-active p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <Calendar className="w-7 h-7 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">从日历选择</h3>
                <p className="text-white/50 text-sm">从跳舞日历中选择已保存的视频进行分析</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-white/30 rotate-180" />
            </div>
          </motion.button>
        </div>

        {/* 使用说明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="px-6 mt-8"
        >
          <div className="card bg-white/5 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">💡 如何选择？</h3>
            <ul className="text-sm text-white/50 space-y-2">
              <li><span className="text-orange-400">图片对比</span> - 已有照片，直接分析</li>
              <li><span className="text-purple-400">视频截帧</span> - 从视频中自选关键帧</li>
              <li><span className="text-amber-400">视频对齐</span> - 同音乐视频自动对齐</li>
              <li><span className="text-green-400">从日历选择</span> - 使用日历中保存的视频</li>
            </ul>
          </div>
        </motion.div>
      </div>
    )
  }

  // 视频对齐模式直接渲染 VideoSyncPage
  if (mode === 'sync') {
    return (
      <VideoSyncPage
        onSyncComplete={handleVideoSyncComplete}
      />
    )
  }

  // 渲染各功能页面
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 顶部导航 */}
      <header className="navbar">
        <button onClick={goHome} className="navbar-back">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="navbar-title">
          {mode === 'image' && '图片对比'}
          {mode === 'video' && '视频截帧'}
          {mode === 'calendar' && '日历选择'}
        </h1>
        <div className="w-9" />
      </header>

      <div className="pt-[calc(var(--navbar-height)+var(--safe-top)+8px)] px-6">
        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="card bg-red-500/10 border-red-500/30 p-4">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 图片模式 */}
        {mode === 'image' && (
          <div className="space-y-4">
            {/* 我的图片 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xl">📸</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">我的舞姿</h3>
                    <p className="text-white/40 text-xs">上传你的跳舞照片</p>
                  </div>
                </div>
              </div>

              {!myImage ? (
                <div className="p-4">
                  <div {...myDropzone.getRootProps()} className={`upload-zone ${myDropzone.isDragActive ? 'drag-active' : ''}`}>
                    <input {...myDropzone.getInputProps()} />
                    <ImageIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-white font-medium text-sm">点击或拖拽上传</p>
                    <p className="text-white/40 text-xs">PNG, JPG</p>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <ImagePreview image={myImage} persons={myPersons} selectedPerson={selectedMyPerson} onImageTransform={handleMyFrameExtracted} />
                  {myPersons.length > 0 && (
                    <div className="mt-4">
                      <PersonSelector persons={myPersons} selected={selectedMyPerson} onSelect={setSelectedMyPerson} label="选择舞者" />
                    </div>
                  )}
                  <button onClick={() => { setMyImage(null); setMyPersons([]); setSelectedMyPerson(null) }} className="w-full mt-4 py-3 text-red-400 text-sm font-medium">
                    移除照片
                  </button>
                </div>
              )}
            </motion.div>

            {/* 对比图片 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <span className="text-xl">🌟</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">对比舞姿</h3>
                    <p className="text-white/40 text-xs">上传大师或参考照片</p>
                  </div>
                </div>
              </div>

              {!masterImage ? (
                <div className="p-4">
                  <div {...masterDropzone.getRootProps()} className={`upload-zone ${masterDropzone.isDragActive ? 'drag-active' : ''}`}>
                    <input {...masterDropzone.getInputProps()} />
                    <ImageIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-medium text-sm">点击或拖拽上传</p>
                    <p className="text-white/40 text-xs">PNG, JPG</p>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <ImagePreview image={masterImage} persons={masterPersons} selectedPerson={selectedMasterPerson} onImageTransform={handleMasterFrameExtracted} />
                  {masterPersons.length > 0 && (
                    <div className="mt-4">
                      <PersonSelector persons={masterPersons} selected={selectedMasterPerson} onSelect={setSelectedMasterPerson} label="选择舞者" />
                    </div>
                  )}
                  <button onClick={() => { setMasterImage(null); setMasterPersons([]); setSelectedMasterPerson(null) }} className="w-full mt-4 py-3 text-red-400 text-sm font-medium">
                    移除照片
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* 视频模式 */}
        {mode === 'video' && (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xl">🎬</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">我的视频</h3>
                    <p className="text-white/40 text-xs">选择关键帧进行分析</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <VideoUploader onFrameExtracted={handleMyFrameExtracted} label="" />
                {myImage && myPersons.length > 0 && (
                  <div className="mt-4">
                    <PersonSelector persons={myPersons} selected={selectedMyPerson} onSelect={setSelectedMyPerson} label="选择舞者" />
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <span className="text-xl">🌟</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">对比视频</h3>
                    <p className="text-white/40 text-xs">选择关键帧进行分析</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <VideoUploader onFrameExtracted={handleMasterFrameExtracted} label="" />
                {masterImage && masterPersons.length > 0 && (
                  <div className="mt-4">
                    <PersonSelector persons={masterPersons} selected={selectedMasterPerson} onSelect={setSelectedMasterPerson} label="选择舞者" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* 日历选择模式 */}
        {mode === 'calendar' && (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xl">📸</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">我的舞姿</h3>
                    <p className="text-white/40 text-xs">从日历选择视频并截取关键帧</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <CalendarVideoSelector onFrameSelected={(frame) => handleCalendarFrameSelected('my', frame)} />
                {myImage && myPersons.length > 0 && (
                  <div className="mt-4">
                    <ImagePreview image={myImage} persons={myPersons} selectedPerson={selectedMyPerson} />
                    <div className="mt-4">
                      <PersonSelector persons={myPersons} selected={selectedMyPerson} onSelect={setSelectedMyPerson} label="选择舞者" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <span className="text-xl">🌟</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">对比舞姿</h3>
                    <p className="text-white/40 text-xs">从日历选择视频并截取关键帧</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <CalendarVideoSelector onFrameSelected={(frame) => handleCalendarFrameSelected('master', frame)} />
                {masterImage && masterPersons.length > 0 && (
                  <div className="mt-4">
                    <ImagePreview image={masterImage} persons={masterPersons} selectedPerson={selectedMasterPerson} />
                    <div className="mt-4">
                      <PersonSelector persons={masterPersons} selected={selectedMasterPerson} onSelect={setSelectedMasterPerson} label="选择舞者" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* 分析按钮 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pt-6">
          <button onClick={handleAnalyze} disabled={!canAnalyze || isLoading} className={`btn btn-primary btn-lg btn-block ${canAnalyze ? 'animate-pulse-glow' : ''}`}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                分析中...
              </span>
            ) : (
              '开始分析'
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
