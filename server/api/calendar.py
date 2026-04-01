"""
跳舞日历 API
"""

import os
import shutil
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, DanceRecord

router = APIRouter()

# 存储路径
DATA_DIR = os.path.join(os.path.dirname(__file__), '../data')
VIDEO_DIR = os.path.join(DATA_DIR, 'videos')
THUMBNAIL_DIR = os.path.join(DATA_DIR, 'thumbnails')

os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)


# Pydantic 模型
class DanceRecordCreate(BaseModel):
    notes: Optional[str] = None
    style: Optional[str] = None
    song_name: Optional[str] = None
    mood: Optional[str] = None


class DanceRecordResponse(BaseModel):
    id: int
    date: str
    video_path: Optional[str]
    thumbnail_path: Optional[str]
    duration: Optional[float]
    notes: Optional[str]
    style: Optional[str]
    song_name: Optional[str]
    mood: Optional[str]

    class Config:
        from_attributes = True


@router.post("/calendar/records", response_model=DanceRecordResponse)
async def create_record(
    video: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    style: Optional[str] = Form(None),
    song_name: Optional[str] = Form(None),
    mood: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    创建新的跳舞记录
    """
    try:
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_filename = f"dance_{timestamp}_{video.filename}"
        video_path = os.path.join(VIDEO_DIR, video_filename)

        # 保存视频文件
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        # 提取视频信息（使用 OpenCV）
        import cv2
        cap = cv2.VideoCapture(video_path)
        duration = 0
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0

            # 提取第一帧作为缩略图
            ret, frame = cap.read()
            if ret:
                thumbnail_filename = f"thumb_{timestamp}.jpg"
                thumbnail_path = os.path.join(THUMBNAIL_DIR, thumbnail_filename)
                cv2.imwrite(thumbnail_path, frame)
            else:
                thumbnail_path = None
            cap.release()

        # 创建数据库记录
        db_record = DanceRecord(
            date=datetime.now(),
            video_path=video_path,
            thumbnail_path=thumbnail_path,
            duration=duration,
            notes=notes,
            style=style,
            song_name=song_name,
            mood=mood
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)

        return {
            "id": db_record.id,
            "date": db_record.date.isoformat(),
            "video_path": db_record.video_path,
            "thumbnail_path": db_record.thumbnail_path,
            "duration": db_record.duration,
            "notes": db_record.notes,
            "style": db_record.style,
            "song_name": db_record.song_name,
            "mood": db_record.mood
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar/records", response_model=List[DanceRecordResponse])
async def get_records(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    获取跳舞记录列表
    支持按年月筛选
    """
    query = db.query(DanceRecord)

    if year and month:
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        query = query.filter(DanceRecord.date >= start_date, DanceRecord.date < end_date)

    records = query.order_by(DanceRecord.date.desc()).all()

    return [
        {
            "id": r.id,
            "date": r.date.isoformat(),
            "video_path": r.video_path,
            "thumbnail_path": r.thumbnail_path,
            "duration": r.duration,
            "notes": r.notes,
            "style": r.style,
            "song_name": r.song_name,
            "mood": r.mood
        }
        for r in records
    ]


@router.get("/calendar/records/{record_id}", response_model=DanceRecordResponse)
async def get_record(record_id: int, db: Session = Depends(get_db)):
    """
    获取单个记录详情
    """
    record = db.query(DanceRecord).filter(DanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    return {
        "id": record.id,
        "date": record.date.isoformat(),
        "video_path": record.video_path,
        "thumbnail_path": record.thumbnail_path,
        "duration": record.duration,
        "notes": record.notes,
        "style": record.style,
        "song_name": record.song_name,
        "mood": record.mood
    }


@router.delete("/calendar/records/{record_id}")
async def delete_record(record_id: int, db: Session = Depends(get_db)):
    """
    删除记录
    """
    record = db.query(DanceRecord).filter(DanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    # 删除文件
    try:
        if record.video_path and os.path.exists(record.video_path):
            os.remove(record.video_path)
        if record.thumbnail_path and os.path.exists(record.thumbnail_path):
            os.remove(record.thumbnail_path)
    except:
        pass

    db.delete(record)
    db.commit()

    return {"success": True, "message": "记录已删除"}


@router.get("/calendar/stats")
async def get_calendar_stats(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    获取日历统计数据
    """
    now = datetime.now()
    year = year or now.year
    month = month or now.month

    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    records = db.query(DanceRecord).filter(
        DanceRecord.date >= start_date,
        DanceRecord.date < end_date
    ).all()

    # 按日期分组
    days_with_records = {}
    total_duration = 0
    style_count = {}

    for r in records:
        day = r.date.day
        if day not in days_with_records:
            days_with_records[day] = []
        days_with_records[day].append(r.id)

        if r.duration:
            total_duration += r.duration

        if r.style:
            style_count[r.style] = style_count.get(r.style, 0) + 1

    return {
        "year": year,
        "month": month,
        "total_records": len(records),
        "total_duration": round(total_duration, 2),
        "days_with_records": days_with_records,
        "style_distribution": style_count,
        "active_days": len(days_with_records)
    }


@router.get("/calendar/thumbnail/{record_id}")
async def get_thumbnail(record_id: int, db: Session = Depends(get_db)):
    """
    获取缩略图
    """
    record = db.query(DanceRecord).filter(DanceRecord.id == record_id).first()
    if not record or not record.thumbnail_path:
        raise HTTPException(status_code=404, detail="缩略图不存在")

    if not os.path.exists(record.thumbnail_path):
        raise HTTPException(status_code=404, detail="缩略图文件不存在")

    return FileResponse(record.thumbnail_path)


@router.get("/calendar/video/{record_id}")
async def get_video(record_id: int, db: Session = Depends(get_db)):
    """
    获取视频文件
    """
    record = db.query(DanceRecord).filter(DanceRecord.id == record_id).first()
    if not record or not record.video_path:
        raise HTTPException(status_code=404, detail="视频不存在")

    if not os.path.exists(record.video_path):
        raise HTTPException(status_code=404, detail="视频文件不存在")

    return FileResponse(record.video_path, media_type="video/mp4")
