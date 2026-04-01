"""
云存储工具 - 支持阿里云OSS、AWS S3、腾讯云COS
"""

import os
import uuid
from datetime import datetime
from typing import Optional
import oss2  # 阿里云OSS

# 从环境变量读取配置
OSS_ACCESS_KEY_ID = os.environ.get('OSS_ACCESS_KEY_ID')
OSS_ACCESS_KEY_SECRET = os.environ.get('OSS_ACCESS_KEY_SECRET')
OSS_BUCKET_NAME = os.environ.get('OSS_BUCKET_NAME')
OSS_ENDPOINT = os.environ.get('OSS_ENDPOINT', 'oss-cn-beijing.aliyuncs.com')
OSS_DOMAIN = os.environ.get('OSS_DOMAIN')  # CDN域名，可选


class CloudStorage:
    """云存储客户端"""

    def __init__(self):
        self.bucket = None
        if OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET:
            auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
            self.bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET_NAME)

    def upload_video(self, file_data: bytes, user_id: int, filename: str) -> str:
        """
        上传视频到云存储
        路径格式: videos/{user_id}/{year}/{month}/{uuid}_{filename}
        """
        if not self.bucket:
            raise ValueError("OSS not configured")

        now = datetime.now()
        ext = filename.split('.')[-1] if '.' in filename else 'mp4'
        object_key = f"videos/{user_id}/{now.year}/{now.month:02d}/{uuid.uuid4().hex}.{ext}"

        # 上传文件
        self.bucket.put_object(object_key, file_data)

        # 返回访问URL
        if OSS_DOMAIN:
            return f"https://{OSS_DOMAIN}/{object_key}"
        return f"https://{OSS_BUCKET_NAME}.{OSS_ENDPOINT}/{object_key}"

    def upload_thumbnail(self, file_data: bytes, user_id: int) -> str:
        """上传缩略图"""
        if not self.bucket:
            raise ValueError("OSS not configured")

        now = datetime.now()
        object_key = f"thumbnails/{user_id}/{now.year}/{now.month:02d}/{uuid.uuid4().hex}.jpg"

        self.bucket.put_object(object_key, file_data)

        if OSS_DOMAIN:
            return f"https://{OSS_DOMAIN}/{object_key}"
        return f"https://{OSS_BUCKET_NAME}.{OSS_ENDPOINT}/{object_key}"

    def delete_file(self, file_url: str):
        """删除文件"""
        if not self.bucket:
            return

        # 从URL提取object_key
        object_key = file_url.split(f"{OSS_BUCKET_NAME}.{OSS_ENDPOINT}/")[-1]
        if OSS_DOMAIN:
            object_key = file_url.split(f"{OSS_DOMAIN}/")[-1]

        try:
            self.bucket.delete_object(object_key)
        except Exception as e:
            print(f"Delete failed: {e}")

    def generate_upload_url(self, user_id: int, filename: str, expire_seconds: int = 3600) -> dict:
        """
        生成前端直传的预签名URL（更安全，不经过服务器中转）
        """
        if not self.bucket:
            raise ValueError("OSS not configured")

        now = datetime.now()
        ext = filename.split('.')[-1] if '.' in filename else 'mp4'
        object_key = f"videos/{user_id}/{now.year}/{now.month:02d}/{uuid.uuid4().hex}.{ext}"

        # 生成预签名URL
        url = self.bucket.sign_url('PUT', object_key, expire_seconds)

        return {
            "upload_url": url,
            "file_url": f"https://{OSS_DOMAIN or OSS_BUCKET_NAME + '.' + OSS_ENDPOINT}/{object_key}",
            "object_key": object_key
        }


# 全局实例
storage = CloudStorage()
