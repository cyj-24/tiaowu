import { Clock, FileX } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 导航栏 */}
      <header className="navbar">
        <div className="w-9" />
        <h1 className="navbar-title">历史记录</h1>
        <div className="w-9" />
      </header>

      <div className="pt-[calc(var(--navbar-height)+var(--safe-top)+8px)] px-6">
        {/* 空状态 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <FileX className="w-12 h-12 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">暂无历史记录</h3>
          <p className="text-white/50 text-sm text-center">开始分析你的舞姿<br />记录会保存在这里</p>
        </motion.div>

        {/* 示例卡片（后续替换为真实数据） */}
        <div className="opacity-30">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">摇摆舞练习 #1</p>
              <p className="text-xs text-white/50">2024-03-27 14:30</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
              72%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
