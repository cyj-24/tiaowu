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
      const maxWidth = canvas.parentElement?.clientWidth || 340
      const scale = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = img.height * scale

      // 绘制图片
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // 绘制人物边界框
      persons.forEach((person) => {
        const [x, y, w, h] = person.bbox
        const isSelected = person.id === selectedPerson

        ctx.strokeStyle = isSelected ? '#007AFF' : '#8E8E93'
        ctx.lineWidth = isSelected ? 3 : 2

        ctx.strokeRect(
          x * scale,
          y * scale,
          w * scale,
          h * scale
        )

        // 绘制标签背景
        const label = `舞者 ${person.id + 1}`
        ctx.font = 'bold 12px -apple-system, sans-serif'
        const textWidth = ctx.measureText(label).width

        ctx.fillStyle = isSelected ? '#007AFF' : '#8E8E93'
        ctx.fillRect(
          x * scale,
          y * scale - 20,
          textWidth + 8,
          20
        )

        // 绘制标签文字
        ctx.fillStyle = 'white'
        ctx.fillText(label, x * scale + 4, y * scale - 6)

        // 选中标记
        if (isSelected) {
          ctx.beginPath()
          ctx.arc(
            (x + w) * scale - 12,
            y * scale + 12,
            8,
            0,
            Math.PI * 2
          )
          ctx.fillStyle = '#34C759'
          ctx.fill()
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 2
          ctx.stroke()

          // 对勾
          ctx.beginPath()
          ctx.moveTo((x + w) * scale - 16, y * scale + 12)
          ctx.lineTo((x + w) * scale - 12, y * scale + 16)
          ctx.lineTo((x + w) * scale - 8, y * scale + 8)
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      })
    }
    img.src = transformedImage
  }, [transformedImage, persons, selectedPerson])

  const handleTransform = (newImage: string, _rotation: number, _flipH: boolean, _flipV: boolean) => {
    setTransformedImage(newImage)
    if (onImageTransform) {
      onImageTransform(newImage)
    }
    setShowTransform(false)
  }

  return (
    <div className="space-y-3">
      {/* 图片预览 */}
      <div className="relative rounded-lg overflow-hidden bg-gray-100">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ display: 'block', touchAction: 'pan-y' }}
        />
        {persons.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <p className="text-white text-sm">未检测到人物</p>
          </div>
        )}
      </div>

      {/* 变换控制开关 */}
      <button
        onClick={() => setShowTransform(!showTransform)}
        className="w-full py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        {showTransform ? '隐藏角度调整' : '调整角度 / 翻转'}
      </button>

      {/* 变换控制面板 */}
      {showTransform && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <ImageTransform
            image={transformedImage}
            onTransform={handleTransform}
          />
        </div>
      )}
    </div>
  )
}
