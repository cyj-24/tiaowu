import { useState } from 'react'

interface AnalysisPanelProps {
  angleDiffs: Record<string, number>
  suggestions: string
}

const ANGLE_NAMES: Record<string, { name: string; icon: string }> = {
  leftShoulderAngle: { name: '左肩角度', icon: '💪' },
  rightShoulderAngle: { name: '右肩角度', icon: '💪' },
  leftElbowAngle: { name: '左肘角度', icon: '🦾' },
  rightElbowAngle: { name: '右肘角度', icon: '🦾' },
  leftHipAngle: { name: '左髋角度', icon: '🦵' },
  rightHipAngle: { name: '右髋角度', icon: '🦵' },
  leftKneeAngle: { name: '左膝角度', icon: '🦶' },
  rightKneeAngle: { name: '右膝角度', icon: '🦶' },
  torsoAngle: { name: '躯干角度', icon: '🧍' },
}

export default function AnalysisPanel({ angleDiffs, suggestions }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<'angles' | 'suggestions'>('angles')

  // 按差异大小排序
  const sortedAngles = Object.entries(angleDiffs)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))

  return (
    <div className="ios-card overflow-hidden">
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('angles')}
          className={`
            flex-1 py-3 text-sm font-medium transition-colors
            ${activeTab === 'angles'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500'
            }
          `}
        >
          角度对比
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`
            flex-1 py-3 text-sm font-medium transition-colors
            ${activeTab === 'suggestions'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500'
            }
          `}
        >
          AI 建议
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'angles' ? (
          <div className="space-y-3">
            {sortedAngles.map(([key, diff]) => {
              const absDiff = Math.abs(diff)
              const isSignificant = absDiff > 15
              const info = ANGLE_NAMES[key] || { name: key, icon: '📐' }

              return (
                <div
                  key={key}
                  className={`
                    p-3 rounded-xl
                    ${isSignificant ? 'bg-orange-50' : 'bg-gray-50'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <span>{info.icon}</span>
                      <span className="font-medium">{info.name}</span>
                    </span>
                    <span className={`
                      text-base font-bold
                      ${diff > 0 ? 'text-red-500' : 'text-blue-500'}
                    `}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}°
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isSignificant ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{
                        width: `${Math.min(absDiff / 30 * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* AI 建议 */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">💡</span>
                <h4 className="font-semibold text-gray-900">改进建议</h4>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {suggestions.split('\n').map((paragraph, index) => {
                  if (!paragraph.trim()) return null
                  if (paragraph.startsWith('•')) {
                    return (
                      <p key={index} className="pl-2">
                        {paragraph}
                      </p>
                    )
                  }
                  if (paragraph.match(/^\d+\./)) {
                    return (
                      <p key={index} className="font-medium text-gray-900">
                        {paragraph}
                      </p>
                    )
                  }
                  return <p key={index}>{paragraph}</p>
                })}
              </div>
            </div>

            {/* 要点总结 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '✅', title: '优点', text: '整体协调' },
                { icon: '⚠️', title: '注意', text: sortedAngles[0] ? ANGLE_NAMES[sortedAngles[0][0]]?.name.replace('角度', '') || '关键角度' : '继续练习' },
                { icon: '🎯', title: '目标', text: '培养记忆' },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-xl mb-1">{item.icon}</div>
                  <p className="text-xs font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
