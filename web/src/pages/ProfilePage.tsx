import { motion } from 'framer-motion'
import { User, BarChart3, Info, HelpCircle, Shield, ChevronRight } from 'lucide-react'

export default function ProfilePage() {
  const menuItems = [
    { icon: Info, label: '关于我们' },
    { icon: HelpCircle, label: '帮助与反馈' },
    { icon: Shield, label: '隐私政策' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 导航栏 */}
      <header className="navbar">
        <div className="w-9" />
        <h1 className="navbar-title">我的</h1>
        <div className="w-9" />
      </header>

      <div className="pt-[calc(var(--navbar-height)+var(--safe-top)+8px)] px-6">
        {/* 用户信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg">
              🕺
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">摇摆舞者</h2>
              <p className="text-sm text-white/50">开始学习摇摆舞吧！</p>
            </div>
          </div>
        </motion.div>

        {/* 统计数据 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-6"
        >
          <div className="p-4 flex items-center gap-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <span className="text-white">分析次数</span>
            </div>
            <span className="text-white/60">0 次</span>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <span className="text-white">平均相似度</span>
            </div>
            <span className="text-white/60">--</span>
          </div>
        </motion.div>

        {/* 设置菜单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card mb-6"
        >
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              className={`w-full p-4 flex items-center gap-3 card-hover ${
                index !== menuItems.length - 1 ? 'border-b border-white/10' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-white/60" />
              </div>
              <span className="flex-1 text-left text-white">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-white/30" />
            </button>
          ))}
        </motion.div>

        {/* 版本号 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-white/30 mt-8"
        >
          摇摆舞分析器 v1.0.0
        </motion.p>
      </div>
    </div>
  )
}
