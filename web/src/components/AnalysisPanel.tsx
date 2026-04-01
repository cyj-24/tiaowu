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
    <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100/50">
      {/* Tab 切换 - 极简药丸风格 */}
      <div className="p-2 flex bg-gray-50/50 m-4 rounded-2xl border border-gray-100">
        <button
          onClick={() => setActiveTab('angles')}
          className={`
            flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-300
            ${activeTab === 'angles'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
            }
          `}
        >
          角度对比
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`
            flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-300
            ${activeTab === 'suggestions'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'
            }
          `}
        >
          AI 建议分析
        </button>
      </div>

      <div className="px-6 pb-6">
        {activeTab === 'angles' ? (
          <div className="space-y-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-2">关节活动度差异</p>
            {sortedAngles.map(([key, diff]) => {
              const absDiff = Math.abs(diff)
              const isSignificant = absDiff > 15
              const info = ANGLE_NAMES[key] || { name: key, icon: '📐' }

              return (
                <div
                  key={key}
                  className="group"
                >
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-sm border ${isSignificant ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                        {info.icon}
                      </div>
                      <span className="text-[14px] font-bold text-gray-800">{info.name}</span>
                    </span>
                    <div className="flex flex-col items-end">
                      <span className={`
                        text-base font-black leading-none
                        ${diff > 0 ? 'text-rose-500' : 'text-blue-500'}
                      `}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}°
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isSignificant ? 'bg-gradient-to-r from-orange-400 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
                      style={{
                        width: `${Math.min(absDiff / 45 * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI 建议卡片 */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-6 border border-blue-100/50 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-blue-50">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 leading-tight">大师级改进意见</h4>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">AI ANALYSIS REPORT</p>
                </div>
              </div>
              
              <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                {suggestions.split('\n').map((paragraph, index) => {
                  if (!paragraph.trim()) return null
                  const isPositive = paragraph.includes('棒') || paragraph.includes('好') || paragraph.includes('准确')
                  
                  return (
                    <div key={index} className={`flex gap-3 ${paragraph.match(/^\d+\./) ? 'pt-2' : ''}`}>
                      {paragraph.match(/^\d+\./) && (
                        <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5 shadow-md shadow-blue-200">
                          {paragraph.split('.')[0]}
                        </div>
                      )}
                      <p className={paragraph.match(/^\d+\./) ? 'font-black text-gray-900 text-sm' : ''}>
                        {paragraph.match(/^\d+\./) ? paragraph.split('.').slice(1).join('.').trim() : paragraph}
                        {isPositive && <span className="ml-1 text-green-500">🏆</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 要点总结 - 简洁健身卡片 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '✅', title: '优点', text: '体态平稳', color: 'bg-green-50 text-green-600 border-green-100/50' },
                { icon: '⚠️', title: '提升', text: sortedAngles[0] ? ANGLE_NAMES[sortedAngles[0][0]]?.name.replace('角度', '') : '核心收紧', color: 'bg-orange-50 text-orange-600 border-orange-100/50' },
                { icon: '🎯', title: '挑战', text: '相似度 85%', color: 'bg-blue-50 text-blue-600 border-blue-100/50' },
              ].map((item, i) => (
                <div key={i} className={`rounded-2xl p-3 text-center border shadow-sm ${item.color}`}>
                  <div className="text-xl mb-1.5">{item.icon}</div>
                  <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">{item.title}</p>
                  <p className="text-[11px] font-black leading-tight mt-1 truncate">{item.text}</p>
                </div>
              ))}
            </div>
            
            <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-gray-100 group flex items-center justify-center gap-2">
              保存分析到成长日记
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
