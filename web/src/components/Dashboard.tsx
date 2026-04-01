import React from 'react';
import { ChevronRight, Home, Activity, PieChart, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-28 font-sans text-gray-900">
      {/* 顶部标题区 */}
      <div className="pt-14 pb-4 px-6 sticky top-0 bg-[#F7F8FA]/80 backdrop-blur-md z-10 flex justify-between items-center transition-all border-b border-transparent">
        <h1 className="text-[22px] font-bold tracking-tight">进步</h1>
        <div className="w-10 h-10 rounded-full bg-white shadow-sm overflow-hidden border border-gray-100 p-0.5">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
        </div>
      </div>

      <div className="px-5 space-y-7">
        
        {/* 打卡进度模块 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold">打卡进度</h2>
            <span className="text-xs text-green-500 font-bold bg-green-50 px-2.5 py-1 rounded-full">坚持打卡，遇见更好的自己</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 连续打卡 */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[28px] p-5 flex flex-col items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative border border-white"
            >
              <div className="relative w-22 h-22 mb-3 mt-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#FFF5F5" strokeWidth="9" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gradient-fire)" strokeWidth="9" strokeDasharray="282.7" strokeDashoffset="70" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="gradient-fire" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF8E97" />
                      <stop offset="100%" stopColor="#FF4B4B" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-13 h-13 bg-red-50 rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-2xl">🔥</span>
                  </div>
                </div>
              </div>
              <div className="text-[26px] font-black leading-none mb-1 text-gray-900">
                12<span className="text-sm font-medium ml-1">天</span>
              </div>
              <div className="text-[11px] text-gray-400 font-bold tracking-wider">连续练习</div>
            </motion.div>

            {/* 每周目标 */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-[28px] p-5 flex flex-col items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative border border-white"
            >
              <div className="relative w-22 h-22 mb-3 mt-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#F0FDF4" strokeWidth="9" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#22C55E" strokeWidth="9" strokeDasharray="282.7" strokeDashoffset="90" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-13 h-13 bg-green-50 rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-2xl">🌿</span>
                  </div>
                </div>
              </div>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-[26px] font-black leading-none">105<span className="text-sm font-medium">/150</span></span>
              </div>
              <div className="text-[11px] text-gray-400 font-bold tracking-wider">每周目标 (分钟)</div>
            </motion.div>
          </div>
        </section>

        {/* 健身等级 */}
        <section>
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-white rounded-[28px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[17px] font-bold">健身等级</h2>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
            <div className="text-gray-400 text-xs font-bold mb-5 tracking-tight">继续努力，解锁“摇摆达人”勋章</div>
            
            <div className="flex items-center gap-5">
              <div className="w-20 h-24 bg-gray-50 rounded-[20px] flex-shrink-0 flex items-center justify-center border border-gray-100/50 shadow-sm">
                <img src="https://api.dicebear.com/7.x/big-ears-neutral/svg?seed=1" alt="rank" className="w-14 h-14" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[#FF8C00] font-black text-xl italic tracking-tighter">LV.1</span>
                  <div className="bg-[#FFF4E5] text-[#FF8C00] text-[11px] px-3 py-1 rounded-full font-black flex items-center gap-1.5 border border-[#FF8C00]/10">
                    🏆 健身小白
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div className="text-right">
                      <span className="text-[10px] font-black inline-block text-[#FF8C00]">65%</span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-1 text-xs flex rounded-full bg-gray-100">
                    <div style={{ width: "65%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[#FFB84D] to-[#FF8C00] rounded-full"></div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold mt-1">距离下一等级还需 3 次有效练舞</div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 姿态分数变化 & 成长日记 */}
        <section className="grid grid-cols-2 gap-4">
          
          {/* 进度图表 */}
          <div className="bg-white rounded-[28px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] h-[160px] flex flex-col border border-white">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-sm font-bold">姿态评分</h3>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-[10px] text-gray-400 font-bold mb-4 tracking-tight">记录每一步成长</div>
            <div className="flex-1 mt-auto relative">
              <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient-path" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,45 C15,35 30,42 45,30 C60,18 80,25 100,5 L100,50 L0,50 Z"
                  fill="url(#gradient-path)"
                />
                <polyline
                  points="0,45 15,35 30,42 45,30 65,22 85,28 100,5"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* 成长日记预览 */}
          <div className="bg-white rounded-[28px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] h-[160px] flex flex-col border border-white">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-sm font-bold">成长日记</h3>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-[10px] text-gray-400 font-bold mb-4 tracking-tight">记录练舞好心情</div>
            <div className="flex flex-1 items-end justify-around px-1 pb-1">
              <div className="flex flex-col items-center gap-1.5 opacity-30">
                <span className="text-[10px] font-medium text-gray-400">一</span>
                <span className="text-lg">🥵</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-gray-900 text-white rounded-2xl px-2 py-3 shadow-md -translate-y-2">
                <span className="text-[10px] font-bold opacity-70">12</span>
                <span className="text-lg">🤩</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium text-gray-400">三</span>
                <span className="text-lg">😎</span>
              </div>
            </div>
          </div>
          
        </section>

        {/* 开始分析按钮 */}
        <section className="pt-2">
          <motion.button 
            whileTap={{ scale: 0.97 }}
            className="w-full bg-gray-900 dark:bg-gray-900 rounded-[24px] p-5 text-white shadow-xl shadow-gray-200 transition-all flex justify-between items-center"
          >
            <div className="text-left">
              <div className="font-bold text-lg mb-0.5">开始测评分析 🚀</div>
              <div className="text-xs text-white/50 font-bold">同步视频实时纠错对比</div>
            </div>
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/5">
              <ChevronRight className="w-7 h-7 text-white" />
            </div>
          </motion.button>
        </section>
        
      </div>

      {/* 底部悬浮导航条 */}
      <div className="fixed bottom-6 left-5 right-5 h-20 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[32px] flex justify-around items-center px-4 z-50 border border-gray-100/50">
        <button className="flex flex-col items-center gap-1.5 p-2 group">
          <Home className="w-[24px] h-[24px] text-gray-300 group-hover:text-gray-400 transition-colors" />
          <span className="text-[10px] font-bold text-gray-400">教练</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 p-2 group">
          <Activity className="w-[24px] h-[24px] text-gray-300 group-hover:text-gray-400 transition-colors" />
          <span className="text-[10px] font-bold text-gray-400">搭子</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 p-2 bg-gray-50 rounded-2xl px-4 py-2 border border-blue-50">
          <PieChart className="w-[26px] h-[26px] text-blue-600" />
          <span className="text-[11px] font-black text-blue-600">进步</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 p-2 group">
          <User className="w-[24px] h-[24px] text-gray-300 group-hover:text-gray-400 transition-colors" />
          <span className="text-[10px] font-bold text-gray-400">我的</span>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
