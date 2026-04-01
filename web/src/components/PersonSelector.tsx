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
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-orange-500" />
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-xs text-white/40">
          检测到 {persons.length} 个人物
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {persons.map((person) => (
          <button
            key={person.id}
            onClick={() => onSelect(person.id)}
            className={`
              px-4 py-2.5 rounded-full text-sm font-medium transition-all
              flex items-center gap-2
              ${selected === person.id
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }
            `}
          >
            舞者 {person.id + 1}
            {selected === person.id && (
              <Check className="w-4 h-4" />
            )}
          </button>
        ))}
      </div>

      {persons.length > 1 && (
        <p className="text-xs text-amber-400/80 mt-3 flex items-center gap-1">
          <span>💡</span>
          <span>如果分析结果异常，请尝试选择其他舞者</span>
        </p>
      )}
    </div>
  )
}
