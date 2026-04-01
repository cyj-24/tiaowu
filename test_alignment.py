#!/usr/bin/env python3
"""
视频对齐测试脚本 - 找出最佳对齐方案
"""

import sys
import numpy as np
import librosa
from scipy import signal

# 测试音频对齐
def test_alignment(video1_path, video2_path):
    print("=" * 60)
    print("视频对齐测试")
    print("=" * 60)

    # 加载音频
    print("\n[1] 加载音频...")
    y1, sr1 = librosa.load(video1_path, sr=16000, mono=True)
    y2, sr2 = librosa.load(video2_path, sr=16000, mono=True)

    duration1 = len(y1) / sr1
    duration2 = len(y2) / sr2
    print(f"  Video1: {duration1:.2f}s ({len(y1)} samples)")
    print(f"  Video2: {duration2:.2f}s ({len(y2)} samples)")

    # 预期：video1 (18s) 对应 video2 的 1.5s-19.5s
    # 所以偏移应该是约 -1.5s (video2需要跳过1.5秒)
    expected_offset = -1.5
    print(f"\n  预期偏移: {expected_offset:.1f}s (video1从video2的1.5s开始)")

    hop_length = 512

    # ========== 方法1: Onset 互相关 ==========
    print("\n[2] Onset 对齐...")
    onset1 = librosa.onset.onset_strength(y=y1, sr=sr1, hop_length=hop_length)
    onset2 = librosa.onset.onset_strength(y=y2, sr=sr2, hop_length=hop_length)

    onset1 = (onset1 - onset1.mean()) / (onset1.std() + 1e-8)
    onset2 = (onset2 - onset2.mean()) / (onset2.std() + 1e-8)

    # 子串匹配：在长的onset中找短的
    if len(onset1) < len(onset2):
        short_onset, long_onset = onset1, onset2
        swapped = False
    else:
        short_onset, long_onset = onset2, onset1
        swapped = True

    # 滑动窗口找最佳匹配
    n_short = len(short_onset)
    n_long = len(long_onset)

    correlations = []
    for start in range(n_long - n_short + 1):
        segment = long_onset[start:start+n_short]
        corr = np.corrcoef(short_onset, segment)[0, 1]
        if np.isnan(corr):
            corr = -1
        correlations.append(corr)

    best_idx = np.argmax(correlations)
    onset_offset = float(best_idx * hop_length) / 16000
    onset_score = correlations[best_idx]

    if not swapped:  # video1是短的
        onset_offset = -onset_offset

    print(f"  最佳位置: 第{best_idx}帧")
    print(f"  偏移量: {onset_offset:.3f}s, 相关系数: {onset_score:.3f}")
    print(f"  误差: {abs(onset_offset - expected_offset):.3f}s")

    # ========== 方法2: Chroma 子串匹配 ==========
    print("\n[3] Chroma 对齐...")
    chroma1 = librosa.feature.chroma_stft(y=y1, sr=sr1, hop_length=hop_length)
    chroma2 = librosa.feature.chroma_stft(y=y2, sr=sr2, hop_length=hop_length)

    # L2归一化
    chroma1 = chroma1 / (np.linalg.norm(chroma1, axis=0, keepdims=True) + 1e-8)
    chroma2 = chroma2 / (np.linalg.norm(chroma2, axis=0, keepdims=True) + 1e-8)

    if chroma1.shape[1] < chroma2.shape[1]:
        short_chroma, long_chroma = chroma1, chroma2
        swapped = False
    else:
        short_chroma, long_chroma = chroma2, chroma1
        swapped = True

    n_short = short_chroma.shape[1]
    n_long = long_chroma.shape[1]

    # 计算余弦相似度
    similarities = []
    for start in range(n_long - n_short + 1):
        segment = long_chroma[:, start:start+n_short]
        # 逐帧余弦相似度
        sim = np.mean(np.sum(short_chroma * segment, axis=0))
        similarities.append(sim)

    best_idx = np.argmax(similarities)
    chroma_offset = float(best_idx * hop_length) / 16000
    chroma_score = similarities[best_idx]

    if not swapped:
        chroma_offset = -chroma_offset

    print(f"  最佳位置: 第{best_idx}帧")
    print(f"  偏移量: {chroma_offset:.3f}s, 相似度: {chroma_score:.3f}")
    print(f"  误差: {abs(chroma_offset - expected_offset):.3f}s")

    # ========== 方法3: Mel频谱子串匹配 ==========
    print("\n[4] Mel频谱对齐...")
    mel1 = librosa.feature.melspectrogram(y=y1, sr=sr1, hop_length=hop_length, n_mels=40)
    mel2 = librosa.feature.melspectrogram(y=y2, sr=sr2, hop_length=hop_length, n_mels=40)

    mel1 = librosa.power_to_db(mel1, ref=np.max)
    mel2 = librosa.power_to_db(mel2, ref=np.max)

    # 标准化
    mel1 = (mel1 - mel1.mean(axis=0)) / (mel1.std(axis=0) + 1e-8)
    mel2 = (mel2 - mel2.mean(axis=0)) / (mel2.std(axis=0) + 1e-8)

    if mel1.shape[1] < mel2.shape[1]:
        short_mel, long_mel = mel1, mel2
        swapped = False
    else:
        short_mel, long_mel = mel2, mel1
        swapped = True

    n_short = short_mel.shape[1]
    n_long = long_mel.shape[1]

    # 计算欧氏距离（越小越好）
    distances = []
    step = max(1, (n_long - n_short) // 100)  # 最多检查100个位置

    for start in range(0, n_long - n_short + 1, step):
        segment = long_mel[:, start:start+n_short]
        dist = np.mean([np.linalg.norm(short_mel[:, i] - segment[:, i]) for i in range(n_short)])
        distances.append((start, dist))

    best_start, best_dist = min(distances, key=lambda x: x[1])
    mel_offset = float(best_start * hop_length) / 16000
    mel_score = 1 - (best_dist / 20)  # 粗略归一化

    if not swapped:
        mel_offset = -mel_offset

    print(f"  最佳位置: 第{best_start}帧")
    print(f"  偏移量: {mel_offset:.3f}s, 距离: {best_dist:.3f}")
    print(f"  误差: {abs(mel_offset - expected_offset):.3f}s")

    # ========== 汇总 ==========
    print("\n" + "=" * 60)
    print("结果汇总")
    print("=" * 60)
    print(f"预期偏移: {expected_offset:.2f}s")
    print(f"\nOnset:    {onset_offset:+.3f}s (误差 {abs(onset_offset - expected_offset):.3f}s, 分数 {onset_score:.3f})")
    print(f"Chroma:   {chroma_offset:+.3f}s (误差 {abs(chroma_offset - expected_offset):.3f}s, 分数 {chroma_score:.3f})")
    print(f"Mel:      {mel_offset:+.3f}s (误差 {abs(mel_offset - expected_offset):.3f}s, 分数 {mel_score:.3f})")

    # 选择最佳结果
    results = [
        (onset_offset, onset_score, "Onset"),
        (chroma_offset, chroma_score, "Chroma"),
        (mel_offset, mel_score, "Mel"),
    ]

    # 按误差排序
    results_by_error = sorted(results, key=lambda x: abs(x[0] - expected_offset))
    print(f"\n最接近预期的: {results_by_error[0][2]} ({results_by_error[0][0]:+.3f}s)")

    # 按分数排序（分数>0.5的）
    results_by_score = sorted([r for r in results if r[1] > 0.5], key=lambda x: x[1], reverse=True)
    if results_by_score:
        print(f"最高置信度: {results_by_score[0][2]} ({results_by_score[0][0]:+.3f}s, 分数 {results_by_score[0][1]:.3f})")

    return results_by_error[0][0] if results_by_error else 0.0


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        video1 = sys.argv[1]
        video2 = sys.argv[2]
    else:
        # 使用默认路径
        video1 = "/Users/chengyujuan/swing-dance-analyzer/test_videos/video1.mp4"
        video2 = "/Users/chengyujuan/swing-dance-analyzer/test_videos/video2.mp4"

    test_alignment(video1, video2)
