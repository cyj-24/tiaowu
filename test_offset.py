#!/usr/bin/env python3
"""
偏移量测试工具 - 手动测试不同偏移看哪个对齐
"""

import sys
import subprocess
import os

VIDEO1 = "/Users/chengyujuan/swing-dance-analyzer/test_videos/video1.mp4"
VIDEO2 = "/Users/chengyujuan/swing-dance-analyzer/test_videos/video2.mp4"
OUTPUT = "/Users/chengyujuan/swing-dance-analyzer/test_output.mp4"

def merge_with_offset(offset, output_path):
    """合并视频，使用指定偏移"""

    if offset > 0:
        start1, start2 = 0, offset
    else:
        start1, start2 = -offset, 0

    duration = 15  # 测试15秒

    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start1), '-t', str(duration),
        '-i', VIDEO1,
        '-ss', str(start2), '-t', str(duration),
        '-filter_complex',
        '[0:v]scale=360:480,setsar=1[v0];'
        '[1:v]scale=360:480,setsar=1[v1];'
        '[v0][v1]hstack=inputs=2[outv];'
        '[0:a][1:a]amerge=inputs=2[a]',
        '-map', '[outv]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

def main():
    if len(sys.argv) < 2:
        print("用法: python test_offset.py <偏移量>")
        print("例子:")
        print("  python test_offset.py -1.5   # video2跳过1.5秒")
        print("  python test_offset.py 2.0    # video1跳过2秒")
        print("\n测试多个偏移:")
        for offset in [-2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0]:
            output = f"/tmp/test_offset_{offset}.mp4"
            print(f"测试偏移 {offset:+.1f}s...", end=" ")
            if merge_with_offset(offset, output):
                print(f"✓ 输出: {output}")
            else:
                print("✗ 失败")
        return

    offset = float(sys.argv[1])
    print(f"测试偏移: {offset:+.3f}s")

    if merge_with_offset(offset, OUTPUT):
        print(f"✓ 成功! 输出: {OUTPUT}")
        print("请播放检查对齐效果")
    else:
        print("✗ 失败")

if __name__ == "__main__":
    main()
