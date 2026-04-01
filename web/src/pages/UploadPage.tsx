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
        {/* 顶部 - 复古报刊风格 */}
        <header className="px-6 pt-12 pb-8">
          <div className="flex items-center justify-center text-center">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-px bg-[var(--text-primary)] opacity-20"></div>
                <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                <div className="w-8 h-px bg-[var(--text-primary)] opacity-20"></div>
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)] uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                摇摆舞分析器
              </h1>
              <p className="text-[var(--text-secondary)] text-sm font-medium tracking-[0.2em] uppercase opacity-80">
                Swing Dance · AI Motion Study
              </p>
              <div className="w-full h-1 border-y border-[var(--border-color)] mt-4"></div>
            </div>
          </div>
        </header>

        {/* 功能卡片 - 复古拼色风格 */}
        <div className="px-6 space-y-5">
          {[
            { id: 'image', icon: ImageIcon, title: '图片对比', desc: '上传照片进行两两姿态对比', color: 'var(--v-red)', light: 'var(--v-red-light)' },
            { id: 'video', icon: Video, title: '视频截帧', desc: '从视频中精准提取关键帧', color: 'var(--v-green)', light: 'var(--v-green-light)' },
            { id: 'sync', icon: Music, title: '自动对齐', desc: '同音乐视频自动对齐节拍', color: 'var(--v-gold)', light: 'var(--v-gold-light)' },
            { id: 'calendar', icon: Calendar, title: '成长日记', desc: '追溯历史训练中的舞韵变化', color: 'var(--v-blue)', light: 'var(--v-blue-light)' }
          ].map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => setMode(item.id as Mode)}
              className="w-full bg-[var(--bg-secondary)] rounded-2xl p-5 text-left shadow-[var(--shadow-sm)] border-2 hover:border-[var(--primary)] transition-all active:scale-[0.98] relative overflow-hidden group"
              style={{ borderColor: item.color }}
            >
              {/* 背景斜纹装饰 */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ background: `repeating-linear-gradient(45deg, ${item.color}, ${item.color} 10px, transparent 10px, transparent 20px)` }}></div>
              
              <div className="flex items-center gap-5 relative z-10">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center border border-[var(--border-color)] group-hover:bg-[var(--text-primary)] transition-colors"
                  style={{ backgroundColor: item.light, color: item.color }}
                >
                  <item.icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-0.5" style={{ fontFamily: 'var(--font-display)', color: item.color }}>{item.title}</h3>
                  <p className="text-[var(--text-secondary)] text-xs font-medium opacity-70">{item.desc}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-color)]">
                  <ChevronLeft className="w-4 h-4 text-[var(--text-primary)] rotate-180" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* 使用提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-6 mt-8"
        >
          <div className="bg-[var(--bg-tertiary)] rounded-2xl p-5 border border-[var(--border-color)] relative">
            <div className="absolute -top-3 left-6 px-3 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[10px] font-bold uppercase tracking-widest rounded-sm">
              Study Tips
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 font-bold uppercase">Archive</p>
                <p className="text-xs font-bold text-[var(--text-primary)]">图片对比更精准</p>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 font-bold uppercase">Rhythm</p>
                <p className="text-xs font-bold text-[var(--text-primary)]">节拍同步一致性</p>
              </div>
            </div>
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
        <button onClick={goHome} className="navbar-back flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
        <h1 className="navbar-title text-[var(--text-primary)] font-bold">
          {mode === 'image' && '图片对比'}
          {mode === 'video' && '视频截帧'}
          {mode === 'calendar' && '日历选择'}
        </h1>
        <div className="w-10" />
      </header>

      <div className="pt-[calc(var(--navbar-height)+var(--safe-top)+16px)] px-6 space-y-6">
        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="bg-red-50 border border-red-100 rounded-[20px] p-4 mb-4">
                <p className="text-red-500 text-xs font-medium text-center">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 图片模式 */}
        {mode === 'image' && (
          <div className="space-y-6">
            {/* 我的图片 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50">
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">我的舞姿</h3>
                    <p className="text-[var(--text-secondary)] text-[10px] uppercase font-bold tracking-wider opacity-60">Your Performance</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {!myImage ? (
                  <div {...myDropzone.getRootProps()} className={`upload-zone border-2 border-dashed rounded-[24px] py-10 transition-all ${myDropzone.isDragActive ? 'border-[#007AFF] bg-blue-50/50' : 'border-gray-100 bg-gray-50/30'}`}>
                    <input {...myDropzone.getInputProps()} />
                    <ImageIcon className="w-8 h-8 text-[#007AFF] mx-auto mb-2 opacity-50" />
                    <p className="text-[var(--text-primary)] font-bold text-sm">上传你的照片</p>
                    <p className="text-[var(--text-secondary)] text-[10px]">PNG, JPG up to 10MB</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ImagePreview image={myImage} persons={myPersons} selectedPerson={selectedMyPerson} onImageTransform={handleMyFrameExtracted} />
                    {myPersons.length > 0 && <PersonSelector persons={myPersons} selected={selectedMyPerson} onSelect={setSelectedMyPerson} label="识别结果" />}
                    <button onClick={() => { setMyImage(null); setMyPersons([]); setSelectedMyPerson(null) }} className="w-full py-3 text-red-500 text-xs font-bold bg-red-50 rounded-2xl">
                      重选照片
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* 对比图片 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50">
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">参考舞姿</h3>
                    <p className="text-[var(--text-secondary)] text-[10px] uppercase font-bold tracking-wider opacity-60">Master Reference</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {!masterImage ? (
                  <div {...masterDropzone.getRootProps()} className={`upload-zone border-2 border-dashed rounded-[24px] py-10 transition-all ${masterDropzone.isDragActive ? 'border-[#8B5CF6] bg-purple-50/50' : 'border-gray-100 bg-gray-50/30'}`}>
                    <input {...masterDropzone.getInputProps()} />
                    <ImageIcon className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-50" />
                    <p className="text-[var(--text-primary)] font-bold text-sm">上传参考样张</p>
                    <p className="text-[var(--text-secondary)] text-[10px]">PNG, JPG up to 10MB</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ImagePreview image={masterImage} persons={masterPersons} selectedPerson={selectedMasterPerson} onImageTransform={handleMasterFrameExtracted} />
                    {masterPersons.length > 0 && <PersonSelector persons={masterPersons} selected={selectedMasterPerson} onSelect={setSelectedMasterPerson} label="识别结果" />}
                    <button onClick={() => { setMasterImage(null); setMasterPersons([]); setSelectedMasterPerson(null) }} className="w-full py-3 text-red-500 text-xs font-bold bg-red-50 rounded-2xl">
                      重选照片
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* 视频模式 */}
        {mode === 'video' && (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50">
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">我的视频</h3>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <VideoUploader onFrameExtracted={handleMyFrameExtracted} label="" />
                {myImage && myPersons.length > 0 && (
                  <div className="mt-6">
                    <PersonSelector persons={myPersons} selected={selectedMyPerson} onSelect={setSelectedMyPerson} label="识别舞者" />
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50">
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">参考视频</h3>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <VideoUploader onFrameExtracted={handleMasterFrameExtracted} label="" />
                {masterImage && masterPersons.length > 0 && (
                  <div className="mt-6">
                    <PersonSelector persons={masterPersons} selected={selectedMasterPerson} onSelect={setSelectedMasterPerson} label="识别舞者" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* 日历模式 */}
        {mode === 'calendar' && (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-50">
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)]">我的日历视频</h3>
                </div>
              </div>
              <div className="p-5">
                <CalendarVideoSelector onFrameSelected={(frame) => handleCalendarFrameSelected('my', frame)} />
                {myImage && myPersons.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <ImagePreview image={myImage} persons={myPersons} selectedPerson={selectedMyPerson} />
                    <PersonSelector persons={myPersons} selected={selectedMyPerson} onSelect={setSelectedMyPerson} label="识别结果" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* 分析按钮 */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="pt-6 pb-12"
        >
          <button 
            onClick={handleAnalyze} 
            disabled={!canAnalyze || isLoading} 
            className={`
              w-full py-5 rounded-[24px] text-lg font-bold transition-all duration-300
              flex items-center justify-center gap-3 shadow-lg
              ${canAnalyze && !isLoading
                ? 'bg-[#1C1C1E] text-white active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>分析中...</span>
              </div>
            ) : (
              <>
                <Sparkles className={`w-6 h-6 ${canAnalyze ? 'text-[#007AFF]' : 'text-gray-300'}`} />
                <span>开始深度分析</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
