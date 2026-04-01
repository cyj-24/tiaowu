from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from pathlib import Path
import base64
import io
from PIL import Image
import numpy as np

from models.pose_detector import PoseDetector
from models.person_detector import PersonDetector
from models.database import init_db
from utils.analysis import analyze_pose_difference
from api.video import router as video_router
from api.calendar import router as calendar_router

app = FastAPI(
    title="摇摆舞动作分析器 API",
    description="AI 辅助舞蹈姿态对比分析",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

# 注册API路由
app.include_router(video_router, prefix="/api", tags=["video"])
app.include_router(calendar_router, prefix="/api", tags=["calendar"])

# 初始化数据库
init_db()

# 初始化模型
pose_detector = PoseDetector()
person_detector = PersonDetector()

@app.get("/")
async def root():
    return {"message": "摇摆舞动作分析器 API", "version": "1.0.0"}

@app.post("/api/detect")
async def detect_persons(data: dict):
    """检测图片中的人物"""
    try:
        image_base64 = data.get("image", "")
        if not image_base64:
            raise HTTPException(status_code=400, detail="No image provided")

        image_data = base64.b64decode(image_base64.split(",")[-1])
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)

        persons = person_detector.detect(image_array)
        return persons

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze")
async def analyze_poses(data: dict):
    """分析两张图片的姿态差异"""
    try:
        image1_base64 = data.get("image1", "")
        image2_base64 = data.get("image2", "")
        person1_id = data.get("person1_id", 0)
        person2_id = data.get("person2_id", 0)

        if not image1_base64 or not image2_base64:
            raise HTTPException(status_code=400, detail="Both images are required")

        img1_data = base64.b64decode(image1_base64.split(",")[-1])
        img2_data = base64.b64decode(image2_base64.split(",")[-1])

        img1 = Image.open(io.BytesIO(img1_data))
        img2 = Image.open(io.BytesIO(img2_data))

        img1 = img1.convert('RGB')
        img2 = img2.convert('RGB')

        img1_array = np.array(img1)
        img2_array = np.array(img2)

        persons1 = person_detector.detect(img1_array)
        persons2 = person_detector.detect(img2_array)

        person1 = next((p for p in persons1 if p["id"] == person1_id), persons1[0] if persons1 else None)
        person2 = next((p for p in persons2 if p["id"] == person2_id), persons2[0] if persons2 else None)

        def crop_person_region(image, bbox, padding=0.3):
            import cv2
            x, y, w, h = bbox
            pad_x = int(w * padding)
            pad_y = int(h * padding)

            x1 = max(0, int(x) - pad_x)
            y1 = max(0, int(y) - pad_y)
            x2 = min(image.shape[1], int(x + w) + pad_x)
            y2 = min(image.shape[0], int(y + h) + pad_y)

            cropped = image[y1:y2, x1:x2]
            return cropped, (x1, y1)

        def detect_pose_with_fallback(image, bbox, full_image):
            if bbox is None:
                pose = pose_detector.detect_pose(image)
                return pose, (0, 0), image

            cropped, offset = crop_person_region(image, bbox)
            pose = pose_detector.detect_pose(cropped)

            first_kp = pose["keypoints"][0] if pose["keypoints"] else None
            is_fallback = first_kp and first_kp["x"] == 0.5 and first_kp["y"] == 0.5

            if is_fallback:
                pose = pose_detector.detect_pose(full_image)
                return pose, (0, 0), full_image

            return pose, offset, cropped

        pose1_raw, offset1, crop1 = detect_pose_with_fallback(img1_array, person1["bbox"] if person1 else None, img1_array)
        pose2_raw, offset2, crop2 = detect_pose_with_fallback(img2_array, person2["bbox"] if person2 else None, img2_array)

        def adjust_keypoints(pose, offset, img_array, crop_array):
            x_offset, y_offset = offset
            img_h, img_w = img_array.shape[:2]
            crop_h, crop_w = crop_array.shape[:2]

            for kp in pose["keypoints"]:
                kp["x"] = (kp["x"] * crop_w + x_offset) / img_w
                kp["y"] = (kp["y"] * crop_h + y_offset) / img_h

            x, y, w, h = pose["bbox"]
            pose["bbox"] = [x + x_offset, y + y_offset, w, h]

            return pose

        pose1 = adjust_keypoints(pose1_raw, offset1, img1_array, crop1)
        pose2 = adjust_keypoints(pose2_raw, offset2, img2_array, crop2)

        analysis = analyze_pose_difference(pose1, pose2, use_llm=None)

        return {
            "myPose": pose1,
            "masterPose": pose2,
            "myPersons": persons1,
            "masterPersons": persons2,
            "angleDiffs": analysis["angle_diffs"],
            "suggestions": analysis["suggestions"],
            "similarity": analysis["similarity"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "models_loaded": True}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
