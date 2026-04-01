"""
数据库模型 - 跳舞日历和记录管理
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

Base = declarative_base()

# 使用 SQLite 数据库
DB_PATH = os.path.join(os.path.dirname(__file__), '../data/swing_dance.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_engine(f'sqlite:///{DB_PATH}', connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class DanceRecord(Base):
    """跳舞记录表"""
    __tablename__ = "dance_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.now, index=True)
    video_path = Column(String(500))  # 视频文件路径
    thumbnail_path = Column(String(500))  # 缩略图路径
    duration = Column(Float)  # 视频时长（秒）
    notes = Column(Text)  # 心得记录
    style = Column(String(50))  # 舞种（Lindy Hop, Charleston等）
    song_name = Column(String(200))  # 歌曲名称
    mood = Column(String(50))  # 心情
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


def init_db():
    """初始化数据库"""
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized at: {DB_PATH}")


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
