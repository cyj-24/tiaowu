import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Target, Zap, Activity, ChevronRight } from 'lucide-react'

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

  // 根据相似度评分确定颜色和标签 - 健身极简风
  const getScoreInfo = (score: number) => {
    if (score >= 80) return {
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100/50',
      label: '非常棒！完美匹配',
      icon: CheckCircle2,
      tag: 'MASTER'
    }
    if (score >= 60) return {
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-100/50',
      label: '还不错，继续保持',
      icon: Target,
      tag: 'ADVANCED'
    }
    return {
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      border: 'border-orange-100/50',
      label: '加油，找到感觉了',
      icon: AlertCircle,
      tag: 'BEGINNER'
    }
  }

  const scoreInfo = getScoreInfo(similarity)
  const ScoreIcon = scoreInfo.icon

  // 按差异大小排序，取前4个
  const topDiffs = [...angleDiffs]
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 4)

  return (
    <div className="space-y-7 pb-10">
      {/* 核心总评分卡片 - 极简大气风 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] p-8 shadow-[0_15px_50px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden"
      >
        <div className="flex flex-col items-center relative z-10 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-[22px] flex items-center justify-center mb-6 shadow-inner border border-gray-100">
            <ScoreIcon className={`w-8 h-8 ${scoreInfo.color}`} />
          </div>
          <div className="relative mb-4">
            <span className="text-[72px] font-black leading-none tracking-tighter text-gray-900">{Math.round(similarity)}</span>
            <span className="absolute -top-1 -right-6 text-xl font-black text-gray-400">%</span>
          </div>
          <div className={`px-6 py-2 rounded-2xl ${scoreInfo.bg} ${scoreInfo.color} font-black text-sm mb-4 shadow-sm border ${scoreInfo.border}`}>
            {scoreInfo.label}
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Overall Similarity Score</p>
        </div>
        
        {/* 背景装饰纹理 */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl opacity-50" />
      </motion.div>

      {/* 详细数据指标 - 关键关节点 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[17px] font-black text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-900" />
            关键指标分析
          </h3>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOP DEVIATIONS</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {topDiffs.map((diff, index) => {
            const isLargeDiff = Math.abs(diff.diff) > 15
            const percentage = Math.min(100, Math.abs(diff.diff) * 2)

            return (
              <motion.div
                key={diff.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50/50 flex flex-col gap-3 group hover:border-gray-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isLargeDiff ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                    <span className="text-[15px] font-bold text-gray-800">{diff.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[17px] font-black ${isLargeDiff ? 'text-orange-500' : 'text-emerald-500'}`}>
                      {diff.diff > 0 ? '+' : ''}{Math.round(diff.diff)}°
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2.5 bg-gray-50 rounded-full overflow-hidden shadow-inner border border-gray-100/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={`h-full rounded-full ${isLargeDiff ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-black text-gray-400">
                      REF: {Math.round(diff.masterAngle)}°
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* AI 智能教练建议 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[17px] font-black text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-gray-900" />
            AI 智能教练
          </h3>
        </div>

        <div className="bg-gray-900 rounded-[32px] p-7 shadow-2xl shadow-gray-200 relative overflow-hidden">
          <div className="space-y-5 relative z-10">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-4"
                >
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/5 shadow-sm">
                    <span className="text-white text-[11px] font-black">{index + 1}</span>
                  </div>
                  <p className="text-white/80 text-[14px] leading-relaxed font-medium">{suggestion}</p>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-white/40 font-bold">完美表现，暂无改进建议 ✨</p>
              </div>
            )}
          </div>
          {/* 背景装饰线 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
      </section>

      {/* 关键统计 */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '稳定节点', value: angleDiffs.filter(d => Math.abs(d.diff) < 12).length, icon: '💪', color: 'text-emerald-500' },
          { label: '偏差节点', value: angleDiffs.filter(d => Math.abs(d.diff) > 20).length, icon: '⚠️', color: 'text-orange-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100/50 flex flex-col items-center">
            <span className="text-2xl mb-2">{stat.icon}</span>
            <span className="text-2xl font-black text-gray-900 mb-1">{stat.value}</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
          </div>
        ))}
      </div>
      
      <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-gray-100 group flex items-center justify-center gap-2 mt-4">
        查看完整分析报告
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}
