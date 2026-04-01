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


  const calendarDays = generateCalendarDays()

  // 播放器视图
  if (view === 'player' && selectedRecord) {
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* 返回按钮 */}
        <button
          onClick={() => {
            setView('calendar')
            setSelectedRecord(null)
          }}
          className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          返回成长日记
        </button>

        {/* 视频播放器 */}
        <div className="rounded-[28px] overflow-hidden bg-black shadow-xl ring-1 ring-gray-100">
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
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-gray-900 font-black text-lg">
                {new Date(selectedRecord.date).getMonth() + 1}月{new Date(selectedRecord.date).getDate()}日
              </span>
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-0.5">DANCE SESSION</span>
            </div>
            {selectedRecord.duration && (
              <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-gray-900 font-bold text-sm">{formatDuration(selectedRecord.duration)}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mb-4">
            {selectedRecord.style && (
              <span className="inline-block px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-black">
                {selectedRecord.style.toUpperCase()}
              </span>
            )}
            <span className="inline-block px-3 py-1 rounded-lg bg-orange-50 text-orange-500 text-xs font-black">
              练舞记录
            </span>
          </div>

          {selectedRecord.notes && (
            <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-600 text-[13px] leading-relaxed italic font-medium">“{selectedRecord.notes}”</p>
            </div>
          )}
        </div>

        {/* 截帧按钮 */}
        <button
          onClick={handleExtractFrame}
          className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-[17px] shadow-lg shadow-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Video className="w-5 h-5" />
          截取当前帧进行 AI 分析
        </button>

        <p className="text-gray-400 text-xs text-center font-bold px-8 leading-normal">
          💡 技巧：将视频调整到最想对比的动作瞬间，然后点击上方按钮
        </p>
      </div>
    )
  }

  // 日历视图
  return (
    <div className="space-y-6">
      {/* 月份导航 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
            <Calendar className="w-5 h-5 text-gray-900" />
          </div>
          {year}年{month}月
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-gray-100">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="text-center py-2 text-gray-400 text-[11px] font-black uppercase tracking-tighter">
              {day}
            </div>
          ))}
        </div>

        {/* 日历网格 */}
        <div className="grid grid-cols-7 gap-y-3 gap-x-1">
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
                onClick={() => handleDayClick(day)}
                disabled={!hasRecord}
                className="flex flex-col items-center gap-1.5"
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center relative transition-all duration-300
                  ${isToday ? 'bg-gray-900 text-white shadow-md' : 'text-gray-900 font-bold'}
                  ${!hasRecord && !isToday ? 'text-gray-300 font-medium' : ''}
                `}>
                  <span className="text-[15px] z-10">{day}</span>
                  {hasRecord && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] shadow-sm border border-gray-50">
                      🤩
                    </div>
                  )}
                </div>
                {hasRecord && (
                  <div className="flex gap-0.5">
                    {dayRecords.slice(0, 3).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
                    ))}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* 底部详细统计卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">本月练舞</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900">{stats?.total_records || 0}</span>
            <span className="text-xs font-bold text-gray-500">次</span>
          </div>
        </div>
        <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">累计时长</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-gray-900">12.5</span>
            <span className="text-xs font-bold text-gray-500">小时</span>
          </div>
        </div>
      </div>

      {/* 最近记录列表 - 仿成长日记展示 */}
      {records.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[17px] font-black text-gray-900">训练日记</h4>
            <button className="text-blue-500 text-xs font-black px-3 py-1 bg-blue-50 rounded-lg">查看全部</button>
          </div>
          <div className="space-y-4">
            {records.slice(0, 4).map((record) => (
              <motion.button
                key={record.id}
                onClick={() => {
                  setSelectedRecord(record)
                  setView('player')
                }}
                className="w-full bg-white rounded-[24px] p-4 flex items-center gap-4 text-left shadow-sm border border-gray-50 hover:border-gray-200 transition-all group"
              >
                <div className="w-16 h-16 rounded-[20px] bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner ring-1 ring-gray-100">
                  {record.thumbnail_path ? (
                    <img
                      src={`/api/calendar/thumbnail/${record.id}`}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                    />
                  ) : (
                    <div className="bg-blue-50 w-full h-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-blue-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-900 text-base font-black">
                      {new Date(record.date).getMonth() + 1}月{new Date(record.date).getDate()}日
                    </span>
                    <span className="text-[16px]">✨</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {record.style && (
                      <p className="text-blue-500 text-[11px] font-black tracking-tight">{record.style.toUpperCase()}</p>
                    )}
                    {record.duration && (
                      <div className="flex items-center gap-1 text-gray-400 text-[11px] font-bold">
                        <Clock className="w-3 h-3" />
                        {formatDuration(record.duration)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 && !isLoading && (
        <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200 shadow-inner">
          <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <Video className="w-10 h-10 text-gray-200" />
          </div>
          <p className="text-gray-900 font-black text-lg mb-2">还没有训练记录哦</p>
          <p className="text-gray-400 font-bold text-sm">开始你的第一次练舞，开启成长之旅吧 ✨</p>
        </div>
      )}
    </div>
  )
}
