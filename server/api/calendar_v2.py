"""
多用户日历 API - 云存储版本
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database_v2 import get_db, DanceRecord
from utils.storage import storage
from api.auth import get_user_id

router = APIRouter()


# ============ 请求/响应模型 ============

class DanceRecordCreate(BaseModel):
    notes: Optional[str] = None
    style: Optional[str] = None
    song_name: Optional[str] = None
    mood: Optional[str] = None


class DanceRecordResponse(BaseModel):
    id: int
    user_id: int
    date: str
    video_url: Optional[str]
    thumbnail_url: Optional[str]
    duration: Optional[float]
    notes: Optional[str]
    style: Optional[str]
    song_name: Optional[str]
    mood: Optional[str]

    class Config:
        from_attributes = True


# ============ API 路由 ============

@router.post("/calendar/records", response_model=DanceRecordResponse)
async def create_record(
    video: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    style: Optional[str] = Form(None),
    song_name: Optional[str] = Form(None),
    mood: Optional[str] = Form(None),
    user_id: int = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """
    创建新的跳舞记录（上传到云存储）
    """
    try:
        # 读取视频文件
        video_data = await video.read()

        # 上传到云存储
        video_url = storage.upload_video(video_data, user_id, video.filename)

        # 提取缩略图（简化版，实际可用FFmpeg提取第一帧）
        # 这里先用视频URL作为缩略图占位
        thumbnail_url = video_url  # 实际应生成缩略图上传

        # 创建数据库记录
        db_record = DanceRecord(
            user_id=user_id,
            date=datetime.now(),
            video_url=video_url,
            thumbnail_url=thumbnail_url,
            duration=0,  # 需要提取视频时长
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
            "user_id": db_record.user_id,
            "date": db_record.date.isoformat(),
            "video_url": db_record.video_url,
            "thumbnail_url": db_record.thumbnail_url,
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
    user_id: int = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的跳舞记录
    """
    query = db.query(DanceRecord).filter(DanceRecord.user_id == user_id)

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
            "user_id": r.user_id,
            "date": r.date.isoformat(),
            "video_url": r.video_url,
            "thumbnail_url": r.thumbnail_url,
            "duration": r.duration,
            "notes": r.notes,
            "style": r.style,
            "song_name": r.song_name,
            "mood": r.mood
        }
        for r in records
    ]


@router.get("/calendar/records/{record_id}", response_model=DanceRecordResponse)
async def get_record(
    record_id: int,
    user_id: int = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """
    获取单个记录（只能访问自己的）
    """
    record = db.query(DanceRecord).filter(
        DanceRecord.id == record_id,
        DanceRecord.user_id == user_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    return {
        "id": record.id,
        "user_id": record.user_id,
        "date": record.date.isoformat(),
        "video_url": record.video_url,
        "thumbnail_url": record.thumbnail_url,
        "duration": record.duration,
        "notes": record.notes,
        "style": record.style,
        "song_name": record.song_name,
        "mood": record.mood
    }


@router.delete("/calendar/records/{record_id}")
async def delete_record(
    record_id: int,
    user_id: int = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """
    删除记录（同时删除云存储文件）
    """
    record = db.query(DanceRecord).filter(
        DanceRecord.id == record_id,
        DanceRecord.user_id == user_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    # 删除云存储文件
    if record.video_url:
        storage.delete_file(record.video_url)
    if record.thumbnail_url and record.thumbnail_url != record.video_url:
        storage.delete_file(record.thumbnail_url)

    db.delete(record)
    db.commit()

    return {"success": True, "message": "记录已删除"}


@router.get("/calendar/stats")
async def get_calendar_stats(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user_id: int = Depends(get_user_id),
    db: Session = Depends(get_db)
):
    """
    获取日历统计数据（仅当前用户）
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
        DanceRecord.user_id == user_id,
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
