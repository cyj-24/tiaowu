import { Person } from '../types'
import { Users, Check } from 'lucide-react'

interface PersonSelectorProps {
  persons: Person[]
  selected: number | null
  onSelect: (id: number) => void
  label: string
}

export default function PersonSelector({ persons, selected, onSelect, label }: PersonSelectorProps) {
  if (persons.length === 0) return null

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#007AFF]" />
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">{label}</span>
        </div>
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
          已识别 {persons.length} 人
        </span>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        {persons.map((person) => (
          <button
            key={person.id}
            onClick={() => onSelect(person.id)}
            className={`
              px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300
              flex items-center gap-2 border
              ${selected === person.id
                ? 'bg-[#1C1C1E] text-white border-[#1C1C1E] shadow-md scale-[1.02]'
                : 'bg-white text-[var(--text-secondary)] border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
              }
            `}
          >
            <span>舞者 {person.id + 1}</span>
            {selected === person.id && (
              <div className="w-4 h-4 rounded-full bg-[#007AFF] flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {persons.length > 1 && (
        <div className="mt-4 p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-3">
          <span className="text-sm">💡</span>
          <p className="text-[11px] leading-relaxed text-[#007AFF] font-medium">
            检测到多位舞者，如果分析结果不准确，请尝试切换至其他识别结果。
          </p>
        </div>
      )}
    </div>
  )
}
