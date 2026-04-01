import { useEffect, useRef } from 'react'
import { PoseData } from '../types'

interface PoseCanvasProps {
  myImage: string
  masterImage: string
  myPose: PoseData
  masterPose: PoseData
  overlayOpacity: number
  showKeypoints: boolean
  showConnections: boolean
  mode: 'overlay' | 'myOnly' | 'masterOnly'
}

// MediaPipe Pose 关键点连接定义
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],  // 左脸到左耳
  [0, 4], [4, 5], [5, 6], [6, 8],  // 右脸到右耳
  [9, 10],  // 嘴巴
  [11, 12], // 肩膀
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], // 左臂
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], // 右臂
  [11, 23], [12, 24], // 躯干
  [23, 24], // 髋部
  [23, 25], [25, 27], [27, 29], [29, 31], // 左腿
  [24, 26], [26, 28], [28, 30], [30, 32], // 右腿
]

export default function PoseCanvas({
  myImage,
  masterImage,
  myPose,
  masterPose,
  overlayOpacity,
  showKeypoints,
  showConnections,
  mode
}: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const myImg = new Image()
    const masterImg = new Image()

    const draw = () => {
      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (mode === 'overlay') {
        // 叠加模式：绘制我的图片作为背景
        ctx.globalAlpha = 1
        ctx.drawImage(myImg, 0, 0, canvas.width, canvas.height)

        // 绘制大师图片叠加
        ctx.globalAlpha = overlayOpacity
        ctx.drawImage(masterImg, 0, 0, canvas.width, canvas.height)

        // 绘制姿态
        ctx.globalAlpha = 1
        drawPose(ctx, myPose, '#3b82f6', canvas.width, canvas.height) // 蓝色
        drawPose(ctx, masterPose, '#ef4444', canvas.width, canvas.height) // 红色
      } else if (mode === 'myOnly') {
        ctx.drawImage(myImg, 0, 0, canvas.width, canvas.height)
        drawPose(ctx, myPose, '#3b82f6', canvas.width, canvas.height)
      } else {
        ctx.drawImage(masterImg, 0, 0, canvas.width, canvas.height)
        drawPose(ctx, masterPose, '#ef4444', canvas.width, canvas.height)
      }
    }

    const drawPose = (
      ctx: CanvasRenderingContext2D,
      pose: PoseData,
      color: string,
      width: number,
      height: number
    ) => {
      if (!pose || !pose.keypoints) return

      const keypoints = pose.keypoints

      // 绘制连线
      if (showConnections) {
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.6

        POSE_CONNECTIONS.forEach(([start, end]) => {
          const kp1 = keypoints[start]
          const kp2 = keypoints[end]

          if (kp1.visibility >= 0.5 && kp2.visibility >= 0.5) {
            ctx.beginPath()
            ctx.moveTo(kp1.x * width, kp1.y * height)
            ctx.lineTo(kp2.x * width, kp2.y * height)
            ctx.stroke()
          }
        })
      }

      // 绘制关键点
      if (showKeypoints) {
        keypoints.forEach((kp, index) => {
          if (kp.visibility >= 0.5) {
            ctx.beginPath()
            ctx.arc(kp.x * width, kp.y * height, 5, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 2
            ctx.stroke()

            // 关键点编号（小字体）
            ctx.fillStyle = 'white'
            ctx.font = '10px sans-serif'
            ctx.fillText(String(index), kp.x * width - 3, kp.y * height - 8)
          }
        })
      }
    }

    let loadedCount = 0
    const onLoad = () => {
      loadedCount++
      if (loadedCount === 2) {
        // 两张图片都加载完成，计算合适的canvas尺寸
        let targetImg = mode === 'masterOnly' ? masterImg : myImg
        const aspectRatio = targetImg.width / targetImg.height
        const containerWidth = canvas.parentElement?.clientWidth || 600
        const maxHeight = 500

        // 根据容器宽度和最大高度计算canvas尺寸，保持原图比例
        let drawWidth = containerWidth
        let drawHeight = drawWidth / aspectRatio

        // 如果高度超过限制，按高度限制计算
        if (drawHeight > maxHeight) {
          drawHeight = maxHeight
          drawWidth = drawHeight * aspectRatio
        }

        canvas.width = drawWidth
        canvas.height = drawHeight
        draw()
      }
    }

    myImg.onload = onLoad
    masterImg.onload = onLoad
    myImg.src = myImage
    masterImg.src = masterImage

  }, [myImage, masterImage, myPose, masterPose, overlayOpacity, showKeypoints, showConnections, mode])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto rounded-lg"
      style={{ maxHeight: '600px', touchAction: 'pan-y' }}
    />
  )
}
