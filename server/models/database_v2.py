"""
多用户版本数据库模型
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

Base = declarative_base()

# 使用环境变量或配置文件
DB_PATH = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.dirname(__file__)}/../data/swing_dance.db')

if DB_PATH.startswith('sqlite'):
    engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
else:
    # PostgreSQL / MySQL
    engine = create_engine(DB_PATH)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True)  # 手机号登录
    email = Column(String(100), unique=True, nullable=True)
    nickname = Column(String(50), default="摇摆舞者")
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    last_login = Column(DateTime, default=datetime.now)

    # 关联
    records = relationship("DanceRecord", back_populates="user", cascade="all, delete-orphan")


class DanceRecord(Base):
    """跳舞记录表 - 多用户版本"""
    __tablename__ = "dance_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    date = Column(DateTime, default=datetime.now, index=True)
    video_url = Column(String(500))  # 改为URL（OSS地址）
    thumbnail_url = Column(String(500))  # 缩略图URL
    duration = Column(Float)
    notes = Column(Text)
    style = Column(String(50))
    song_name = Column(String(200))
    mood = Column(String(50))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关联
    user = relationship("User", back_populates="records")

    # 索引优化查询
    __table_args__ = (
        Index('idx_user_date', 'user_id', 'date'),
    )


def init_db():
    """初始化数据库"""
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized: {DB_PATH}")


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
