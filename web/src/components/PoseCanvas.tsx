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
  [11, 12], // 肩膀
  [11, 13], [13, 15], // 左臂
  [12, 14], [14, 16], // 右臂
  [11, 23], [12, 24], // 躯干
  [23, 24], // 髋部
  [23, 25], [25, 27], // 左腿
  [24, 26], [26, 28], // 右腿
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
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (mode === 'overlay') {
        ctx.globalAlpha = 1
        ctx.drawImage(myImg, 0, 0, canvas.width, canvas.height)

        ctx.globalAlpha = overlayOpacity
        ctx.drawImage(masterImg, 0, 0, canvas.width, canvas.height)

        ctx.globalAlpha = 1
        // 我的姿态使用专业蓝
        drawPose(ctx, myPose, '#007AFF', canvas.width, canvas.height) 
        // 大师姿态使用活力红或对比绿
        drawPose(ctx, masterPose, '#FF3B30', canvas.width, canvas.height) 
      } else if (mode === 'myOnly') {
        ctx.drawImage(myImg, 0, 0, canvas.width, canvas.height)
        drawPose(ctx, myPose, '#007AFF', canvas.width, canvas.height)
      } else {
        ctx.drawImage(masterImg, 0, 0, canvas.width, canvas.height)
        drawPose(ctx, masterPose, '#34C759', canvas.width, canvas.height) // 单独展示大师用绿色
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

      // 绘制骨骼连线
      if (showConnections) {
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        
        POSE_CONNECTIONS.forEach(([start, end]) => {
          const kp1 = keypoints[start]
          const kp2 = keypoints[end]

          if (kp1?.visibility >= 0.5 && kp2?.visibility >= 0.5) {
            // 背景发光/描边效果，提升深浅图对比度
            ctx.beginPath()
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 6
            ctx.globalAlpha = 0.4
            ctx.moveTo(kp1.x * width, kp1.y * height)
            ctx.lineTo(kp2.x * width, kp2.y * height)
            ctx.stroke()

            // 核心线条
            ctx.beginPath()
            ctx.strokeStyle = color
            ctx.lineWidth = 3
            ctx.globalAlpha = 1
            ctx.moveTo(kp1.x * width, kp1.y * height)
            ctx.lineTo(kp2.x * width, kp2.y * height)
            ctx.stroke()
          }
        })
      }

      // 绘制关键节点
      if (showKeypoints) {
        keypoints.forEach((kp) => {
          if (kp?.visibility >= 0.5) {
            // 外圈阴影
            ctx.beginPath()
            ctx.arc(kp.x * width, kp.y * height, 6, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255,255,255,0.8)'
            ctx.fill()

            // 节点核心
            ctx.beginPath()
            ctx.arc(kp.x * width, kp.y * height, 4, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
            
            // 高光白心
            ctx.beginPath()
            ctx.arc(kp.x * width, kp.y * height, 1.5, 0, Math.PI * 2)
            ctx.fillStyle = 'white'
            ctx.fill()
          }
        })
      }
    }

    let loadedCount = 0
    const onLoad = () => {
      loadedCount++
      if (loadedCount === 2) {
        let targetImg = mode === 'masterOnly' ? masterImg : myImg
        const aspectRatio = targetImg.width / targetImg.height
        const containerWidth = canvas.parentElement?.clientWidth || 600
        const maxHeight = 500

        let drawWidth = containerWidth
        let drawHeight = drawWidth / aspectRatio

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
      className="w-full h-auto transition-all duration-500"
      style={{ touchAction: 'pan-y' }}
    />
  )
}
