import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Video, Calendar, Clock } from 'lucide-react'

interface DanceRecord {
  id: number
  date: string
  video_path?: string
  thumbnail_path?: string
  duration?: number
  notes?: string
  style?: string
  song_name?: string
}

interface CalendarStats {
  year: number
  month: number
  total_records: number
  days_with_records: Record<number, number[]>
}

interface CalendarVideoSelectorProps {
  onFrameSelected: (frameBase64: string) => void
}

export default function CalendarVideoSelector({ onFrameSelected }: CalendarVideoSelectorProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [records, setRecords] = useState<DanceRecord[]>([])
  const [stats, setStats] = useState<CalendarStats | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<DanceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<'calendar' | 'player'>('calendar')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 获取日历数据
  useEffect(() => {
    fetchCalendarData()
  }, [year, month])

  const fetchCalendarData = async () => {
    setIsLoading(true)
    try {
      const [recordsRes, statsRes] = await Promise.all([
        fetch(`/api/calendar/records?year=${year}&month=${month}`),
        fetch(`/api/calendar/stats?year=${year}&month=${month}`)
      ])

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json()
        setRecords(recordsData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 生成日历网格
  const generateCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
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

  const handleDayClick = (day: number) => {
    const dayRecords = getRecordsForDay(day)
    if (dayRecords.length > 0) {
      setSelectedRecord(dayRecords[0])
      setView('player')
    }
  }

  const handleExtractFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.9)
    onFrameSelected(frameBase64)
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const calendarDays = generateCalendarDays()

  // 播放器视图
  if (view === 'player' && selectedRecord) {
    return (
      <div className="space-y-4">
        {/* 返回按钮 */}
        <button
          onClick={() => {
            setView('calendar')
            setSelectedRecord(null)
          }}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回日历
        </button>

        {/* 视频播放器 */}
        <div className="rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={`/api/calendar/video/${selectedRecord.id}`}
            className="w-full aspect-video"
            controls
            poster={selectedRecord.thumbnail_path ? `/api/calendar/thumbnail/${selectedRecord.id}` : undefined}
          />
        </div>

        {/* 隐藏的画布用于截图 */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 视频信息 */}
        <div className="card bg-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">
              {new Date(selectedRecord.date).getMonth() + 1}月{new Date(selectedRecord.date).getDate()}日
            </span>
            {selectedRecord.duration && (
              <span className="text-white/50 text-sm">{formatDuration(selectedRecord.duration)}</span>
            )}
          </div>
          {selectedRecord.style && (
            <span className="inline-block px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs mb-2">
              {selectedRecord.style}
            </span>
          )}
          {selectedRecord.notes && (
            <p className="text-white/50 text-sm line-clamp-2">{selectedRecord.notes}</p>
          )}
        </div>

        {/* 截帧按钮 */}
        <button
          onClick={handleExtractFrame}
          className="btn btn-primary btn-lg btn-block animate-pulse-glow"
        >
          截取当前帧用于分析
        </button>

        <p className="text-white/40 text-xs text-center">
          提示：先调整视频到想要分析的帧，然后点击按钮截取
        </p>
      </div>
    )
  }

  // 日历视图
  return (
    <div className="space-y-4">
      {/* 月份导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateMonth(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white/60" />
        </button>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          {year}年{month}月
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* 统计 */}
      {stats && stats.total_records > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-white/60">
            <Video className="w-4 h-4" />
            <span>{stats.total_records} 条记录</span>
          </div>
        </div>
      )}

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1">
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
              onClick={() => handleDayClick(day)}
              disabled={!hasRecord}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center relative
                ${hasRecord
                  ? 'bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/30 cursor-pointer'
                  : 'bg-white/5 opacity-50 cursor-not-allowed'
                }
              `}
            >
              <span className={`text-sm font-medium ${hasRecord ? 'text-white' : 'text-white/40'}`}>
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

      {/* 最近记录列表 */}
      {records.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-white/60 mb-3">本月记录</h4>
          <div className="space-y-2 max-h-48 overflow-auto">
            {records.slice(0, 5).map((record) => (
              <motion.button
                key={record.id}
                onClick={() => {
                  setSelectedRecord(record)
                  setView('player')
                }}
                className="w-full card p-3 flex items-center gap-3 text-left card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {record.thumbnail_path ? (
                    <img
                      src={`/api/calendar/thumbnail/${record.id}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video className="w-5 h-5 text-white/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    {new Date(record.date).getMonth() + 1}月{new Date(record.date).getDate()}日
                  </p>
                  {record.style && (
                    <p className="text-white/50 text-xs">{record.style}</p>
                  )}
                </div>
                {record.duration && (
                  <div className="flex items-center gap-1 text-white/40 text-xs">
                    <Clock className="w-3 h-3" />
                    {formatDuration(record.duration)}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 && !isLoading && (
        <div className="card p-8 text-center">
          <Video className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">本月没有记录</p>
          <p className="text-white/30 text-sm mt-1">先去日历页面添加跳舞记录吧</p>
        </div>
      )}
    </div>
  )
}
