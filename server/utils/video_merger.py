"""
视频拼接工具 - 将两段视频对齐后拼接成并排视频
"""

import os
import subprocess
import tempfile
from typing import Tuple, Optional


def merge_videos_side_by_side(
    video1_path: str,
    video2_path: str,
    offset: float,
    output_path: str,
    max_duration: float = 30.0,
    manual_adjust: float = 0.0
) -> Tuple[bool, str]:
    """
    将两段视频对齐后拼接成并排视频

    Args:
        video1_path: 第一段视频路径
        video2_path: 第二段视频路径
        offset: 时间偏移（秒），video2 相对于 video1 的偏移
        output_path: 输出视频路径
        max_duration: 最大输出视频时长（秒）
        manual_adjust: 手动调整偏移（秒），正值表示video2更晚，负值表示video2更早

    Returns:
        (是否成功, 消息)
    """
    # 应用手动调整
    adjusted_offset = offset + manual_adjust
    try:
        # 获取视频信息
        def get_video_info(path: str) -> dict:
            cmd = [
                'ffprobe', '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height,duration',
                '-of', 'json',
                path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            import json
            data = json.loads(result.stdout)
            stream = data.get('streams', [{}])[0]
            return {
                'width': int(stream.get('width', 0)),
                'height': int(stream.get('height', 0)),
                'duration': float(stream.get('duration', 0))
            }

        info1 = get_video_info(video1_path)
        info2 = get_video_info(video2_path)

        print(f"[Merge] Video1 duration: {info1['duration']:.2f}s, Video2 duration: {info2['duration']:.2f}s")
        print(f"[Merge] Original offset: {offset:.3f}s, Manual adjust: {manual_adjust:.3f}s, Final: {adjusted_offset:.3f}s")

        # 计算同步后的起始时间
        # 核心逻辑：找到两个视频中音乐对齐的点
        # 假设音乐在时间点T开始播放
        # video1在录制开始后的start1时刻播放音乐T
        # video2在录制开始后的start2时刻播放音乐T
        # offset = start2 - start1 (video2相对于video1的时间差)
        #
        # 例子：
        # - video1从音乐开头(0s)开始录
        # - video2从音乐1.5s处开始录
        # - offset = 1.5s (video2比video1晚1.5秒进入音乐)
        # - 要对齐：video2需要跳过1.5秒
        #
        # offset > 0: video2比video1晚开始音乐，video2跳过offset秒
        # offset < 0: video2比video1早开始音乐，video1跳过-offset秒

        if adjusted_offset > 0:
            # video2晚开始：跳过开头
            start1 = 0
            start2 = adjusted_offset
        else:
            # video2早开始：video1跳过开头
            start1 = -adjusted_offset
            start2 = 0

        print(f"[Merge] Start times: video1={start1:.3f}s, video2={start2:.3f}s")

        # 计算有效时长
        effective_duration = min(
            info1['duration'] - start1,
            info2['duration'] - start2,
            max_duration
        )

        print(f"[Merge] Available: video1={info1['duration']-start1:.2f}s, video2={info2['duration']-start2:.2f}s")
        print(f"[Merge] Effective duration: {effective_duration:.2f}s")

        if effective_duration <= 0:
            return False, f"视频时长不足以对齐 (需要跳过{max(start1, start2):.1f}s，但视频只有{min(info1['duration'], info2['duration']):.1f}s)"

        if effective_duration < 1.0:
            return False, f"对齐后剩余时长过短 ({effective_duration:.1f}s)，请检查偏移量是否过大"

        # 确定目标尺寸 - 竖屏视频需要特殊处理
        # 使用 360x480 作为竖屏的目标尺寸，保持宽高比
        target_width = 360
        target_height = 480

        # 使用 FFmpeg 拼接视频
        # 方案：使用 -ss 输入前seek（更精确）+ -copyts 保持时间戳
        # 相比trim滤镜，-ss在输入前处理更精确

        end1 = min(start1 + effective_duration, info1['duration'])
        end2 = min(start2 + effective_duration, info2['duration'])

        print(f"[Merge] Seek: video1 [{start1:.3f}s - {end1:.3f}s], video2 [{start2:.3f}s - {end2:.3f}s]")

        # 使用-ss作为输入选项（在解码前seek，更精确）
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start1), '-t', str(effective_duration),
            '-i', video1_path,
            '-ss', str(start2), '-t', str(effective_duration),
            '-i', video2_path,
            '-filter_complex',
            f'[0:v]scale={target_width}:{target_height}:force_original_aspect_ratio=decrease,setsar=1,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2[v0];'
            f'[1:v]scale={target_width}:{target_height}:force_original_aspect_ratio=decrease,setsar=1,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2[v1];'
            f'[v0][v1]hstack=inputs=2[outv];'
            f'[0:a][1:a]amerge=inputs=2[a]',
            '-map', '[outv]',
            '-map', '[a]',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-shortest',
            output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True, f"视频拼接成功，时长 {effective_duration:.1f} 秒"
        else:
            return False, f"FFmpeg 失败: {result.stderr}"

    except Exception as e:
        return False, f"拼接失败: {str(e)}"


def extract_frame_at_time(video_path: str, time_sec: float) -> Optional[bytes]:
    """
    从视频中提取指定时间的帧

    Args:
        video_path: 视频路径
        time_sec: 时间点（秒）

    Returns:
        JPEG 图片数据，失败返回 None
    """
    try:
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(time_sec),
            '-i', video_path,
            '-vframes', '1',
            '-q:v', '2',
            '-f', 'image2pipe',
            '-vcodec', 'mjpeg',
            '-'
        ]

        result = subprocess.run(cmd, capture_output=True)

        if result.returncode == 0 and result.stdout:
            return result.stdout
        return None

    except Exception as e:
        print(f"Extract frame error: {e}")
        return None


def get_video_duration(video_path: str) -> float:
    """获取视频时长"""
    try:
        cmd = [
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'json',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        import json
        data = json.loads(result.stdout)
        return float(data.get('format', {}).get('duration', 0))
    except:
        return 0.0
