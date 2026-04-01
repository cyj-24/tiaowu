import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnalysisResult } from '../types'
import PoseCanvas from '../components/PoseCanvas'
import { ChevronLeft, Share2, RefreshCw, Target, Activity, TrendingUp } from 'lucide-react'

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
    if (score >= 80) return { color: 'text-emerald-400', bg: 'bg-emerald-500', label: '非常棒！', gradient: 'from-emerald-500 to-teal-400' }
    if (score >= 60) return { color: 'text-amber-400', bg: 'bg-amber-500', label: '还不错', gradient: 'from-amber-500 to-orange-400' }
    return { color: 'text-rose-400', bg: 'bg-rose-500', label: '继续加油', gradient: 'from-rose-500 to-pink-400' }
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
      {/* 顶部渐变 */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-orange-500/10 via-purple-500/5 to-transparent pointer-events-none" />

      {/* 导航栏 */}
      <header className="navbar">
        <button onClick={onBack} className="navbar-back">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="navbar-title">分析结果</h1>
        <button className="navbar-back">
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <div className="pt-[calc(var(--navbar-height)+var(--safe-top)+16px)] px-6">
        {/* 相似度卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 mb-6 relative overflow-hidden"
        >
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-full blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm mb-1">动作相似度</p>
              <div className={`text-5xl font-bold ${scoreInfo.color} mb-1`}>
                {result.similarity.toFixed(0)}%
              </div>
              <p className={`text-sm font-medium bg-gradient-to-r ${scoreInfo.gradient} bg-clip-text text-transparent`}>
                {scoreInfo.label}
              </p>
            </div>

            {/* 环形进度 */}
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="56"
                  cy="56"
                  r="52"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ strokeDasharray: circumference }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-6 h-6 text-white/30" />
              </div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-6">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${scoreInfo.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${result.similarity}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
          </div>
        </motion.div>

        {/* 主要差异 */}
        {sortedDiffs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-white">主要差异</h3>
            </div>

            <div className="space-y-3">
              {sortedDiffs.map(([key, value], index) => {
                const numValue = value as number
                const severity = Math.abs(numValue) > 20 ? '高' : Math.abs(numValue) > 10 ? '中' : '低'
                const severityColor = Math.abs(numValue) > 20 ? 'text-rose-400' : Math.abs(numValue) > 10 ? 'text-amber-400' : 'text-blue-400'

                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold ${severityColor}`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{angleNames[key] || key}</p>
                        <p className={`text-xs ${severityColor}`}>差异{severity}</p>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${numValue > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                      {numValue > 0 ? '+' : ''}{numValue.toFixed(1)}°
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* 对比视图 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden mb-6"
        >
          <div className="p-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-white">姿态对比</h3>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 我的姿态 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-white/80">我的姿态</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black/50">
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
              </div>
            </div>

            {/* 对比姿态 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-sm text-white/80">对比姿态</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black/50">
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
              </div>
            </div>
          </div>

          {/* 控制选项 */}
          <div className="p-4 border-t border-[var(--border-color)] space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-white/70 text-sm">显示关键点</span>
              <div className="switch">
                <input
                  type="checkbox"
                  checked={showKeypoints}
                  onChange={(e) => setShowKeypoints(e.target.checked)}
                />
                <span className="switch-slider" />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-white/70 text-sm">显示骨架连线</span>
              <div className="switch">
                <input
                  type="checkbox"
                  checked={showConnections}
                  onChange={(e) => setShowConnections(e.target.checked)}
                />
                <span className="switch-slider" />
              </div>
            </label>
          </div>
        </motion.div>

        {/* AI 建议 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-5 mb-6"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-purple-500">🤖</span> AI 建议
          </h3>
          <div className="prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-white/70 leading-relaxed">
              {result.suggestions}
            </pre>
          </div>
        </motion.div>

        {/* 底部按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <button
            onClick={onBack}
            className="btn btn-primary btn-lg btn-block"
          >
            <RefreshCw className="w-5 h-5" />
            再试一次
          </button>
          <button
            onClick={() => alert('分享功能开发中')}
            className="btn btn-secondary btn-lg btn-block"
          >
            <Share2 className="w-5 h-5" />
            分享结果
          </button>
        </motion.div>
      </div>
    </div>
  )
}
