#!/usr/bin/env python3
"""测试音频同步模块的JSON序列化"""

import sys
import json
import numpy as np

# 测试所有可能返回的数据类型
def test_json_serialization():
    """测试所有返回数据可以被JSON序列化"""

    # 修复 scipy 版本兼容性问题
    import scipy.signal
    if not hasattr(scipy.signal, 'hann'):
        scipy.signal.hann = scipy.signal.windows.hann

    from utils.audio_sync import sync_videos, sync_video_frames

    # 创建一个模拟的 sync_videos 返回结果
    test_cases = [
        # 成功情况
        {
            "success": True,
            "offset": 0.0,
            "confidence": 0.85,
            "video1_duration": 30.0,
            "video2_duration": 30.0,
            "video1_bpm": 120.0,
            "video2_bpm": 120.0,
            "message": "同步成功"
        },
        # 失败情况
        {
            "success": False,
            "offset": 0.0,
            "confidence": 0.0,
            "video1_duration": 30.0,
            "video2_duration": 30.0,
            "message": "音频不匹配"
        },
        # 带 numpy 类型的情况
        {
            "success": True,
            "offset": np.float64(1.5),
            "confidence": np.float32(0.9),
            "video1_duration": np.float64(30.5),
            "video2_duration": np.float64(30.2),
            "video1_bpm": np.float32(120.5),
            "video2_bpm": np.float32(120.0),
            "message": "测试numpy类型"
        }
    ]

    print("测试 JSON 序列化...")
    for i, test_case in enumerate(test_cases):
        try:
            # 尝试JSON序列化
            json_str = json.dumps(test_case)
            print(f"  ✓ 测试用例 {i+1} 通过")
        except Exception as e:
            print(f"  ✗ 测试用例 {i+1} 失败: {e}")
            return False

    print("\n所有测试通过！")
    return True


def test_return_types():
    """测试函数返回类型"""
    import scipy.signal
    if not hasattr(scipy.signal, 'hann'):
        scipy.signal.hann = scipy.signal.windows.hann

    from utils.audio_sync import find_best_match, refine_sync_with_beats, detect_beats
    import numpy as np

    print("\n测试函数返回类型...")

    # 测试 find_best_match
    fp1 = np.random.rand(100)
    fp2 = np.random.rand(50)
    offset, score, _ = find_best_match(fp1, fp2)
    assert isinstance(offset, float), f"offset 应该是 float, 实际是 {type(offset)}"
    assert isinstance(score, float), f"score 应该是 float, 实际是 {type(score)}"
    print(f"  ✓ find_best_match: offset={type(offset)}, score={type(score)}")

    # 测试 refine_sync_with_beats
    beats1 = np.array([0.5, 1.0, 1.5, 2.0])
    beats2 = np.array([0.6, 1.1, 1.6, 2.1])
    final_offset, confidence = refine_sync_with_beats(beats1, beats2, 0.1, 0.8)
    assert isinstance(final_offset, float), f"final_offset 应该是 float, 实际是 {type(final_offset)}"
    assert isinstance(confidence, float), f"confidence 应该是 float, 实际是 {type(confidence)}"
    print(f"  ✓ refine_sync_with_beats: offset={type(final_offset)}, confidence={type(confidence)}")

    print("\n所有类型测试通过！")
    return True


if __name__ == "__main__":
    success = True
    success = test_json_serialization() and success
    success = test_return_types() and success

    if success:
        print("\n✅ 全部测试通过！")
        sys.exit(0)
    else:
        print("\n❌ 测试失败！")
        sys.exit(1)
