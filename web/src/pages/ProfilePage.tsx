import { motion } from 'framer-motion'
import { User, BarChart3, Info, HelpCircle, Shield, ChevronRight, Settings, LogOut, Award } from 'lucide-react'

export default function ProfilePage() {
  const menuItems = [
    { icon: Award, label: '成就勋章', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: HelpCircle, label: '帮助与反馈', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Shield, label: '隐私与安全', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: Info, label: '关于分析器', color: 'text-purple-500', bg: 'bg-purple-50' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 顶部饰条 */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-blue-50/50 via-white to-transparent pointer-events-none" />

      {/* 导航栏 */}
      <header className="navbar">
        <div className="w-10" />
        <h1 className="navbar-title text-[var(--text-primary)] font-bold">个人主页</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-[var(--text-secondary)] hover:bg-gray-100 transition-all active:scale-95">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <div className="relative pt-[calc(var(--navbar-height)+var(--safe-top)+16px)] px-6">
        {/* 用户资料卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] p-8 mb-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-white text-center"
        >
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              🕺
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white">
               <Award className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-2">Swing Dancer</h2>
          <p className="text-[var(--text-secondary)] text-sm font-medium opacity-60">
            用 AI 记录你跳舞的每一个瞬间
          </p>

          {/* 活跃指标 */}
          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-50">
            <div className="text-center">
               <p className="text-xl font-black text-[var(--text-primary)] tracking-tighter">12</p>
               <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest opacity-30">Total Days</p>
            </div>
            <div className="text-center border-l border-gray-50">
               <p className="text-xl font-black text-[var(--text-primary)] tracking-tighter">86%</p>
               <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest opacity-30">Avg Match</p>
            </div>
          </div>
        </motion.div>

        {/* 核心看板 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50/50"
           >
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                 <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">0次</p>
              <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase opacity-40">分析记录</p>
           </motion.div>
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50/50"
           >
              <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                 <User className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">L1级</p>
              <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase opacity-40">成长阶梯</p>
           </motion.div>
        </div>

        {/* 功能列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[32px] p-2 shadow-sm border border-gray-50/50"
        >
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              className={`w-full p-4 flex items-center gap-4 transition-all hover:bg-gray-50/80 active:scale-[0.98] ${
                index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <span className="flex-1 text-left text-sm font-bold text-[var(--text-primary)]">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          ))}
        </motion.div>

        {/* 退出按钮 */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full mt-8 py-5 rounded-[24px] bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          退出当前账号
        </motion.button>

        {/* 版本脚标 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-20 mt-12 pb-8"
        >
          Vanguard v1.2.0 • Build 24A01
        </motion.p>
      </div>
    </div>
  )
}
