import { useEffect, useRef, useState } from 'react'
import { Person } from '../types'
import ImageTransform from './ImageTransform'

interface ImagePreviewProps {
  image: string
  persons: Person[]
  selectedPerson: number | null
  onImageTransform?: (transformedImage: string) => void
}

export default function ImagePreview({ image, persons, selectedPerson, onImageTransform }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showTransform, setShowTransform] = useState(false)
  const [transformedImage, setTransformedImage] = useState<string>(image)

  // 当外部图片变化时，重置变换
  useEffect(() => {
    setTransformedImage(image)
  }, [image])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // 设置 canvas 尺寸 - 移动端优化
      const containerWidth = canvas.parentElement?.clientWidth || 340
      const scale = containerWidth / img.width
      canvas.width = containerWidth
      canvas.height = img.height * scale

      // 绘制环境
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 绘制人物边界框
      persons.forEach((person) => {
        const [x, y, w, h] = person.bbox
        const isSelected = person.id === selectedPerson

        // 边界框样式
        ctx.strokeStyle = isSelected ? '#007AFF' : 'rgba(142, 142, 147, 0.5)'
        ctx.lineWidth = isSelected ? 3 : 1.5
        ctx.setLineDash(isSelected ? [] : [5, 5]) // 未选中用虚线

        // 绘制矩形
        roundRect(ctx, x * scale, y * scale, w * scale, h * scale, 8)
        ctx.stroke()
        ctx.setLineDash([])

        if (isSelected) {
          // 选中时的发光效果
          ctx.shadowBlur = 10
          ctx.shadowColor = 'rgba(0, 122, 255, 0.3)'
          ctx.stroke()
          ctx.shadowBlur = 0
        }

        // 绘制标签
        const label = `舞者 ${person.id + 1}`
        ctx.font = 'bold 11px -apple-system, sans-serif'
        const padding = 6
        const textWidth = ctx.measureText(label).width
        const labelHeight = 18

        // 标签背景
        ctx.fillStyle = isSelected ? '#007AFF' : 'rgba(142, 142, 147, 0.8)'
        roundRect(ctx, x * scale, y * scale - labelHeight - 4, textWidth + padding * 2, labelHeight, 4)
        ctx.fill()

        // 标签文字
        ctx.fillStyle = 'white'
        ctx.fillText(label, x * scale + padding, y * scale - 4 - 5)

        // 选中标记 (Checkmark)
        if (isSelected) {
          const checkX = (x + w) * scale - 12
          const checkY = y * scale + 12
          
          ctx.beginPath()
          ctx.arc(checkX, checkY, 9, 0, Math.PI * 2)
          ctx.fillStyle = '#34C759'
          ctx.fill()
          
          ctx.beginPath()
          ctx.moveTo(checkX - 4, checkY)
          ctx.lineTo(checkX - 1, checkY + 3)
          ctx.lineTo(checkX + 4, checkY - 3)
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      })
    }
    img.src = transformedImage
  }, [transformedImage, persons, selectedPerson])

  // 圆角矩形辅助函数
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2
    if (h < 2 * r) r = h / 2
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  const handleTransform = (newImage: string, _rotation: number, _flipH: boolean, _flipV: boolean) => {
    setTransformedImage(newImage)
    if (onImageTransform) {
      onImageTransform(newImage)
    }
    setShowTransform(false)
  }

  return (
    <div className="space-y-4">
      {/* 图片预览容器 */}
      <div className="relative rounded-[28px] overflow-hidden bg-[#F7F8FA] shadow-inner border border-gray-100">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ display: 'block', touchAction: 'pan-y' }}
        />
        {persons.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
            <div className="bg-white/80 px-4 py-2 rounded-full shadow-sm">
              <p className="text-[#8E8E93] text-xs font-semibold">🔍 未检测到人物</p>
            </div>
          </div>
        )}
      </div>

      {/* 变换控制开关 */}
      <button
        onClick={() => setShowTransform(!showTransform)}
        className={`w-full py-3 text-xs font-bold uppercase tracking-widest rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
          showTransform 
            ? 'bg-[#1C1C1E] text-white' 
            : 'bg-white text-[#007AFF] shadow-sm border border-gray-50 active:scale-[0.98]'
        }`}
      >
        <span>{showTransform ? '收起调整' : '角度 / 翻转调整'}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-300 ${showTransform ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 变换控制面板 */}
      {showTransform && (
        <div className="p-5 bg-white rounded-[24px] shadow-sm border border-gray-50 animate-slide-up">
          <ImageTransform
            image={transformedImage}
            onTransform={handleTransform}
          />
        </div>
      )}
    </div>
  )
}
