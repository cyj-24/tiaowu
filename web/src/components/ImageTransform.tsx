import { useState, useCallback } from 'react'

interface ImageTransformProps {
  image: string
  onTransform: (transformedImage: string, rotation: number, flipH: boolean, flipV: boolean) => void
}

export default function ImageTransform({ image, onTransform }: ImageTransformProps) {
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false) // 水平翻转
  const [flipV, setFlipV] = useState(false) // 垂直翻转

  const applyTransform = useCallback(() => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      // 根据旋转角度设置画布尺寸
      if (rotation === 90 || rotation === 270) {
        canvas.width = img.height
        canvas.height = img.width
      } else {
        canvas.width = img.width
        canvas.height = img.height
      }

      // 保存上下文
      ctx.save()

      // 移动到画布中心
      ctx.translate(canvas.width / 2, canvas.height / 2)

      // 应用旋转
      ctx.rotate((rotation * Math.PI) / 180)

      // 应用翻转
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)

      // 绘制图片（居中）
      ctx.drawImage(
        img,
        -img.width / 2,
        -img.height / 2
      )

      ctx.restore()

      // 转换为base64
      const transformedImage = canvas.toDataURL('image/jpeg', 0.95)
      onTransform(transformedImage, rotation, flipH, flipV)
    }
    img.src = image
  }, [image, rotation, flipH, flipV, onTransform])

  const rotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360)
  }

  const rotateRight = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const toggleFlipH = () => {
    setFlipH((prev) => !prev)
  }

  const toggleFlipV = () => {
    setFlipV((prev) => !prev)
  }

  const reset = () => {
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
  }

  return (
    <div className="space-y-3">
      {/* 变换按钮组 */}
      <div className="flex flex-wrap gap-2 justify-center">
        {/* 左旋转 */}
        <button
          onClick={rotateLeft}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          title="向左旋转"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          左转
        </button>

        {/* 右旋转 */}
        <button
          onClick={rotateRight}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          title="向右旋转"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
          右转
        </button>

        {/* 水平翻转 */}
        <button
          onClick={toggleFlipH}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
            flipH ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title="水平翻转"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          左右
        </button>

        {/* 垂直翻转 */}
        <button
          onClick={toggleFlipV}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
            flipV ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title="垂直翻转"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          上下
        </button>

        {/* 重置 */}
        <button
          onClick={reset}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          title="重置"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          重置
        </button>
      </div>

      {/* 当前状态 */}
      <div className="text-center text-xs text-gray-500">
        旋转: {rotation}° | 左右: {flipH ? '翻转' : '正常'} | 上下: {flipV ? '翻转' : '正常'}
      </div>

      {/* 应用按钮 */}
      <button
        onClick={applyTransform}
        className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
      >
        应用变换
      </button>

      {/* 预览（可选） */}
      {(rotation !== 0 || flipH || flipV) && (
        <div className="text-xs text-orange-500 text-center">
          💡 点击"应用变换"后，将使用调整后的图片进行分析
        </div>
      )}
    </div>
  )
}
