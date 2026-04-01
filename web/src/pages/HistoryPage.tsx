import { Clock, FileX, Search, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 装饰渐变 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

      {/* 导航栏 */}
      <header className="navbar">
        <div className="w-10" />
        <h1 className="navbar-title text-[var(--text-primary)] font-bold">分析历史</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-[var(--text-secondary)] hover:bg-gray-100 transition-all active:scale-95">
          <Filter className="w-5 h-5" />
        </button>
      </header>

      <div className="relative pt-[calc(var(--navbar-height)+var(--safe-top)+16px)] px-6">
        {/* 顶部搜素栏 */}
        <div className="mb-8 p-1 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex items-center border border-gray-50">
          <div className="w-10 h-10 flex items-center justify-center text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="搜索练习记录..." 
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-[var(--text-primary)] placeholder:opacity-30"
          />
        </div>

        {/* 暂无记录空状态 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 px-8 bg-white/40 rounded-[40px] border border-dashed border-gray-100"
        >
          <div className="w-20 h-20 rounded-[24px] bg-white shadow-sm flex items-center justify-center mb-6">
            <FileX className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-lg font-black text-[var(--text-primary)] mb-2 tracking-tight">时光胶囊还是空的</h3>
          <p className="text-[var(--text-secondary)] text-sm text-center leading-relaxed font-medium opacity-40">
            完成你的第一次 AI 舞姿分析<br />精彩瞬间会自动同步到这里
          </p>
          <button className="mt-8 px-8 py-4 bg-[#1C1C1E] text-white rounded-[20px] font-bold text-sm shadow-xl active:scale-95 transition-all">
            开启今日训练
          </button>
        </motion.div>

        {/* 示例列表预览（占位） */}
        <div className="mt-12 space-y-4">
           <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-30 pl-1">近期回顾 Preview</p>
           
           {[1, 2].map((i) => (
              <div key={i} className="opacity-20 blur-[1px] pointer-events-none">
                <div className="bg-white rounded-[28px] p-5 flex items-center gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] border border-gray-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[var(--text-primary)] tracking-tight">练习记录 #{i}</p>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase opacity-40">2024-03-27 14:30</p>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-600 text-xs font-black">
                    8{i}%
                  </div>
                </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  )
}
