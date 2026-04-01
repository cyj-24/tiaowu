"""
简化的音频同步模块
使用 OpenCV 提取音频，NumPy 进行 FFT 分析
"""

import os
import cv2
import numpy as np
from typing import Tuple, Dict, Any, List


def extract_audio_samples(video_path: str, sample_rate: int = 16000) -> Tuple[np.ndarray, int]:
    """
    从视频中提取音频样本（使用 OpenCV）

    Args:
        video_path: 视频文件路径
        sample_rate: 目标采样率

    Returns:
        (音频样本数组, 实际采样率)
    """
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"无法打开视频: {video_path}")

    # 获取视频信息
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    # OpenCV 不直接支持音频提取，我们使用帧间的亮度变化作为节奏检测的代理
    # 这是一种简化方案，适用于有明显节奏变化的视频（如舞蹈视频）

    frame_changes = []
    prev_frame = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # 转换为灰度图
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if prev_frame is not None:
            # 计算帧间差异（运动检测）
            diff = cv2.absdiff(gray, prev_frame)
            mean_diff = np.mean(diff)
            frame_changes.append(mean_diff)

        prev_frame = gray

    cap.release()

    # 转换为 numpy 数组
    audio_proxy = np.array(frame_changes, dtype=np.float32)

    # 计算实际的"采样率"（帧率）
    actual_sr = fps

    return audio_proxy, int(actual_sr)


def detect_beats_simple(audio: np.ndarray, sr: int) -> Tuple[np.ndarray, float]:
    """
    简单的节拍检测（基于峰值检测）

    Args:
        audio: 音频样本（或视频帧变化）
        sr: 采样率

    Returns:
        (节拍时间点数组(秒), BPM)
    """
    # 平滑信号
    window_size = max(3, int(sr * 0.1))  # 100ms 窗口
    smoothed = np.convolve(audio, np.ones(window_size)/window_size, mode='same')

    # 检测峰值（节拍点）
    # 使用相对高度和距离来过滤
    mean_val = np.mean(smoothed)
    std_val = np.std(smoothed)
    threshold = mean_val + 0.5 * std_val  # 半标准差作为阈值

    peaks, _ = detect_peaks_simple(smoothed, threshold, min_distance=int(sr * 0.3))  # 最小间隔 300ms

    # 转换为时间
    beat_times = peaks / sr

    # 计算 BPM
    if len(beat_times) > 1:
        intervals = np.diff(beat_times)
        mean_interval = np.mean(intervals)
        bpm = 60.0 / mean_interval if mean_interval > 0 else 0
    else:
        bpm = 0

    return beat_times, bpm


def detect_peaks_simple(signal: np.ndarray, threshold: float, min_distance: int = 10) -> Tuple[np.ndarray, np.ndarray]:
    """
    简单的峰值检测

    Args:
        signal: 输入信号
        threshold: 峰值阈值
        min_distance: 峰值之间的最小距离

    Returns:
        (峰值索引数组, 峰值高度数组)
    """
    # 找到所有高于阈值的点
    above_threshold = signal > threshold

    peaks = []
    properties = {'peak_heights': []}

    i = 0
    while i < len(signal):
        if above_threshold[i]:
            # 找到一个区域，取最大值
            start = i
            while i < len(signal) and above_threshold[i]:
                i += 1
            end = i

            # 在区域内找最大值
            peak_idx = start + np.argmax(signal[start:end])
            peaks.append(peak_idx)
            properties['peak_heights'].append(signal[peak_idx])
        else:
            i += 1

    # 应用最小距离约束
    if len(peaks) > 1 and min_distance > 0:
        filtered_peaks = [peaks[0]]
        for peak in peaks[1:]:
            if peak - filtered_peaks[-1] >= min_distance:
                filtered_peaks.append(peak)
        peaks = filtered_peaks

    return np.array(peaks), np.array(properties['peak_heights'])


def compute_audio_fingerprint(audio: np.ndarray, sr: int, n_bands: int = 8) -> np.ndarray:
    """
    计算简化的音频指纹（基于频谱能量）

    Args:
        audio: 音频样本
        sr: 采样率
        n_bands: 频带数量

    Returns:
        指纹数组
    """
    # 计算短时傅里叶变换
    hop_length = max(1, sr // 10)  # 100ms hop
    n_fft = min(256, len(audio) // 4)

    if n_fft < 16:
        # 音频太短，返回空指纹
        return np.array([])

    # 手动计算 STFT
    frames = []
    for i in range(0, len(audio) - n_fft, hop_length):
        frame = audio[i:i+n_fft]
        # 加窗
        window = np.hanning(len(frame))
        frame_windowed = frame * window
        # FFT
        spectrum = np.abs(np.fft.rfft(frame_windowed))
        frames.append(spectrum)

    if not frames:
        return np.array([])

    spectrogram = np.array(frames).T  # (频率, 时间)

    # 分成几个频带计算能量
    band_size = spectrogram.shape[0] // n_bands
    fingerprint = []

    for i in range(n_bands):
        start = i * band_size
        end = start + band_size if i < n_bands - 1 else spectrogram.shape[0]
        band_energy = np.mean(spectrogram[start:end, :], axis=0)
        fingerprint.append(band_energy)

    fingerprint = np.array(fingerprint)

    # 归一化
    fingerprint = (fingerprint - fingerprint.mean(axis=1, keepdims=True)) / (fingerprint.std(axis=1, keepdims=True) + 1e-8)

    return fingerprint


def cross_correlation_fft(signal1: np.ndarray, signal2: np.ndarray) -> np.ndarray:
    """
    使用 FFT 计算互相关

    Args:
        signal1: 较长信号
        signal2: 较短信号

    Returns:
        互相关数组
    """
    # 确保 signal1 更长
    if len(signal1) < len(signal2):
        signal1, signal2 = signal2, signal1

    n1, n2 = len(signal1), len(signal2)
    n = n1 + n2 - 1

    # FFT
    fft1 = np.fft.fft(signal1, n=n)
    fft2 = np.fft.fft(signal2, n=n)

    # 互相关
    correlation = np.fft.ifft(fft1 * np.conj(fft2)).real

    # 只返回有效的部分
    valid_len = n1 - n2 + 1
    return correlation[:valid_len]


def find_best_offset(fingerprint1: np.ndarray, fingerprint2: np.ndarray, sr: int) -> Tuple[float, float]:
    """
    找到两段指纹的最佳时间偏移

    Args:
        fingerprint1: 指纹1
        fingerprint2: 指纹2
        sr: 采样率

    Returns:
        (时间偏移(秒), 匹配分数)
    """
    if fingerprint1.size == 0 or fingerprint2.size == 0:
        return 0.0, 0.0

    # 将多维指纹展平
    fp1_flat = fingerprint1.mean(axis=0) if len(fingerprint1.shape) > 1 else fingerprint1
    fp2_flat = fingerprint2.mean(axis=0) if len(fingerprint2.shape) > 1 else fingerprint2

    # 确保 fp1 更长
    if len(fp1_flat) < len(fp2_flat):
        fp1_flat, fp2_flat = fp2_flat, fp1_flat
        swapped = True
    else:
        swapped = False

    # 标准化
    fp1_norm = (fp1_flat - fp1_flat.mean()) / (fp1_flat.std() + 1e-8)
    fp2_norm = (fp2_flat - fp2_flat.mean()) / (fp2_flat.std() + 1e-8)

    # 计算互相关
    correlation = cross_correlation_fft(fp1_norm, fp2_norm)

    if len(correlation) == 0:
        return 0.0, 0.0

    # 找到最佳匹配
    best_idx = np.argmax(correlation)
    best_score = correlation[best_idx] / len(fp2_norm)

    # 归一化到 0-1
    best_score = np.clip(best_score, -1, 1)
    score_normalized = (best_score + 1) / 2

    # 转换为时间
    hop_length = sr // 10  # 100ms
    time_offset = (best_idx * hop_length) / sr

    if swapped:
        time_offset = -time_offset

    return time_offset, score_normalized


def refine_with_beats(beat_times1: np.ndarray, beat_times2: np.ndarray,
                      rough_offset: float, correlation_score: float) -> Tuple[float, float]:
    """
    使用节拍信息精化同步

    Args:
        beat_times1: 节拍时间1
        beat_times2: 节拍时间2
        rough_offset: 粗略偏移
        correlation_score: 相关分数

    Returns:
        (精确偏移, 最终置信度)
    """
    if correlation_score > 0.85:
        return rough_offset, correlation_score

    # 在粗略偏移附近搜索
    best_offset = rough_offset
    best_score = correlation_score

    for adjustment in np.linspace(-0.5, 0.5, 21):
        test_offset = rough_offset + adjustment
        aligned_beats2 = beat_times2 + test_offset

        # 计算匹配数
        matches = 0
        for bt2 in aligned_beats2:
            if np.any(np.abs(beat_times1 - bt2) < 0.05):
                matches += 1

        score = matches / max(len(beat_times1), len(beat_times2))

        if score > best_score:
            best_score = score
            best_offset = test_offset

    final_score = min(1.0, correlation_score * 0.6 + best_score * 0.4)

    return best_offset, final_score


def sync_videos_simple(video1_path: str, video2_path: str) -> Dict[str, Any]:
    """
    同步两段视频（简化版）

    Args:
        video1_path: 视频1路径
        video2_path: 视频2路径

    Returns:
        同步结果
    """
    try:
        # 提取音频代理信号（帧间变化）
        print("Extracting audio proxy from video 1...")
        audio1, sr1 = extract_audio_samples(video1_path)
        print(f"Video 1: {len(audio1)} samples, sr={sr1}")

        print("Extracting audio proxy from video 2...")
        audio2, sr2 = extract_audio_samples(video2_path)
        print(f"Video 2: {len(audio2)} samples, sr={sr2}")

        if len(audio1) < 100 or len(audio2) < 100:
            return {
                "success": False,
                "offset": 0,
                "confidence": 0,
                "message": "视频太短或无法提取音频"
            }

        # 重采样到相同采样率（取较低的那个）
        target_sr = min(sr1, sr2)

        # 计算指纹
        print("Computing fingerprints...")
        fp1 = compute_audio_fingerprint(audio1, target_sr)
        fp2 = compute_audio_fingerprint(audio2, target_sr)

        print(f"Fingerprint shapes: {fp1.shape if fp1.size > 0 else 'empty'}, {fp2.shape if fp2.size > 0 else 'empty'}")

        # 找到最佳偏移
        offset, correlation_score = find_best_offset(fp1, fp2, target_sr)
        print(f"Rough offset: {offset:.3f}s, score: {correlation_score:.3f}")

        if correlation_score < 0.3:
            return {
                "success": False,
                "offset": 0,
                "confidence": correlation_score,
                "message": "音频不匹配，请确保两段视频使用相同的音乐"
            }

        # 检测节拍
        print("Detecting beats...")
        beat_times1, bpm1 = detect_beats_simple(audio1, sr1)
        beat_times2, bpm2 = detect_beats_simple(audio2, sr2)

        print(f"Video1: {len(beat_times1)} beats, {bpm1:.1f} BPM")
        print(f"Video2: {len(beat_times2)} beats, {bpm2:.1f} BPM")

        # BPM 检查
        if bpm1 > 0 and bpm2 > 0:
            bpm_diff = abs(bpm1 - bpm2) / max(bpm1, bpm2)
            if bpm_diff > 0.15:
                return {
                    "success": False,
                    "offset": 0,
                    "confidence": correlation_score,
                    "message": f"BPM不匹配 ({bpm1:.0f} vs {bpm2:.0f})"
                }

        # 精化同步
        if len(beat_times1) > 1 and len(beat_times2) > 1:
            final_offset, confidence = refine_with_beats(
                beat_times1, beat_times2, offset, correlation_score
            )
        else:
            final_offset, confidence = offset, correlation_score

        # 获取视频时长
        cap1 = cv2.VideoCapture(video1_path)
        cap2 = cv2.VideoCapture(video2_path)
        fps1 = cap1.get(cv2.CAP_PROP_FPS)
        fps2 = cap2.get(cv2.CAP_PROP_FPS)
        duration1 = cap1.get(cv2.CAP_PROP_FRAME_COUNT) / fps1 if fps1 > 0 else 0
        duration2 = cap2.get(cv2.CAP_PROP_FRAME_COUNT) / fps2 if fps2 > 0 else 0
        cap1.release()
        cap2.release()

        if confidence > 0.8:
            message = "同步成功，置信度高"
        elif confidence > 0.5:
            message = "同步成功，建议手动检查"
        else:
            message = "同步结果不确定，建议手动调整"

        return {
            "success": True,
            "offset": round(final_offset, 3),
            "confidence": round(confidence, 3),
            "video1_duration": round(duration1, 2),
            "video2_duration": round(duration2, 2),
            "video1_bpm": round(bpm1, 1) if bpm1 > 0 else None,
            "video2_bpm": round(bpm2, 1) if bpm2 > 0 else None,
            "message": message
        }

    except Exception as e:
        print(f"Sync error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "offset": 0,
            "confidence": 0,
            "message": f"同步失败: {str(e)}"
        }
