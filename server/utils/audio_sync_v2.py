"""
音频对齐算法 V2 - 支持独立录制视频的时间拉伸对齐
处理同一首歌但录制设备/环境不同的情况
"""

import numpy as np
import librosa
from scipy import signal
from typing import Tuple, Dict, Any


def align_with_time_stretch(audio1_path: str, audio2_path: str) -> Tuple[float, float, float]:
    """
    使用时间拉伸对齐两段独立录制的音频
    处理设备采样率差异、演奏速度差异等情况

    Returns:
        (偏移量秒, 速度比例, 置信度)
        速度比例 > 1 表示 video2 比 video1 快
    """
    # 加载音频
    y1, sr1 = librosa.load(audio1_path, sr=16000, mono=True)
    y2, sr2 = librosa.load(audio2_path, sr=16000, mono=True)

    # 使用Mel频谱作为特征（对噪音更鲁棒）
    hop_length = 512
    mel1 = librosa.feature.melspectrogram(y=y1, sr=sr1, hop_length=hop_length, n_mels=40)
    mel2 = librosa.feature.melspectrogram(y=y2, sr=sr2, hop_length=hop_length, n_mels=40)

    # 转换为log scale
    mel1 = librosa.power_to_db(mel1, ref=np.max)
    mel2 = librosa.power_to_db(mel2, ref=np.max)

    # 标准化
    mel1 = (mel1 - mel1.mean(axis=0)) / (mel1.std(axis=0) + 1e-8)
    mel2 = (mel2 - mel2.mean(axis=0)) / (mel2.std(axis=0) + 1e-8)

    # 使用DTW (Dynamic Time Warping) 处理时间拉伸
    # DTW可以找到两个序列之间的最佳非线性对齐
    print(f"[Time Stretch] Computing DTW...")
    print(f"  Mel1 shape: {mel1.shape}, Mel2 shape: {mel2.shape}")

    # 子序列DTW：在较长的音频中找较短音频的位置
    if mel1.shape[1] < mel2.shape[1]:
        short_mel, long_mel = mel1, mel2
        short_is_video1 = True
    else:
        short_mel, long_mel = mel2, mel1
        short_is_video1 = False

    # 计算DTW路径
    D, wp = librosa.sequence.dtw(short_mel, long_mel, subseq=True, metric='euclidean')

    # 从DTW路径提取信息
    # wp是warping path，表示short_mel的每一帧对应long_mel的哪一帧
    start_in_long = wp[0, 1]  # short第一帧对应long的位置
    end_in_long = wp[-1, 1]   # short最后一帧对应long的位置

    # 计算时间偏移
    time_offset = float(start_in_long * hop_length) / 16000

    # 计算速度比例（判断是否有速度差异）
    short_duration_frames = short_mel.shape[1]
    long_match_duration_frames = end_in_long - start_in_long
    speed_ratio = long_match_duration_frames / short_duration_frames

    if not short_is_video1:
        time_offset = -time_offset

    # 计算置信度（基于DTW距离）
    dtw_distance = D[-1, -1]
    # 归一化距离为分数（距离越小分数越高）
    max_possible_dist = np.sqrt(40) * short_mel.shape[1]  # 近似最大距离
    confidence = np.clip(1 - (dtw_distance / max_possible_dist), 0, 1)

    print(f"[Time Stretch] Offset: {time_offset:.3f}s, Speed ratio: {speed_ratio:.4f}, Confidence: {confidence:.3f}")
    print(f"  Short matched from frame {start_in_long} to {end_in_long} in long audio")

    return float(time_offset), float(speed_ratio), float(confidence)


def align_multi_scale(audio1_path: str, audio2_path: str) -> Dict[str, Any]:
    """
    多尺度对齐策略
    1. 粗对齐：使用低分辨率特征快速定位大致位置
    2. 精对齐：使用高分辨率特征精确对齐
    3. 验证：使用节拍信息验证对齐结果
    """
    results = {}

    # 方法1: 时间拉伸对齐（推荐用于独立录制）
    try:
        offset, speed_ratio, confidence = align_with_time_stretch(audio1_path, audio2_path)
        results['time_stretch'] = {
            'offset': offset,
            'speed_ratio': speed_ratio,
            'confidence': confidence
        }
    except Exception as e:
        print(f"[Multi Scale] Time stretch failed: {e}")
        results['time_stretch'] = None

    # 方法2: 传统子串匹配（作为对比）
    # ... (onset/chroma方法)

    return results


if __name__ == "__main__":
    # 测试
    import sys
    if len(sys.argv) >= 3:
        align_with_time_stretch(sys.argv[1], sys.argv[2])
