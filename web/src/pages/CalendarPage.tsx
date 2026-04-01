import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Video, Calendar as CalendarIcon, TrendingUp, Clock, Music } from 'lucide-react'

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
      {/* 顶部导航 */}
      <header className="navbar">
        <div className="w-9" />
        <h1 className="navbar-title">跳舞日历</h1>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-purple-500"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </header>

      <div className="pt-[calc(var(--navbar-height)+var(--safe-top)+8px)]">
        {/* 统计卡片 */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mb-6"
          >
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  {year}年{month}月统计
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.total_records}</p>
                  <p className="text-white/50 text-xs">跳舞次数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.active_days}</p>
                  <p className="text-white/50 text-xs">活跃天数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{Math.floor(stats.total_duration / 60)}</p>
                  <p className="text-white/50 text-xs">总分钟</p>
                </div>
              </div>

              {/* 舞种分布 */}
              {Object.keys(stats.style_distribution).length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.style_distribution).map(([style, count]) => (
                      <span
                        key={style}
                        className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs"
                      >
                        {style} · {count}次
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 日历 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-6"
        >
          <div className="card p-4">
            {/* 月份导航 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </button>
              <h3 className="text-lg font-semibold text-white">
                {year}年{month}月
              </h3>
              <button
                onClick={() => navigateMonth(1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center py-2 text-white/40 text-sm font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* 日历网格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dayRecords = getRecordsForDay(day)
                const hasRecord = dayRecords.length > 0

                return (
                  <motion.button
                    key={day}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (hasRecord) {
                        setSelectedRecord(dayRecords[0])
                      }
                    }}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center relative
                      ${hasRecord
                        ? 'bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/30'
                        : 'hover:bg-white/5'
                      }
                    `}
                  >
                    <span className={`text-sm font-medium ${hasRecord ? 'text-white' : 'text-white/60'}`}>
                      {day}
                    </span>
                    {hasRecord && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayRecords.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-orange-500" />
                        ))}
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* 最近记录 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-6 mt-6"
        >
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-purple-500" />
            本月记录
          </h2>

          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-white/40">本月还没有记录</p>
                <p className="text-white/30 text-sm mt-1">点击右上角 + 添加第一条记录</p>
              </div>
            ) : (
              records.slice(0, 10).map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedRecord(record)}
                  className="card p-4 flex items-center gap-4 cursor-pointer card-hover"
                >
                  {/* 缩略图 */}
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {record.thumbnail_path ? (
                      <img
                        src={`/api/calendar/thumbnail/${record.id}`}
                        alt="缩略图"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="w-6 h-6 text-white/30" />
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium truncate">
                        {new Date(record.date).getMonth() + 1}月{new Date(record.date).getDate()}日
                      </span>
                      {record.style && (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
                          {record.style}
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-sm truncate">{record.notes || '无心得记录'}</p>
                  </div>

                  {/* 时长 */}
                  {record.duration && (
                    <div className="flex items-center gap-1 text-white/40 text-sm">
                      <Clock className="w-4 h-4" />
                      {formatDuration(record.duration)}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* 记录详情弹窗 */}
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

      {/* 上传弹窗 */}
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

// 记录详情弹窗
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
    if (!confirm('确定要删除这条记录吗？')) return
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full bg-[var(--bg-secondary)] rounded-t-3xl p-6 max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 拖动条 */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        {/* 视频播放器 */}
        {record.video_path && (
          <div className="rounded-2xl overflow-hidden bg-black mb-6">
            <video
              src={`/api/calendar/video/${record.id}`}
              className="w-full aspect-video"
              controls
              poster={record.thumbnail_path ? `/api/calendar/thumbnail/${record.id}` : undefined}
            />
          </div>
        )}

        {/* 信息 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {new Date(record.date).getFullYear()}年{new Date(record.date).getMonth() + 1}月{new Date(record.date).getDate()}日
            </h2>
            {record.duration && (
              <div className="flex items-center gap-1 text-white/60">
                <Clock className="w-4 h-4" />
                {formatDuration(record.duration)}
              </div>
            )}
          </div>

          {record.style && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm">
                {record.style}
              </span>
            </div>
          )}

          {record.song_name && (
            <div className="flex items-center gap-2 text-white/60">
              <Music className="w-4 h-4" />
              <span>{record.song_name}</span>
            </div>
          )}

          {record.notes && (
            <div className="card bg-white/5 p-4">
              <p className="text-white/80 whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleDelete}
              className="flex-1 btn btn-secondary py-3"
            >
              删除
            </button>
            <button
              onClick={onClose}
              className="flex-1 btn btn-primary py-3"
            >
              关闭
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// 上传记录弹窗
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

      if (res.ok) {
        onSuccess()
      }
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full bg-[var(--bg-secondary)] rounded-t-3xl p-6 max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 拖动条 */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <h2 className="text-xl font-bold text-white mb-6">添加跳舞记录</h2>

        {/* 视频上传 */}
        {!video ? (
          <label className="upload-zone block mb-6 cursor-pointer">
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
            <Video className="w-10 h-10 text-orange-500 mx-auto mb-2" />
            <p className="text-white font-medium">点击选择视频</p>
            <p className="text-white/40 text-xs">MP4, MOV</p>
          </label>
        ) : (
          <div className="rounded-2xl overflow-hidden bg-black mb-6">
            <video src={videoUrl} className="w-full aspect-video" controls />
            <button
              onClick={() => { setVideo(null); setVideoUrl('') }}
              className="w-full py-3 bg-red-500/20 text-red-400 text-sm"
            >
              重新选择
            </button>
          </div>
        )}

        {/* 表单 */}
        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-2 block">舞种</label>
            <select
              value={style}
              onChange={e => setStyle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
            >
              <option value="">选择舞种</option>
              <option value="Lindy Hop">Lindy Hop</option>
              <option value="Charleston">Charleston</option>
              <option value="Balboa">Balboa</option>
              <option value="Shag">Shag</option>
              <option value="Blues">Blues</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="text-white/60 text-sm mb-2 block">歌曲名称</label>
            <input
              type="text"
              value={songName}
              onChange={e => setSongName(e.target.value)}
              placeholder="输入歌曲名称"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-2 block">心得记录</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="记录今天的练习心得..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!video || isUploading}
            className="btn btn-primary btn-lg btn-block"
          >
            {isUploading ? '上传中...' : '保存记录'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
