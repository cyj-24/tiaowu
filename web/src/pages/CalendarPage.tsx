import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Video, Calendar as CalendarIcon, TrendingUp, Clock, Music, X } from 'lucide-react'

interface DanceRecord {
  id: number
  date: string
  video_path?: string
  thumbnail_path?: string
  duration?: number
  notes?: string
  style?: string
  song_name?: string
  mood?: string
}

interface CalendarStats {
  year: number
  month: number
  total_records: number
  total_duration: number
  days_with_records: Record<number, number[]>
  style_distribution: Record<string, number>
  active_days: number
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [records, setRecords] = useState<DanceRecord[]>([])
  const [stats, setStats] = useState<CalendarStats | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<DanceRecord | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // 获取日历数据
  useEffect(() => {
    fetchCalendarData()
  }, [year, month])

  const fetchCalendarData = async () => {
    try {
      // 获取记录列表
      const recordsRes = await fetch(`/api/calendar/records?year=${year}&month=${month}`)
      if (recordsRes.ok) {
        const recordsData = await recordsRes.json()
        setRecords(recordsData)
      }

      // 获取统计数据
      const statsRes = await fetch(`/api/calendar/stats?year=${year}&month=${month}`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err)
    }
  }

  // 生成日历网格
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // 空白天数
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // 实际天数
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const getRecordsForDay = (day: number): DanceRecord[] => {
    return records.filter(r => {
      const date = new Date(r.date)
      return date.getDate() === day
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const calendarDays = generateCalendarDays()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 顶部装饰 - 复古纸质渐变 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[var(--bg-tertiary)] to-transparent pointer-events-none" />

      {/* 导航栏 */}
      <header className="navbar">
        <div className="w-10" />
        <h1 className="navbar-title text-[var(--text-primary)]">练舞日历</h1>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--primary)] transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="relative pt-[calc(var(--navbar-height)+var(--safe-top)+16px)]">
        {/* 统计指标 - 复古成就卡 */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 mb-6"
          >
            <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-[var(--shadow-md)] border-2 border-[var(--text-primary)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                 <CalendarIcon size={80} />
              </div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] font-black text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-[0.2em] opacity-80">
                  <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                  Monthly Archive
                </h2>
                <div className="px-3 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-sm text-[10px] font-bold tracking-widest uppercase">
                  {year} · {month}月
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 relative z-10">
                <div className="space-y-1">
                  <p className="stat-value text-3xl">{stats.total_records}</p>
                  <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">记录数</p>
                </div>
                <div className="space-y-1">
                  <p className="stat-value text-3xl">{stats.active_days}</p>
                  <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">满勤天</p>
                </div>
                <div className="space-y-1">
                  <p className="stat-value text-3xl">{Math.floor(stats.total_duration / 60)}</p>
                  <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">分钟数</p>
                </div>
              </div>

              {/* 舞种标签 - 复古色块 */}
              {Object.keys(stats.style_distribution).length > 0 && (
                <div className="mt-8 pt-5 border-t border-[var(--border-color)] flex flex-wrap gap-2">
                  {Object.entries(stats.style_distribution).map(([style, count]) => (
                    <span
                      key={style}
                      className="px-3 py-1 rounded-sm bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-bold uppercase border border-[var(--border-color)]"
                    >
                      {style} · {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 日历卡片 - 复旧台历风格 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-6 mb-8"
        >
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
            {/* 月份切换 */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => navigateMonth(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all active:scale-90 border border-[var(--border-color)]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {year}年{month}月
              </h3>
              <button
                onClick={() => navigateMonth(1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all active:scale-90 border border-[var(--border-color)]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 星期标头 */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            {/* 日历单元格 */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dayRecords = getRecordsForDay(day)
                const hasRecord = dayRecords.length > 0
                const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === month && new Date().getFullYear() === year

                return (
                  <motion.button
                    key={day}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (hasRecord) {
                        setSelectedRecord(dayRecords[0])
                      }
                    }}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-300 border
                      ${hasRecord
                        ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-md'
                        : isToday 
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                          : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)] opacity-60'
                      }
                    `}
                  >
                    <span className="text-sm font-bold" style={{ fontFamily: hasRecord || isToday ? 'var(--font-display)' : 'inherited' }}>
                      {day}
                    </span>
                    {hasRecord && (
                      <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[var(--primary)]" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* 记录瀑布流 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="px-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-widest opacity-60">
              <CalendarIcon className="w-4 h-4 text-purple-500" />
              Journal Feed
            </h2>
          </div>

          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="bg-[var(--bg-secondary)] rounded-2xl p-12 text-center border-2 border-dashed border-[var(--border-color)]">
                <Video className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3 opacity-20" />
                <p className="text-[var(--text-secondary)] text-sm font-bold opacity-60">本月还没有练习记录</p>
                <button onClick={() => setIsUploadModalOpen(true)} className="text-[var(--primary)] text-xs font-bold mt-2 uppercase tracking-widest">立即开启一段精彩时光</button>
              </div>
            ) : (
              records.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedRecord(record)}
                  className="bg-[var(--bg-secondary)] rounded-xl p-4 flex items-center gap-4 cursor-pointer shadow-[var(--shadow-sm)] border border-[var(--border-color)] hover:border-[var(--primary)] transition-all active:scale-[0.98]"
                >
                  {/* 封面图 - 报纸裁剪感 */}
                  <div className="w-16 h-16 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden flex-shrink-0 relative border border-[var(--border-color)]">
                    {record.thumbnail_path ? (
                      <img
                        src={`/api/calendar/thumbnail/${record.id}`}
                        alt="Thumbnail"
                        className="w-full h-full object-cover filter sepia-[0.3]"
                      />
                    ) : (
                      <Video className="w-6 h-6 text-[var(--text-tertiary)]" />
                    )}
                  </div>

                  {/* 核心信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[var(--text-primary)] font-bold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                        {new Date(record.date).getMonth() + 1}月{new Date(record.date).getDate()}日
                      </span>
                      {record.style && (
                        <span className="px-2 py-0.5 rounded-sm bg-[var(--text-primary)] text-[var(--bg-primary)] text-[9px] font-bold uppercase tracking-tighter">
                          {record.style}
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs truncate font-medium opacity-70 italic">
                      “ {record.notes || 'No notes recorded.'} ”
                    </p>
                  </div>

                  {/* 时长指标 */}
                  {record.duration && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-[var(--text-secondary)] text-[10px] font-bold opacity-40">
                        <Clock className="w-3 h-3" />
                        {formatDuration(record.duration)}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* 记录详情模态框 */}
      <AnimatePresence>
        {selectedRecord && (
          <RecordDetailModal
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onDelete={() => {
              fetchCalendarData()
              setSelectedRecord(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* 添加记录模态框 */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <UploadRecordModal
            onClose={() => setIsUploadModalOpen(false)}
            onSuccess={() => {
              fetchCalendarData()
              setIsUploadModalOpen(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// 详情模态框
function RecordDetailModal({ record, onClose, onDelete }: {
  record: DanceRecord
  onClose: () => void
  onDelete: () => void
}) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除这条练习记录吗？')) return
    try {
      const res = await fetch(`/api/calendar/records/${record.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDelete()
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/60 backdrop-blur-xl z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="w-full bg-white rounded-t-[40px] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] max-h-[95vh] overflow-auto border-t border-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />

        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-8">
           <div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {new Date(record.date).getFullYear()}年{new Date(record.date).getMonth() + 1}月{new Date(record.date).getDate()}日
              </h2>
              <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest opacity-40">Practice Session Details</p>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
              <X className="w-5 h-5" />
           </button>
        </div>

        {/* 视频容器 */}
        {record.video_path && (
          <div className="rounded-[32px] overflow-hidden bg-gray-900 mb-8 shadow-2xl relative group">
            <video
              src={`/api/calendar/video/${record.id}`}
              className="w-full aspect-video"
              controls
              poster={record.thumbnail_path ? `/api/calendar/thumbnail/${record.id}` : undefined}
            />
          </div>
        )}

        <div className="space-y-8">
          <div className="flex flex-wrap gap-3">
             {record.style && (
                <div className="px-4 py-2 rounded-2xl bg-blue-50 text-blue-600 font-black text-xs uppercase tracking-tight border border-blue-100">
                  {record.style}
                </div>
              )}
              {record.duration && (
                <div className="px-4 py-2 rounded-2xl bg-gray-50 text-[var(--text-primary)] font-black text-xs uppercase tracking-tight flex items-center gap-2 border border-gray-100">
                  <Clock className="w-4 h-4 text-blue-500" />
                  {formatDuration(record.duration)}
                </div>
              )}
              {record.song_name && (
                <div className="px-4 py-2 rounded-2xl bg-purple-50 text-purple-600 font-black text-xs uppercase tracking-tight flex items-center gap-2 border border-purple-100">
                  <Music className="w-4 h-4" />
                  {record.song_name}
                </div>
              )}
          </div>

          {record.notes && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-40">Notes</h3>
              <div className="bg-gray-50/50 rounded-[24px] p-6 border border-gray-50">
                <p className="text-[var(--text-primary)] text-sm font-medium leading-relaxed italic">{record.notes}</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4 pb-8">
            <button
              onClick={handleDelete}
              className="flex-1 py-5 rounded-[24px] bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 transition-all active:scale-95"
            >
              删除记录
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-5 rounded-[24px] bg-[#1C1C1E] text-white font-bold text-sm shadow-xl active:scale-95 transition-all"
            >
              继续练习
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// 上传模态框
function UploadRecordModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [video, setVideo] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [style, setStyle] = useState('')
  const [songName, setSongName] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideo(file)
      setVideoUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!video) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('video', video)
      if (notes) formData.append('notes', notes)
      if (style) formData.append('style', style)
      if (songName) formData.append('song_name', songName)

      const res = await fetch('/api/calendar/records', {
        method: 'POST',
        body: formData
      })
      if (res.ok) onSuccess()
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/60 backdrop-blur-xl z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="w-full bg-white rounded-t-[40px] p-8 max-h-[95vh] overflow-auto shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-8 tracking-tight">添加跳舞记录</h2>

        <div className="space-y-6">
          {!video ? (
            <label className="block bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] p-12 text-center cursor-pointer hover:border-blue-200 hover:bg-blue-50/20 transition-all">
              <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                 <Video className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-[var(--text-primary)] font-bold">选择练习视频</p>
              <p className="text-[var(--text-secondary)] text-[10px] mt-1 font-bold opacity-30">MP4, MOV up to 100MB</p>
            </label>
          ) : (
            <div className="rounded-[32px] overflow-hidden bg-gray-900 relative shadow-2xl">
              <video src={videoUrl} className="w-full aspect-video" controls />
              <button
                onClick={() => { setVideo(null); setVideoUrl('') }}
                className="w-full py-4 bg-red-50 text-red-500 text-xs font-bold border-t border-red-100"
              >
                重新选择视频
              </button>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest pl-1 opacity-30">舞种类型</label>
              <select
                value={style}
                onChange={e => setStyle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-primary)] appearance-none focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="">选择舞种</option>
                <option value="Lindy Hop">Lindy Hop</option>
                <option value="Charleston">Charleston</option>
                <option value="Balboa">Balboa</option>
                <option value="Blues">Blues</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest pl-1 opacity-30">舞曲名称</label>
              <input
                type="text"
                value={songName}
                onChange={e => setSongName(e.target.value)}
                placeholder="所选歌曲名称"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest pl-1 opacity-30">练习心得</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="今天的心得体会..."
                rows={4}
                className="w-full bg-gray-50 border border-gray-100 rounded-[24px] px-5 py-4 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 resize-none focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!video || isUploading}
              className="w-full py-5 rounded-[24px] bg-[#1C1C1E] text-white font-black text-lg shadow-2xl active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale"
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-3">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   <span>正在同步云端...</span>
                </div>
              ) : '保存这段精彩时光'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
