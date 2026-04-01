import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnalysisResult } from '../types'
import PoseCanvas from '../components/PoseCanvas'
import { ChevronLeft, Share2, RefreshCw, Target, Activity, TrendingUp, Sparkles } from 'lucide-react'

interface AnalysisPageProps {
  result: AnalysisResult
  myImage: string
  masterImage: string
  onBack: () => void
}

export default function AnalysisPage({ result, myImage, masterImage, onBack }: AnalysisPageProps) {
  const [showKeypoints, setShowKeypoints] = useState(true)
  const [showConnections, setShowConnections] = useState(true)

  const getScoreInfo = (score: number) => {
    if (score >= 80) return { color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]', label: '大师级：动作协调极致', status: '档案优等' }
    if (score >= 60) return { color: 'text-[var(--text-primary)]', bg: 'bg-[var(--primary)]', label: '进阶级：韵律捕捉到位', status: '常规通过' }
    return { color: 'text-red-800', bg: 'bg-red-800', label: '见习级：建议多练基础步', status: '需重审' }
  }

  const scoreInfo = getScoreInfo(result.similarity)
  const circumference = 2 * Math.PI * 52
  const strokeDashoffset = circumference - (result.similarity / 100) * circumference

  // 找出最大的差异
  const sortedDiffs = Object.entries(result.angleDiffs || {})
    .sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number))
    .slice(0, 3)

  const angleNames: Record<string, string> = {
    leftShoulderAngle: '左肩',
    rightShoulderAngle: '右肩',
    leftElbowAngle: '左肘',
    rightElbowAngle: '右肘',
    leftHipAngle: '左髋',
    rightHipAngle: '右髋',
    leftKneeAngle: '左膝',
    rightKneeAngle: '右膝',
    torsoAngle: '躯干'
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
      {/* 顶部饰条 - 复旧纹理渐变 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[var(--bg-tertiary)] to-transparent pointer-events-none" />

      {/* 导航栏 */}
      <header className="navbar">
        <button onClick={onBack} className="navbar-back flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--bg-hover)] transition-colors border border-transparent active:border-[var(--border-color)]">
          <ChevronLeft className="w-6 h-6 text-[var(--text-primary)]" />
        </button>
        <h1 className="navbar-title text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>分析档案</h1>
        <button className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--bg-hover)] transition-colors border border-transparent active:border-[var(--border-color)]">
          <Share2 className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
      </header>

      <div className="relative pt-[calc(var(--navbar-height)+var(--safe-top)+16px)] px-6">
        {/* 核心评分卡片 */}
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="bg-[var(--bg-secondary)] rounded-2xl p-6 mb-6 shadow-[var(--shadow-sm)] border border-[var(--border-color)] relative overflow-hidden"
        >
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-1 opacity-60">Similarity Score</p>
              <div className="text-6xl font-black text-[var(--text-primary)] tracking-tighter mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                {result.similarity.toFixed(0)}<span className="text-2xl text-[var(--primary)]">%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${scoreInfo.bg}`} />
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {scoreInfo.label}
                </p>
              </div>
            </div>

            {/* 环形进度 */}
            <div className="relative w-28 h-28 transform hover:scale-105 transition-transform duration-500">
              <svg className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="score_grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--primary-dark)" />
                  </linearGradient>
                </defs>
                <circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="var(--bg-tertiary)"
                  strokeWidth="10"
                />
                <motion.circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="url(#score_grad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  style={{ strokeDasharray: circumference }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-6 h-6 text-[var(--primary)]" />
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest opacity-40">
              <span>Consistency</span>
              <span>100%</span>
            </div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden p-0.5">
              <motion.div
                className="h-full rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)]"
                initial={{ width: 0 }}
                animate={{ width: `${result.similarity}%` }}
                transition={{ duration: 1.2, delay: 0.2, ease: "circOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* 关键差异分析 - 实体档案风格 */}
        {sortedDiffs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--bg-secondary)] rounded-2xl p-6 mb-6 shadow-[var(--shadow-sm)] border border-[var(--border-color)]"
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-dashed border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-color)]">
                  <Activity className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-widest border-l-4 border-[var(--primary)] pl-3">核心改进点</h3>
              </div>
              <span className="text-[9px] bg-[var(--text-primary)] text-[var(--bg-primary)] px-3 py-1 rounded-sm font-bold uppercase tracking-widest">Archive Record</span>
            </div>

            <div className="space-y-4">
              {sortedDiffs.map(([key, value], index) => {
                const numValue = value as number
                const isFar = Math.abs(numValue) > 15
                
                return (
                  <div key={key} className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-color)] group hover:border-[var(--primary)] transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full border-2 border-[var(--text-primary)] flex items-center justify-center text-[10px] font-black group-hover:bg-[var(--primary)] group-hover:text-white transition-colors`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] text-sm font-bold">{angleNames[key] || key}</p>
                        <p className={`text-[10px] font-bold uppercase ${isFar ? 'text-red-800' : 'text-[var(--text-secondary)]'}`}>
                          {isFar ? '偏离大 · 需要纠正' : '基本同步 · 建议微调'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold tracking-tighter text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                        {numValue > 0 ? '+' : ''}{numValue.toFixed(1)}°
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* 可视化姿态对比 - 老照片冲印感 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden mb-6 shadow-[var(--shadow-sm)] border border-[var(--border-color)]"
        >
          <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-tertiary)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--text-primary)] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>姿态精析</h3>
            </div>
            <div className="flex gap-1">
               <div className="w-3 h-3 rounded-full bg-[var(--primary)]" />
               <div className="w-3 h-3 rounded-full bg-[var(--text-primary)] opacity-20" />
            </div>
          </div>

          <div className="p-5 space-y-8 bg-[var(--bg-secondary)]">
            <div className="grid grid-cols-1 gap-8">
              {/* 我的姿态 */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] pl-1 opacity-60">Archive: My Form</p>
                <div className="rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border-2 border-[var(--text-primary)] relative shadow-inner">
                  <PoseCanvas
                    myImage={myImage}
                    masterImage={masterImage}
                    myPose={result.myPose}
                    masterPose={result.masterPose}
                    overlayOpacity={1}
                    showKeypoints={showKeypoints}
                    showConnections={showConnections}
                    mode="myOnly"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-sm font-bold text-[10px] tracking-widest shadow-lg">
                    ME / 存档
                  </div>
                </div>
              </div>

              {/* 对比姿态 */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] pl-1 opacity-60">Archive: Master Ref</p>
                <div className="rounded-xl overflow-hidden bg-[var(--bg-tertiary)] border-2 border-[var(--text-primary)] relative shadow-inner">
                  <PoseCanvas
                    myImage={myImage}
                    masterImage={masterImage}
                    myPose={result.myPose}
                    masterPose={result.masterPose}
                    overlayOpacity={1}
                    showKeypoints={showKeypoints}
                    showConnections={showConnections}
                    mode="masterOnly"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-[var(--primary)] text-white rounded-sm font-bold text-[10px] tracking-widest shadow-lg">
                    MASTER / 典范
                  </div>
                </div>
              </div>
            </div>

            {/* 控制开关 - 按钮质感提升 */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
              <button 
                onClick={() => setShowKeypoints(!showKeypoints)}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${showKeypoints ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-2 border-[var(--text-primary)]' : 'bg-transparent text-[var(--text-tertiary)] border-2 border-[var(--border-color)]'}`}
              >
                Nodes / {showKeypoints ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={() => setShowConnections(!showConnections)}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${showConnections ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-2 border-[var(--text-primary)]' : 'bg-transparent text-[var(--text-tertiary)] border-2 border-[var(--border-color)]'}`}
              >
                Lines / {showConnections ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* AI 教练建议 - 羊皮纸/打字机报告风格 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--bg-secondary)] rounded-2xl p-8 mb-8 shadow-[var(--shadow-sm)] border border-[var(--border-color)] relative"
        >
          <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1 bg-[var(--primary)] text-white text-[10px] font-bold tracking-widest uppercase shadow-md">
            The Mentor's Note
          </div>
          
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--border-color)]">
             <Sparkles className="w-5 h-5 text-[var(--primary)]" />
             <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-widest px-2 bg-[var(--bg-tertiary)]" style={{ fontFamily: 'var(--font-display)' }}>导师心法</h3>
          </div>
          
          <div className="p-6 bg-[var(--bg-tertiary)] rounded-sm border border-[var(--border-color)] relative">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap font-medium text-[var(--text-primary)] leading-relaxed text-sm italic" style={{ fontFamily: 'inherit' }}>
                {result.suggestions}
              </p>
            </div>
            {/* 模拟印章 */}
            <div className="absolute bottom-4 right-4 w-12 h-12 border-4 border-red-800/20 rounded-full flex items-center justify-center -rotate-12 pointer-events-none">
               <span className="text-[10px] font-black text-red-800/30 uppercase">Approved</span>
            </div>
          </div>
        </motion.div>

        {/* 操作按钮 - 经典实体质感 */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="grid grid-cols-2 gap-4 pb-12"
        >
           <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 py-5 px-6 rounded-xl bg-[var(--bg-secondary)] border-2 border-[var(--text-primary)] shadow-[var(--shadow-sm)] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            <RefreshCw className="w-4 h-4 text-[var(--primary)]" />
            重新存档
          </button>
          <button
            onClick={() => alert('分享功能开发中')}
            className="flex items-center justify-center gap-2 py-5 px-6 rounded-xl bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-[var(--shadow-md)] font-bold hover:bg-black active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            <Share2 className="w-4 h-4 text-[var(--primary)]" />
            公诸于世
          </button>
        </motion.div>
      </div>
    </div>
  )
}
