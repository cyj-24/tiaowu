#!/usr/bin/env python3
"""
API对齐测试 - 调用后端API测试对齐
"""

import requests
import sys

API_URL = "http://localhost:8000/api/sync-videos"

def test_sync(video1_path, video2_path):
    """调用API测试对齐"""

    if not os.path.exists(video1_path) or not os.path.exists(video2_path):
        print(f"错误: 视频文件不存在")
        print(f"  video1: {video1_path}")
        print(f"  video2: {video2_path}")
        return

    print(f"上传视频测试对齐...")
    print(f"  video1: {video1_path}")
    print(f"  video2: {video2_path}")

    with open(video1_path, 'rb') as f1, open(video2_path, 'rb') as f2:
        files = {
            'video1': f1,
            'video2': f2
        }

        try:
            response = requests.post(API_URL, files=files, timeout=60)
            result = response.json()

            print("\n" + "="*50)
            print("对齐结果:")
            print("="*50)
            print(f"成功: {result.get('success')}")
            print(f"偏移量: {result.get('offset', 0):.3f}s")
            print(f"置信度: {result.get('confidence', 0)*100:.1f}%")
            print(f"video1时长: {result.get('video1_duration', 0):.1f}s")
            print(f"video2时长: {result.get('video2_duration', 0):.1f}s")
            print(f"消息: {result.get('message', '')}")

            if result.get('success'):
                print(f"\n建议: 使用偏移量 {result['offset']:.3f}s 进行合并")
                if result['offset'] > 0:
                    print(f"       video2跳过{result['offset']:.2f}秒")
                else:
                    print(f"       video1跳过{-result['offset']:.2f}秒")

        except Exception as e:
            print(f"请求失败: {e}")

if __name__ == "__main__":
    import os

    if len(sys.argv) >= 3:
        test_sync(sys.argv[1], sys.argv[2])
    else:
        print("用法: python test_api.py <video1> <video2>")
        print("\n请提供两段视频的路径进行测试")
        print("例如: python test_api.py ~/Downloads/v1.mp4 ~/Downloads/v2.mp4")
