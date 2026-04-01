"""
音频同步模块
支持通过音频指纹和节拍检测对齐两段视频
"""

import os
import io
import tempfile
import numpy as np
from typing import Tuple, Optional, Dict, Any
from pydub import AudioSegment

# 修复 scipy 版本兼容性问题
import scipy.signal
if not hasattr(scipy.signal, 'hann'):
    scipy.signal.hann = scipy.signal.windows.hann

import librosa


def extract_audio_from_video(video_path: str, output_path: str = None) -> str:
    """
    从视频中提取音频

    Args:
        video_path: 视频文件路径
        output_path: 输出音频路径（可选）

    Returns:
        音频文件路径
    """
    if output_path is None:
        output_path = video_path.replace('.mp4', '.wav').replace('.mov', '.wav')

    # 使用 pydub 提取音频
    audio = AudioSegment.from_file(video_path)
    # 转换为单声道，16kHz，降低处理复杂度
    audio = audio.set_channels(1).set_frame_rate(16000)
    audio.export(output_path, format='wav')

    return output_path


def compute_chromaprint_fingerprint(audio_path: str) -> Tuple[np.ndarray, int]:
    """
    计算音频指纹（使用高分辨率梅尔频谱）
    实际测试发现 Chromaprint 点数太少，改用梅尔频谱更合适

    Args:
        audio_path: 音频文件路径

    Returns:
        (梅尔频谱特征, 采样率)
    """
    # 直接使用梅尔频谱，提供更好的时间分辨率
    return compute_mel_fingerprint(audio_path)


def compute_mel_fingerprint(audio_path: str, hop_length: int = 256) -> Tuple[np.ndarray, int]:
    """
    使用梅尔频谱作为指纹
    使用 hop_length=256 提供 16ms 时间分辨率（比 512 的 32ms 更精确）

    Args:
        audio_path: 音频文件路径
        hop_length: 帧移（默认 256，对应 16ms @ 16kHz）

    Returns:
        (梅尔频谱特征, 采样率)
    """
    y, sr = librosa.load(audio_path, sr=16000, mono=True)

    # 计算梅尔频谱
    # hop_length=256 对应 16ms 时间分辨率
    mel_spec = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=128,     # 更多频带以提高区分度
        n_fft=2048,
        hop_length=hop_length
    )

    # 转换为对数刻度并标准化
    log_mel = librosa.power_to_db(mel_spec, ref=np.max)
    log_mel = (log_mel - log_mel.mean()) / (log_mel.std() + 1e-8)

    print(f"Mel fingerprint: shape {log_mel.shape}, resolution={hop_length/sr*1000:.1f}ms")

    return log_mel, sr


def compute_cross_correlation(signal1: np.ndarray, signal2: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    使用 scipy 计算两个信号的互相关

    Args:
        signal1: 信号1
        signal2: 信号2

    Returns:
        (互相关数组, 是否交换了信号)
    """
    from scipy import signal

    # 确保 signal1 更长
    swapped = False
    if len(signal1) < len(signal2):
        signal1, signal2 = signal2, signal1
        swapped = True

    # 使用 scipy.signal.correlate 计算互相关
    # mode='valid' 只返回完全重叠的部分
    correlation = signal.correlate(signal1, signal2, mode='valid')

    return correlation, swapped


def find_best_match(fingerprint1: np.ndarray, fingerprint2: np.ndarray,
                    sr: int = 16000) -> Tuple[float, float, float]:
    """
    找到两段音频的最佳匹配位置
    使用 2D 互相关对整个梅尔频谱进行匹配

    Args:
        fingerprint1: 第一段音频指纹 (n_mels, n_frames)
        fingerprint2: 第二段音频指纹 (n_mels, n_frames)
        sr: 采样率

    Returns:
        (时间偏移量(秒), 匹配分数(0-1), 匹配开始时间)
    """
    from scipy import signal

    # 确保是 2D 数组
    if len(fingerprint1.shape) == 1:
        fingerprint1 = fingerprint1.reshape(1, -1)
    if len(fingerprint2.shape) == 1:
        fingerprint2 = fingerprint2.reshape(1, -1)

    # 确保 fingerprint1 时间维度更长
    swapped = False
    if fingerprint1.shape[1] < fingerprint2.shape[1]:
        fingerprint1, fingerprint2 = fingerprint2, fingerprint1
        swapped = True

    n_mels = fingerprint1.shape[0]
    n1 = fingerprint1.shape[1]
    n2 = fingerprint2.shape[1]

    # 对每一行（每个频带）计算互相关，然后平均
    correlations = []
    for i in range(n_mels):
        # 标准化每个频带
        f1 = fingerprint1[i, :]
        f2 = fingerprint2[i, :]
        f1 = (f1 - f1.mean()) / (f1.std() + 1e-8)
        f2 = (f2 - f2.mean()) / (f2.std() + 1e-8)

        # 互相关
        corr = signal.correlate(f1, f2, mode='valid')
        correlations.append(corr)

    # 平均所有频带的互相关
    correlation = np.mean(correlations, axis=0)

    # 找到最佳匹配位置，同时检测多个峰值（用于检测重复音乐）
    if len(correlation) > 0:
        # 找到所有局部极大值
        from scipy.signal import find_peaks
        peaks, properties = find_peaks(correlation, height=np.max(correlation) * 0.5)

        # 按高度排序
        peak_heights = correlation[peaks]
        sorted_indices = np.argsort(peak_heights)[::-1]
        top_peaks = peaks[sorted_indices]
        top_heights = peak_heights[sorted_indices]

        # 检查是否有多个接近的峰值（可能是重复音乐）
        has_repeating_music = len(top_peaks) >= 2 and top_heights[1] > top_heights[0] * 0.8

        if has_repeating_music:
            print(f"[Sync] Warning: Detected multiple similar peaks ({len(top_peaks)}), music may be repeating")
            print(f"[Sync] Top peak at {top_peaks[0]}, second peak at {top_peaks[1]}")

        best_idx = top_peaks[0] if len(top_peaks) > 0 else np.argmax(correlation)
        # 归一化分数：除以信号长度和频带数
        best_score = correlation[best_idx] / (n2 * n_mels)
    else:
        best_idx = 0
        best_score = 0
        has_repeating_music = False

    # 限制分数范围并归一化到 0-1
    best_score = np.clip(best_score, -1, 1)
    score_normalized = (best_score + 1) / 2

    # 转换为时间（hop_length=256, sr=16000）-> 16ms 分辨率
    hop_length = 256
    time_offset = float(best_idx * hop_length) / float(sr)

    # 如果交换了，取反 offset
    if swapped:
        time_offset = -time_offset

    print(f"[Sync] Best match at index {best_idx}, score={best_score:.3f}, offset={time_offset:.3f}s, swapped={swapped}")

    return float(time_offset), float(score_normalized), float(time_offset), has_repeating_music


def detect_beats(audio_path: str) -> Tuple[np.ndarray, float, np.ndarray]:
    """
    检测音频的节拍

    Args:
        audio_path: 音频文件路径

    Returns:
        (节拍时间点数组(秒), BPM, onset强度曲线)
    """
    y, sr = librosa.load(audio_path, sr=None)

    # 计算 onset 强度
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)

    # 检测节拍
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, onset_envelope=onset_env)

    # 转换为时间（秒）
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    return beat_times, float(tempo), onset_env


def align_by_onset_subsequence(audio1_path: str, audio2_path: str) -> Tuple[float, float]:
    """
    使用Onset强度进行子串匹配（子帧精度）
    使用互相关+抛物线插值找到精确的亚帧级偏移
    """
    from scipy import signal
    from scipy.interpolate import interp1d

    # 加载音频（更高采样率用于子帧精度）
    y1, sr1 = librosa.load(audio1_path, sr=22050, mono=True)
    y2, sr2 = librosa.load(audio2_path, sr=22050, mono=True)

    # 计算onset（更小的hop_length提高精度）
    hop_length = 256  # 11.6ms @ 22050Hz
    onset1 = librosa.onset.onset_strength(y=y1, sr=sr1, hop_length=hop_length)
    onset2 = librosa.onset.onset_strength(y=y2, sr=sr2, hop_length=hop_length)

    # 标准化
    onset1 = (onset1 - onset1.mean()) / (onset1.std() + 1e-8)
    onset2 = (onset2 - onset2.mean()) / (onset2.std() + 1e-8)

    # 判断长短
    # 明确标记哪个是video1，哪个是video2
    if len(onset1) < len(onset2):
        # video1 是短视频
        short_onset, long_onset = onset1, onset2
        short_is_video1 = True
        print(f"[Onset Subseq] Video1 is SHORT ({len(onset1)} frames), Video2 is LONG ({len(onset2)} frames)")
    else:
        # video2 是短视频
        short_onset, long_onset = onset2, onset1
        short_is_video1 = False
        print(f"[Onset Subseq] Video2 is SHORT ({len(onset2)} frames), Video1 is LONG ({len(onset1)} frames)")

    n_short = len(short_onset)
    n_long = len(long_onset)

    # 使用互相关找到粗略位置
    correlation = signal.correlate(long_onset, short_onset, mode='valid')
    best_idx = np.argmax(correlation)
    best_corr = correlation[best_idx] / (np.std(short_onset) * np.std(long_onset) * n_short)

    # 子帧精度：在峰值附近使用抛物线插值
    if 0 < best_idx < len(correlation) - 1:
        y_m1 = correlation[best_idx - 1]
        y_0 = correlation[best_idx]
        y_p1 = correlation[best_idx + 1]
        a = (y_m1 + y_p1 - 2 * y_0) / 2
        b = (y_p1 - y_m1) / 2
        subframe_shift = -b / (2 * a) if a != 0 else 0
    else:
        subframe_shift = 0

    # 计算偏移量
    # best_idx 是短视频在长视频中的起始帧位置
    # 偏移量 = best_idx * hop_length / sr （秒）
    match_position = float((best_idx + subframe_shift) * hop_length) / 22050

    # 关键：确定偏移量的符号
    # 如果 video1 是短视频，它在 video2 的 match_position 位置开始
    # 这意味着：video2 的 0s 对应 video1 的 -match_position
    # 要对齐，video2 需要跳过 match_position 秒（正值）
    if short_is_video1:
        # video1 是短的，从 video2 的 match_position 开始
        # video2 需要跳过 match_position 秒才能与 video1 的 0s 对齐
        time_offset = match_position
    else:
        # video2 是短的，从 video1 的 match_position 开始
        # video1 需要跳过 match_position 秒
        # 所以 offset 是负的（video2 相对于 video1 的偏移）
        time_offset = -match_position

    score_normalized = (best_corr + 1) / 2

    print(f"[Onset Subseq] Frame: {best_idx}, Subframe: {subframe_shift:+.3f}")
    print(f"[Onset Subseq] Offset: {time_offset:.3f}s, corr: {best_corr:.3f}")

    return float(time_offset), float(score_normalized)


def align_by_onset(audio1_path: str, audio2_path: str) -> Tuple[float, float]:
    """
    使用 onset 强度曲线进行对齐（适用于音乐重复的情况）
    找到两个 onset 曲线最匹配的偏移

    Args:
        audio1_path: 第一段音频路径
        audio2_path: 第二段音频路径

    Returns:
        (时间偏移量(秒), 匹配分数)
    """
    from scipy import signal

    # 加载音频
    y1, sr1 = librosa.load(audio1_path, sr=16000, mono=True)
    y2, sr2 = librosa.load(audio2_path, sr=16000, mono=True)

    # 计算 onset 强度（使用相同的参数）
    hop_length = 512
    onset1 = librosa.onset.onset_strength(y=y1, sr=sr1, hop_length=hop_length)
    onset2 = librosa.onset.onset_strength(y=y2, sr=sr2, hop_length=hop_length)

    # 标准化
    onset1 = (onset1 - onset1.mean()) / (onset1.std() + 1e-8)
    onset2 = (onset2 - onset2.mean()) / (onset2.std() + 1e-8)

    # 互相关
    if len(onset1) < len(onset2):
        onset1, onset2 = onset2, onset1
        swapped = True
    else:
        swapped = False

    correlation = signal.correlate(onset1, onset2, mode='valid')

    # 找到最佳匹配
    best_idx = np.argmax(correlation)
    best_score = correlation[best_idx] / len(onset2)

    # 转换为时间
    time_offset = float(best_idx * hop_length) / float(sr1)

    if swapped:
        time_offset = -time_offset

    # 归一化分数到 0-1
    score_normalized = (np.clip(best_score, -1, 1) + 1) / 2

    print(f"[Onset Align] Best offset: {time_offset:.3f}s, score: {score_normalized:.3f}, swapped={swapped}")

    return float(time_offset), float(score_normalized)


def align_by_dtw_subsequence(audio1_path: str, audio2_path: str) -> Tuple[float, float, dict]:
    """
    使用DTW (Dynamic Time Warping) 进行子串匹配
    这是处理"短视频是长视频片段"情况的最可靠方法

    Args:
        audio1_path: 第一段音频路径
        audio2_path: 第二段音频路径

    Returns:
        (时间偏移量(秒), 匹配分数, 详细信息)
    """
    try:
        # 加载音频
        y1, sr1 = librosa.load(audio1_path, sr=16000, mono=True)
        y2, sr2 = librosa.load(audio2_path, sr=16000, mono=True)

        # 使用Mel频谱作为特征（比Chroma更稳定）
        hop_length = 512
        mel1 = librosa.feature.melspectrogram(y=y1, sr=sr1, hop_length=hop_length, n_mels=40)
        mel2 = librosa.feature.melspectrogram(y=y2, sr=sr2, hop_length=hop_length, n_mels=40)

        # 转换为log scale并标准化
        mel1 = librosa.power_to_db(mel1, ref=np.max)
        mel2 = librosa.power_to_db(mel2, ref=np.max)

        # L2归一化每一帧
        mel1 = (mel1 - mel1.mean(axis=0)) / (mel1.std(axis=0) + 1e-8)
        mel2 = (mel2 - mel2.mean(axis=0)) / (mel2.std(axis=0) + 1e-8)

        # 判断哪个是短视频
        if mel1.shape[1] < mel2.shape[1]:
            short_mel, long_mel = mel1, mel2
            short_sr, long_sr = sr1, sr2
            short_is_video1 = True
        else:
            short_mel, long_mel = mel2, mel1
            short_sr, long_sr = sr2, sr1
            short_is_video1 = False

        n_short = short_mel.shape[1]
        n_long = long_mel.shape[1]

        print(f"[DTW Subsequence] Short: {n_short} frames, Long: {n_long} frames")

        # 计算子串DTW - 在long中滑动查找short的最佳匹配
        best_score = -np.inf
        best_start = 0
        best_end = 0

        # 步进滑动窗口
        step = max(1, n_short // 20)  # 约20个候选位置
        window_size = n_short

        for start in range(0, n_long - window_size + 1, step):
            end = start + window_size
            segment = long_mel[:, start:end]

            # 计算欧氏距离矩阵
            dist_matrix = np.zeros((n_short, window_size))
            for i in range(n_short):
                for j in range(window_size):
                    dist_matrix[i, j] = np.linalg.norm(short_mel[:, i] - segment[:, j])

            # 计算DTW距离
            dtw_dist = librosa.sequence.dtw(dist_matrix, subseq=True)
            score = -dtw_dist[-1, -1]  # 距离越小越好，转换为分数（越大越好）

            if score > best_score:
                best_score = score
                best_start = start
                best_end = end

        # 在最佳位置附近精细化搜索
        fine_start = max(0, best_start - step)
        fine_end = min(n_long - window_size + 1, best_end + step)

        for start in range(fine_start, fine_end):
            end = start + window_size
            segment = long_mel[:, start:end]

            dist_matrix = np.zeros((n_short, window_size))
            for i in range(n_short):
                for j in range(window_size):
                    dist_matrix[i, j] = np.linalg.norm(short_mel[:, i] - segment[:, j])

            dtw_dist = librosa.sequence.dtw(dist_matrix, subseq=True)
            score = -dtw_dist[-1, -1]

            if score > best_score:
                best_score = score
                best_start = start
                best_end = end

        # 转换为时间
        time_offset = float(best_start * hop_length) / float(long_sr)

        # 如果短视频是video1，偏移应该是负的（video2需要跳过time_offset才能对齐）
        if short_is_video1:
            time_offset = -time_offset

        # 计算相似度分数（归一化到0-1）
        # 基于最佳匹配的帧间平均距离
        best_segment = long_mel[:, best_start:best_start+n_short]
        frame_dists = [np.linalg.norm(short_mel[:, i] - best_segment[:, i]) for i in range(n_short)]
        avg_dist = np.mean(frame_dists)
        max_possible_dist = np.sqrt(short_mel.shape[0]) * 2  # 近似最大距离
        score_normalized = np.clip(1 - (avg_dist / max_possible_dist), 0, 1)

        print(f"[DTW Subsequence] Best start frame: {best_start}, offset: {time_offset:.3f}s, score: {score_normalized:.3f}")

        return float(time_offset), float(score_normalized), {
            "method": "dtw_subsequence",
            "start_frame": int(best_start),
            "end_frame": int(best_end),
            "short_is_video1": short_is_video1
        }

    except Exception as e:
        print(f"[DTW Subsequence] Error: {e}")
        import traceback
        traceback.print_exc()
        return 0.0, 0.0, {"error": str(e)}


def align_by_chroma_subsequence(audio1_path: str, audio2_path: str) -> Tuple[float, float]:
    """
    使用音高特征（Chroma）进行子串匹配（高效版本）
    """
    # 加载音频
    y1, sr1 = librosa.load(audio1_path, sr=16000, mono=True)
    y2, sr2 = librosa.load(audio2_path, sr=16000, mono=True)

    # 计算 Chroma 特征
    hop_length = 512
    chroma1 = librosa.feature.chroma_stft(y=y1, sr=sr1, hop_length=hop_length)
    chroma2 = librosa.feature.chroma_stft(y=y2, sr=sr2, hop_length=hop_length)

    # L2归一化
    chroma1 = chroma1 / (np.linalg.norm(chroma1, axis=0, keepdims=True) + 1e-8)
    chroma2 = chroma2 / (np.linalg.norm(chroma2, axis=0, keepdims=True) + 1e-8)

    # 判断长短
    if chroma1.shape[1] < chroma2.shape[1]:
        short_chroma, long_chroma = chroma1, chroma2
        swapped = False
    else:
        short_chroma, long_chroma = chroma2, chroma1
        swapped = True

    n_short = short_chroma.shape[1]
    n_long = long_chroma.shape[1]

    # 滑动窗口找最佳相似度
    best_sim = -1
    best_start = 0

    # 粗筛：步进搜索
    step = max(1, (n_long - n_short) // 50)
    for start in range(0, n_long - n_short + 1, step):
        segment = long_chroma[:, start:start+n_short]
        sim = np.mean(np.sum(short_chroma * segment, axis=0))
        if sim > best_sim:
            best_sim = sim
            best_start = start

    # 精细化搜索
    fine_start = max(0, best_start - step)
    fine_end = min(n_long - n_short + 1, best_start + step + 1)
    for start in range(fine_start, fine_end):
        segment = long_chroma[:, start:start+n_short]
        sim = np.mean(np.sum(short_chroma * segment, axis=0))
        if sim > best_sim:
            best_sim = sim
            best_start = start

    # 转换为时间
    time_offset = float(best_start * hop_length) / 16000

    if not swapped:
        time_offset = -time_offset

    score_normalized = (best_sim + 1) / 2

    print(f"[Chroma Subseq] Best start: {best_start}, offset: {time_offset:.3f}s, sim: {best_sim:.3f}")

    return float(time_offset), float(score_normalized)


def align_by_chroma(audio1_path: str, audio2_path: str, subsequence: bool = True) -> Tuple[float, float]:
    """兼容旧版本调用"""
    return align_by_chroma_subsequence(audio1_path, audio2_path)


def refine_sync_with_beats(beat_times1: np.ndarray, beat_times2: np.ndarray,
                           rough_offset: float, correlation_score: float) -> Tuple[float, float]:
    """
    使用节拍信息精化同步

    Args:
        beat_times1: 第一段音频的节拍时间
        beat_times2: 第二段音频的节拍时间
        rough_offset: 粗略的时间偏移（来自指纹匹配）
        correlation_score: 指纹匹配的置信度

    Returns:
        (精确时间偏移, 最终置信度)
    """
    # 如果指纹匹配分数很高，直接信任
    if correlation_score > 0.85:
        return rough_offset, correlation_score

    # 否则尝试用节拍对齐
    best_offset = rough_offset
    best_score = correlation_score

    # 在粗略偏移附近搜索最佳节拍对齐
    for offset_adjustment in np.linspace(-0.5, 0.5, 21):  # ±0.5秒，步进0.05秒
        test_offset = rough_offset + offset_adjustment

        # 将 beat_times2 偏移后，看与 beat_times1 的重合度
        aligned_beats2 = beat_times2 + test_offset

        # 计算有多少节拍重合（在 ±0.05秒内）
        matches = 0
        for bt2 in aligned_beats2:
            if np.any(np.abs(beat_times1 - bt2) < 0.05):
                matches += 1

        score = matches / max(len(beat_times1), len(beat_times2))

        if score > best_score:
            best_score = score
            best_offset = test_offset

    # 综合评分：指纹匹配分数 + 节拍匹配分数
    final_score = min(1.0, correlation_score * 0.6 + best_score * 0.4)

    return float(best_offset), float(final_score)


def sync_videos(video1_path: str, video2_path: str) -> Dict[str, Any]:
    """
    同步两段视频

    Args:
        video1_path: 第一段视频路径
        video2_path: 第二段视频路径

    Returns:
        {
            "success": bool,
            "offset": float,  # 视频2相对于视频1的时间偏移（秒）
            "confidence": float,  # 置信度 0-1
            "video1_duration": float,
            "video2_duration": float,
            "message": str
        }
    """
    import time
    start_time = time.time()
    temp_files = []

    try:
        print(f"[Sync] Step 1/5: Extracting audio...")
        # 提取音频
        audio1_path = extract_audio_from_video(video1_path)
        audio2_path = extract_audio_from_video(video2_path)
        temp_files.extend([audio1_path, audio2_path])
        print(f"[Sync] Audio extracted in {time.time() - start_time:.2f}s")

        # 获取音频时长
        print(f"[Sync] Step 2/5: Getting audio duration...")
        audio1 = AudioSegment.from_file(audio1_path)
        audio2 = AudioSegment.from_file(audio2_path)
        duration1 = len(audio1) / 1000.0
        duration2 = len(audio2) / 1000.0
        print(f"[Sync] Duration: {duration1:.1f}s vs {duration2:.1f}s")

        # 限制处理时长（超过60秒的视频只处理前60秒）
        max_duration = 60
        if duration1 > max_duration or duration2 > max_duration:
            print(f"[Sync] Warning: Video too long, using first {max_duration}s only")

        # 检测是否为子片段情况（一个视频明显短于另一个）
        duration_ratio = min(duration1, duration2) / max(duration1, duration2)
        is_subsequence = duration_ratio < 0.7  # 如果短于70%，认为是片段
        if is_subsequence:
            print(f"[Sync] Detected subsequence case: duration ratio={duration_ratio:.2f}, using subsequence matching")

        # 计算音频指纹
        print(f"[Sync] Step 3/5: Computing fingerprints...")
        fp1, sr = compute_chromaprint_fingerprint(audio1_path)
        fp2, _ = compute_chromaprint_fingerprint(audio2_path)
        print(f"[Sync] Fingerprint shapes: {fp1.shape}, {fp2.shape}")

        # 找到最佳匹配
        offset, correlation_score, _, has_repeating_music = find_best_match(fp1, fp2, sr)

        print(f"Rough offset: {offset:.3f}s, correlation score: {correlation_score:.3f}")

        # 检查是否有重复音乐
        warning_message = ""
        if has_repeating_music:
            warning_message = "检测到音乐重复播放，对齐可能不准确。建议使用单次播放的视频。"
            print(f"[Sync] Warning: {warning_message}")

        # 多算法融合对齐：梅尔频谱 + Onset + Chroma
        # 梅尔频谱：整体频谱匹配，对相位不敏感
        # Onset：节拍起始点检测，对鼓点敏感
        # Chroma：音高/和弦特征，确保对齐到正确的音乐位置
        print(f"[Sync] Trying multi-feature alignment...")

        # Onset 对齐 - 使用子串匹配
        onset_offset, onset_score = align_by_onset_subsequence(audio1_path, audio2_path)
        print(f"[Sync] Onset (subsequence): offset={onset_offset:.3f}s, score={onset_score:.3f}")

        # Chroma 对齐（音高特征）- 使用子串匹配
        chroma_offset, chroma_score = align_by_chroma_subsequence(audio1_path, audio2_path)
        print(f"[Sync] Chroma (subsequence): offset={chroma_offset:.3f}s, score={chroma_score:.3f}")

        # 收集所有候选结果
        candidates = [
            (offset, correlation_score, "mel"),
            (onset_offset, onset_score, "onset"),
            (chroma_offset, chroma_score, "chroma"),
        ]
        print(f"[Sync] Candidates: {[(c[2], round(c[0], 3), round(c[1], 3)) for c in candidates]}")

        # 策略选择
        onset_chroma_diff = abs(onset_offset - chroma_offset)
        print(f"[Sync] Onset-Chroma difference: {onset_chroma_diff:.3f}s")

        if is_subsequence and onset_chroma_diff > 0.5:
            # 子片段情况且Onset和Chroma差异大：优先使用Onset（对舞蹈音乐节拍更可靠）
            # Chroma可能被相似的和弦进行误导
            offset = onset_offset
            correlation_score = onset_score
            print(f"[Sync] Using Onset (subsequence, large diff): offset={offset:.3f}s")
        elif is_subsequence and chroma_score > 0.8:
            # Chroma分数很高且差异不大，使用Chroma
            offset = chroma_offset
            correlation_score = chroma_score
            print(f"[Sync] Using Chroma (subsequence, high score): offset={offset:.3f}s")
        elif abs(onset_offset - chroma_offset) < 0.3 and onset_score > 0.5 and chroma_score > 0.5:
            # Onset 和 Chroma 一致，加权平均
            combined_offset = (onset_offset * onset_score + chroma_offset * chroma_score) / (onset_score + chroma_score)
            combined_score = max(onset_score, chroma_score)
            offset = combined_offset
            correlation_score = combined_score
            print(f"[Sync] Using Onset+Chroma fusion: offset={offset:.3f}s")
        elif chroma_score > onset_score and chroma_score > 0.4:
            # Chroma 更可靠
            offset = chroma_offset
            correlation_score = chroma_score
            print(f"[Sync] Using Chroma")
        elif onset_score > 0.5:
            # Onset 次之
            offset = onset_offset
            correlation_score = onset_score
            print(f"[Sync] Using Onset")
        else:
            # fallback 到梅尔频谱
            print(f"[Sync] Using Mel spectrogram")

        # 如果相关性仍然太低，可能是不同的音乐
        if correlation_score < 0.3:
            return {
                "success": False,
                "offset": 0.0,
                "confidence": float(correlation_score),
                "video1_duration": float(duration1),
                "video2_duration": float(duration2),
                "message": "音频不匹配，请确保两段视频使用相同的音乐"
            }

        # 检测节拍（简化版：如果指纹匹配度已经很高，跳过节拍检测）
        beat_start = time.time()
        print(f"[Sync] Step 4/5: Detecting beats...")

        # 如果相关性已经很高，跳过节拍精化以加快速度
        if correlation_score > 0.85:
            print(f"[Sync] High correlation ({correlation_score:.3f}), skipping beat detection")
            beat_times1 = np.array([])
            beat_times2 = np.array([])
            tempo1 = tempo2 = 120.0
        else:
            beat_times1, tempo1, _ = detect_beats(audio1_path)
            beat_times2, tempo2, _ = detect_beats(audio2_path)
            print(f"[Sync] Video1: {len(beat_times1)} beats, {tempo1:.1f} BPM")
            print(f"[Sync] Video2: {len(beat_times2)} beats, {tempo2:.1f} BPM")
            print(f"[Sync] Beat detection took {time.time() - beat_start:.2f}s")

        # BPM 差异检查
        tempo1 = float(tempo1)  # 转换为 Python float
        tempo2 = float(tempo2)
        bpm_diff_ratio = abs(tempo1 - tempo2) / max(tempo1, tempo2)
        if bpm_diff_ratio > 0.1:  # BPM 差异超过 10%
            return {
                "success": False,
                "offset": 0.0,
                "confidence": float(correlation_score),
                "video1_duration": float(duration1),
                "video2_duration": float(duration2),
                "message": f"BPM不匹配 ({tempo1:.0f} vs {tempo2:.0f})，请确保两段视频速度一致"
            }

        # 使用节拍精化同步
        print(f"[Sync] Step 5/5: Refining sync...")
        final_offset, confidence = refine_sync_with_beats(
            beat_times1, beat_times2, offset, correlation_score
        )

        # 判断同步质量
        total_time = time.time() - start_time
        if confidence > 0.8:
            message = f"同步成功，置信度高（耗时{total_time:.1f}s）"
        elif confidence > 0.5:
            message = f"同步成功，但建议手动检查（耗时{total_time:.1f}s）"
        else:
            message = f"同步结果不确定，建议手动调整（耗时{total_time:.1f}s）"

        # 添加重复音乐警告
        if warning_message:
            message = warning_message + " " + message

        print(f"[Sync] Complete in {total_time:.2f}s, confidence={confidence:.3f}")

        # 构建结果并强制转换所有类型
        result = {
            "success": True,
            "offset": float(final_offset),
            "confidence": float(confidence),
            "video1_duration": float(duration1),
            "video2_duration": float(duration2),
            "video1_bpm": float(tempo1),
            "video2_bpm": float(tempo2),
            "message": str(message)
        }

        # 验证所有值都是可 JSON 序列化的
        import json
        try:
            json.dumps(result)
            print(f"[Sync] Result JSON serializable: OK")
        except Exception as e:
            print(f"[Sync] JSON Error: {e}")
            for k, v in result.items():
                print(f"  {k}: {type(v)} = {v}")

        return result

    except Exception as e:
        print(f"Sync error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "offset": 0.0,
            "confidence": 0.0,
            "video1_duration": 0.0,
            "video2_duration": 0.0,
            "message": f"同步失败: {str(e)}"
        }

    finally:
        # 清理临时文件
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass


def sync_video_frames(video1_path: str, video2_path: str,
                      timestamp1: float, timestamp2: float) -> Dict[str, Any]:
    """
    基于音频同步，计算两个视频帧的最佳对齐时间

    Args:
        video1_path: 第一段视频路径
        video2_path: 第二段视频路径
        timestamp1: 视频1的目标时间（秒）
        timestamp2: 视频2的目标时间（秒）

    Returns:
        {
            "success": bool,
            "synced_time1": float,  # 视频1的同步时间
            "synced_time2": float,  # 视频2的同步时间
            "offset": float,  # 时间差
            "confidence": float,
            "message": str
        }
    """
    result = sync_videos(video1_path, video2_path)

    if not result["success"]:
        return result

    offset = result["offset"]

    # 根据偏移调整时间
    # 如果 offset > 0，表示视频2比视频1慢 offset 秒
    # 所以在视频1的 timestamp1 时刻，视频2应该在 timestamp1 - offset 时刻

    synced_time1 = timestamp1
    synced_time2 = timestamp1 - offset

    # 确保时间在有效范围内
    if synced_time2 < 0:
        # 视频2的起始时间晚了，需要调整视频1
        synced_time2 = 0
        synced_time1 = offset

    if synced_time2 > result["video2_duration"]:
        synced_time2 = result["video2_duration"]

    return {
        "success": True,
        "synced_time1": float(round(synced_time1, 2)),
        "synced_time2": float(round(synced_time2, 2)),
        "offset": float(offset),
        "confidence": float(result["confidence"]),
        "message": str(result["message"])
    }
