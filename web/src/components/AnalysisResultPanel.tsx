import { motion } from 'framer-motion'
import { TrendingUp, AlertCircle, CheckCircle2, Target, Zap, Activity } from 'lucide-react'

interface Keypoint {
  name: string
  x: number
  y: number
  z?: number
}

interface PoseData {
  keypoints: Keypoint[]
  bbox: number[]
}

interface AngleDiff {
  name: string
  myAngle: number
  masterAngle: number
  diff: number
}

interface AnalysisResult {
  myPose: PoseData
  masterPose: PoseData
  angleDiffs: AngleDiff[]
  suggestions: string[]
  similarity: number
}

interface AnalysisResultPanelProps {
  result: AnalysisResult
}

export default function AnalysisResultPanel({ result }: AnalysisResultPanelProps) {
  const { similarity, angleDiffs, suggestions } = result

  // 根据相似度评分确定颜色和标签
  const getScoreInfo = (score: number) => {
    if (score >= 80) return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/30',
      label: '非常棒！',
      gradient: 'from-emerald-500 to-teal-400',
      icon: CheckCircle2
    }
    if (score >= 60) return {
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/30',
      label: '还不错',
      gradient: 'from-amber-500 to-orange-400',
      icon: Target
    }
    return {
      color: 'text-rose-400',
      bg: 'bg-rose-500/20',
      border: 'border-rose-500/30',
      label: '继续加油',
      gradient: 'from-rose-500 to-pink-400',
      icon: AlertCircle
    }
  }

  const scoreInfo = getScoreInfo(similarity)
  const ScoreIcon = scoreInfo.icon

  // 按差异大小排序，取前5个
  const topDiffs = [...angleDiffs]
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* 总评分卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card relative overflow-hidden"
      >
        {/* 背景渐变 */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${scoreInfo.gradient} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />

        <div className="p-6 relative">
          <div className="flex items-center gap-4">
            {/* 分数圆环 */}
            <div className="relative">
              <svg className="w-24 h-24 -rotate-90">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${similarity * 2.64} 264`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{Math.round(similarity)}</span>
                <span className="text-xs text-white/50">分</span>
              </div>
            </div>

            <div className="flex-1">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${scoreInfo.bg} ${scoreInfo.border} border mb-2`}>
                <ScoreIcon className={`w-4 h-4 ${scoreInfo.color}`} />
                <span className={`text-sm font-medium ${scoreInfo.color}`}>{scoreInfo.label}</span>
              </div>
              <p className="text-white/60 text-sm">
                整体姿态相似度分析，数值越高表示与参考舞姿越接近
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 角度差异分析 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-white">角度差异分析</h3>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {topDiffs.map((diff, index) => {
            const isLargeDiff = Math.abs(diff.diff) > 15
            const percentage = Math.min(100, Math.abs(diff.diff) * 2)

            return (
              <motion.div
                key={diff.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">{diff.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-xs">你的: {Math.round(diff.myAngle)}°</span>
                    <span className="text-white/40 text-xs">参考: {Math.round(diff.masterAngle)}°</span>
                    <span className={`text-sm font-medium ${isLargeDiff ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {diff.diff > 0 ? '+' : ''}{Math.round(diff.diff)}°
                    </span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.5 }}
                    className={`h-full rounded-full ${isLargeDiff ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* 改进建议 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-white">改进建议</h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{suggestion}</p>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">暂无建议，继续保持！</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* 关键要点卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {angleDiffs.filter(d => Math.abs(d.diff) < 10).length}
          </div>
          <div className="text-white/50 text-xs">合格关节点数</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {angleDiffs.filter(d => Math.abs(d.diff) > 20).length}
          </div>
          <div className="text-white/50 text-xs">需改进关节点数</div>
        </div>
      </motion.div>
    </div>
  )
}
