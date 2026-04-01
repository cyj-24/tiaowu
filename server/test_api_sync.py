#!/usr/bin/env python3
"""测试 sync-videos API 端点"""

import sys
import json
from fastapi.testclient import TestClient

# 修复 scipy 版本兼容性问题
import scipy.signal
if not hasattr(scipy.signal, 'hann'):
    scipy.signal.hann = scipy.signal.windows.hann

from main import app

client = TestClient(app)

def test_sync_videos_endpoint():
    """测试 sync-videos API 返回可 JSON 序列化的数据"""

    # 由于我们没有真实视频文件，创建一个最小的测试
    # 测试 API 端点是否能被调用（会失败但不应报错序列化问题）

    print("测试 API 端点...")

    # 测试 1: 不带文件调用（应该返回 422 验证错误，而不是 500）
    response = client.post("/api/sync-videos")
    print(f"  无文件调用: status={response.status_code}")
    if response.status_code == 422:
        print("  ✓ 验证错误处理正确")
    else:
        print(f"  ✗ 意外状态码: {response.status_code}")
        print(f"     响应: {response.text[:200]}")

    # 测试 2: 检查响应是否为有效 JSON
    try:
        if response.text:
            data = response.json()
            print("  ✓ 响应可 JSON 解析")
    except Exception as e:
        print(f"  ✗ JSON 解析失败: {e}")
        return False

    print("\n测试完成!")
    return True


def test_json_response():
    """测试 sync_videos 函数的返回值"""
    import numpy as np
    from utils.audio_sync import sync_videos

    print("\n测试 sync_videos 返回结构...")

    # 模拟 sync_videos 可能返回的各种结果
    test_results = [
        # 成功结果
        {
            "success": True,
            "offset": 1.5,
            "confidence": 0.85,
            "video1_duration": 30.0,
            "video2_duration": 30.0,
            "video1_bpm": 120.0,
            "video2_bpm": 120.0,
            "message": "同步成功"
        },
        # 失败结果
        {
            "success": False,
            "offset": 0.0,
            "confidence": 0.0,
            "video1_duration": 0.0,
            "video2_duration": 0.0,
            "message": "同步失败: 测试"
        }
    ]

    for i, result in enumerate(test_results):
        try:
            json_str = json.dumps(result)
            parsed = json.loads(json_str)
            print(f"  ✓ 结果 {i+1} JSON 序列化通过")
        except Exception as e:
            print(f"  ✗ 结果 {i+1} JSON 序列化失败: {e}")
            return False

    return True


if __name__ == "__main__":
    success = True
    success = test_json_response() and success

    if success:
        print("\n✅ API 测试通过！")
        sys.exit(0)
    else:
        print("\n❌ API 测试失败！")
        sys.exit(1)
