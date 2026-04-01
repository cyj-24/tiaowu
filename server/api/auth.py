"""
用户认证 - 简化版手机号登录
生产环境建议接入：微信登录、手机号+验证码
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from models.database_v2 import get_db, User

router = APIRouter()

# 模拟验证码存储（生产用Redis）
verify_code_cache = {}


class PhoneLoginRequest(BaseModel):
    phone: str
    code: str  # 验证码


class UserResponse(BaseModel):
    id: int
    phone: str
    nickname: str
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


@router.post("/auth/send-code")
async def send_verify_code(phone: str):
    """发送验证码（开发环境固定1234）"""
    # 生产环境接入短信服务（阿里云/腾讯云）
    # 这里模拟，实际发送1234
    verify_code_cache[phone] = "1234"
    return {"success": True, "message": "验证码已发送（开发环境: 1234）"}


@router.post("/auth/login", response_model=UserResponse)
async def phone_login(data: PhoneLoginRequest, db: Session = Depends(get_db)):
    """手机号+验证码登录"""
    # 验证验证码（开发环境跳过）
    if data.code != "1234" and verify_code_cache.get(data.phone) != data.code:
        raise HTTPException(status_code=400, detail="验证码错误")

    # 查找或创建用户
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user:
        user = User(phone=data.phone, nickname=f"舞者{data.phone[-4:]}")
        db.add(user)
        db.commit()
        db.refresh(user)

    # 清除验证码
    verify_code_cache.pop(data.phone, None)

    return user


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user(
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """获取当前用户信息"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="未登录")

    user = db.query(User).filter(User.id == int(x_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return user


# 依赖注入用
def get_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    """从Header获取用户ID"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="请先登录")
    return int(x_user_id)
