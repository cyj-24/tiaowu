"""
视频处理API - 关键帧提取和视频同步
"""

import cv2
import numpy as np
import base64
import io
import tempfile
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from PIL import Image

router = APIRouter()

# 导入音频同步模块
try:
    from utils.audio_sync import sync_videos, sync_video_frames
    AUDIO_SYNC_AVAILABLE = True
except ImportError as e:
    print(f"Audio sync module not available: {e}")
    AUDIO_SYNC_AVAILABLE = False

# 导入视频拼接模块
try:
    from utils.video_merger import merge_videos_side_by_side, extract_frame_at_time
    VIDEO_MERGER_AVAILABLE = True
except ImportError as e:
    print(f"Video merger not available: {e}")
    VIDEO_MERGER_AVAILABLE = False

@router.post("/video-info")
async def get_video_info(video: UploadFile = File(...)):
    """
    获取视频基本信息

    Returns:
        时长、FPS、分辨率等
    """
    try:
        contents = await video.read()

        # 保存临时文件
        temp_file = "/tmp/temp_video_info.mp4"
        with open(temp_file, "wb") as f:
            f.write(contents)

        cap = cv2.VideoCapture(temp_file)

        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="无法打开视频文件")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0

        cap.release()

        return {
            "success": True,
            "duration": round(duration, 2),
            "fps": round(fps, 2),
            "totalFrames": total_frames,
            "width": width,
            "height": height,
            "aspectRatio": round(width / height, 2) if height > 0 else 0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-keyframes")
async def extract_keyframes(
    video: UploadFile = File(...),
    num_frames: int = Form(5)  # 默认提取5个关键帧
):
    """
    自动提取视频中的关键帧（场景变化较大的帧）

    Args:
        video: 视频文件
        num_frames: 要提取的关键帧数量

    Returns:
        关键帧列表（包含时间戳和图片）
    """
    try:
        contents = await video.read()

        # 保存临时文件
        temp_file = "/tmp/temp_video_keyframes.mp4"
        with open(temp_file, "wb") as f:
            f.write(contents)

        cap = cv2.VideoCapture(temp_file)

        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="无法打开视频文件")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0

        # 均匀采样提取关键帧
        keyframes = []
        timestamps = np.linspace(2, max(duration - 2, 2), num_frames)  # 避开开头结尾

        for ts in timestamps:
            frame_number = int(ts * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()

            if ret:
                # 转换为base64
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                pil_image = pil_image.resize((320, int(320 * pil_image.height / pil_image.width)))

                buffered = io.BytesIO()
                pil_image.save(buffered, format="JPEG", quality=85)
                img_base64 = base64.b64encode(buffered.getvalue()).decode()

                keyframes.append({
                    "timestamp": round(ts, 2),
                    "image": f"data:image/jpeg;base64,{img_base64}"
                })

        cap.release()

        return {
            "success": True,
            "keyframes": keyframes,
            "duration": duration
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-videos")
async def sync_two_videos(
    video1: UploadFile = File(...),
    video2: UploadFile = File(...)
):
    """
    通过音频指纹和节拍检测同步两段视频

    Args:
        video1: 第一段视频
        video2: 第二段视频

    Returns:
        同步信息（时间偏移、置信度等）
    """
    if not AUDIO_SYNC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="音频同步功能暂不可用，请检查依赖安装"
        )

    temp_files = []

    print(f"[API] Received sync request: {video1.filename}, {video2.filename}")

    try:
        # 保存视频到临时文件
        video1_path = f"/tmp/sync_video1_{video1.filename}"
        video2_path = f"/tmp/sync_video2_{video2.filename}"

        print(f"[API] Saving to {video1_path}, {video2_path}")

        with open(video1_path, "wb") as f:
            f.write(await video1.read())
        with open(video2_path, "wb") as f:
            f.write(await video2.read())

        temp_files = [video1_path, video2_path]

        print(f"[API] Files saved, starting sync...")

        # 执行同步（添加超时保护）
        import asyncio
        print(f"Starting sync: {video1.filename} vs {video2.filename}")

        # 使用线程池执行同步，防止阻塞
        loop = asyncio.get_event_loop()
        raw_result = await asyncio.wait_for(
            loop.run_in_executor(None, sync_videos, video1_path, video2_path),
            timeout=30  # 30秒超时
        )

        print(f"[API] Raw result: {raw_result}")

        # 使用 JSON 序列化/反序列化来确保所有类型都是可序列化的
        import json
        try:
            # 先将结果转换为 JSON 字符串，再解析回来
            # 这样可以确保所有 numpy 类型都被转换为 Python 原生类型
            json_str = json.dumps(raw_result, default=lambda x: float(x) if hasattr(x, '__float__') else str(x))
            result = json.loads(json_str)
            print(f"[API] JSON round-trip successful")
        except Exception as e:
            print(f"[API] JSON conversion error: {e}")
            # 如果转换失败，手动构建结果
            result = {
                "success": bool(raw_result.get("success", False)),
                "offset": float(raw_result.get("offset", 0) or 0),
                "confidence": float(raw_result.get("confidence", 0) or 0),
                "video1_duration": float(raw_result.get("video1_duration", 0) or 0),
                "video2_duration": float(raw_result.get("video2_duration", 0) or 0),
                "message": str(raw_result.get("message", ""))
            }

        print(f"[API] Returning: {result}")
        return JSONResponse(content=result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # 清理临时文件
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass


@router.post("/sync-frames")
async def get_synced_frames(
    video1: UploadFile = File(...),
    video2: UploadFile = File(...),
    timestamp1: float = Form(...),
    timestamp2: float = Form(...)
):
    """
    基于音频同步，获取两个视频的最佳对齐帧

    Args:
        video1: 第一段视频
        video2: 第二段视频
        timestamp1: 视频1的目标时间（秒）
        timestamp2: 视频2的目标时间（秒）

    Returns:
        同步后的时间和提取的帧
    """
    if not AUDIO_SYNC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="音频同步功能暂不可用，请检查依赖安装"
        )

    temp_files = []

    try:
        # 保存视频到临时文件
        video1_path = f"/tmp/sync_frame_video1_{video1.filename}"
        video2_path = f"/tmp/sync_frame_video2_{video2.filename}"

        with open(video1_path, "wb") as f:
            f.write(await video1.read())
        with open(video2_path, "wb") as f:
            f.write(await video2.read())

        temp_files = [video1_path, video2_path]

        # 执行同步
        sync_result = sync_video_frames(video1_path, video2_path, timestamp1, timestamp2)

        if not sync_result["success"]:
            return sync_result

        # 提取同步后的帧
        frames = []
        for video_path, synced_time in [
            (video1_path, sync_result["synced_time1"]),
            (video2_path, sync_result["synced_time2"])
        ]:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_number = int(synced_time * fps)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
                ret, frame = cap.read()

                if ret:
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(frame_rgb)

                    buffered = io.BytesIO()
                    pil_image.save(buffered, format="JPEG", quality=95)
                    img_base64 = base64.b64encode(buffered.getvalue()).decode()
                    frames.append(f"data:image/jpeg;base64,{img_base64}")
                else:
                    frames.append(None)

                cap.release()

        return {
            **sync_result,
            "frames": frames
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass


@router.post("/merge-videos")
async def merge_synced_videos(
    video1: UploadFile = File(...),
    video2: UploadFile = File(...),
    offset: float = Form(...),
    manual_adjust: float = Form(0.0)
):
    """
    将两段视频对齐后拼接成并排视频

    Args:
        video1: 第一段视频
        video2: 第二段视频
        offset: 时间偏移（秒）
        manual_adjust: 手动调整偏移（秒），正值表示让video2更晚出现

    Returns:
        合并后的视频文件
    """
    if not VIDEO_MERGER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="视频拼接功能暂不可用，请检查 FFmpeg 安装"
        )

    temp_files = []
    merged_video_path = None

    try:
        # 保存视频到临时文件
        video1_path = f"/tmp/merge_video1_{video1.filename}"
        video2_path = f"/tmp/merge_video2_{video2.filename}"
        merged_video_path = f"/tmp/merged_{video1.filename}.mp4"

        with open(video1_path, "wb") as f:
            f.write(await video1.read())
        with open(video2_path, "wb") as f:
            f.write(await video2.read())

        temp_files = [video1_path, video2_path]

        print(f"[Merge] Starting merge with offset={offset}, manual_adjust={manual_adjust}")

        # 执行视频拼接
        success, message = merge_videos_side_by_side(
            video1_path, video2_path, offset, merged_video_path, manual_adjust=manual_adjust
        )

        if not success:
            raise HTTPException(status_code=500, detail=message)

        if not os.path.exists(merged_video_path):
            raise HTTPException(status_code=500, detail="合并视频文件未生成")

        print(f"[Merge] Success: {message}")

        # 返回合并后的视频
        return FileResponse(
            merged_video_path,
            media_type="video/mp4",
            filename="merged_video.mp4"
        )

    except Exception as e:
        print(f"[Merge] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # 清理临时文件（保留合并后的视频，由 FileResponse 处理）
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass


@router.post("/extract-frame")
async def extract_frame_from_video(
    video: UploadFile = File(...),
    time_sec: float = Form(...)
):
    """
    从视频中提取指定时间的帧

    Args:
        video: 视频文件
        time_sec: 时间点（秒）

    Returns:
        base64 编码的图片
    """
    video_path = None

    try:
        # 保存视频到临时文件
        video_path = f"/tmp/extract_frame_{video.filename}"
        with open(video_path, "wb") as f:
            f.write(await video.read())

        print(f"[Extract] Extracting frame at {time_sec}s")

        # 提取帧
        frame_data = extract_frame_at_time(video_path, time_sec)

        if frame_data is None:
            raise HTTPException(status_code=500, detail="提取帧失败")

        # 转换为 base64
        import base64
        img_base64 = base64.b64encode(frame_data).decode()

        return JSONResponse(content={
            "success": True,
            "time": time_sec,
            "image": f"data:image/jpeg;base64,{img_base64}"
        })

    except Exception as e:
        print(f"[Extract] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if video_path and os.path.exists(video_path):
            try:
                os.remove(video_path)
            except:
                pass


@router.post("/audio-waveform")
async def get_audio_waveform(
    video1: UploadFile = File(...),
    video2: UploadFile = File(...)
):
    """
    提取两段视频的音频波形和onset数据，用于调试对齐

    Returns:
        音频波形数据和onset强度曲线
    """
    if not AUDIO_SYNC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="音频分析功能暂不可用"
        )

    temp_files = []

    try:
        # 保存视频（使用安全文件名，避免中文特殊字符问题）
        import uuid
        ext1 = os.path.splitext(video1.filename)[1] if '.' in video1.filename else '.mp4'
        ext2 = os.path.splitext(video2.filename)[1] if '.' in video2.filename else '.mp4'
        video1_path = f"/tmp/waveform_video1_{uuid.uuid4().hex}{ext1}"
        video2_path = f"/tmp/waveform_video2_{uuid.uuid4().hex}{ext2}"

        with open(video1_path, "wb") as f:
            f.write(await video1.read())
        with open(video2_path, "wb") as f:
            f.write(await video2.read())

        temp_files = [video1_path, video2_path]

        # 提取音频
        from utils.audio_sync import (
            extract_audio_from_video,
            align_by_onset,
            align_by_chroma,
            compute_chromaprint_fingerprint,
            find_best_match
        )
        audio1_path = extract_audio_from_video(video1_path)
        audio2_path = extract_audio_from_video(video2_path)
        temp_files.extend([audio1_path, audio2_path])

        import librosa
        import numpy as np

        # 加载音频数据
        y1, sr1 = librosa.load(audio1_path, sr=16000, mono=True)
        y2, sr2 = librosa.load(audio2_path, sr=16000, mono=True)

        # 计算onset强度
        hop_length = 512
        onset1 = librosa.onset.onset_strength(y=y1, sr=sr1, hop_length=hop_length)
        onset2 = librosa.onset.onset_strength(y=y2, sr=sr2, hop_length=hop_length)

        # 计算 Chroma 特征（音高）
        chroma1 = librosa.feature.chroma_stft(y=y1, sr=sr1, hop_length=hop_length)
        chroma2 = librosa.feature.chroma_stft(y=y2, sr=sr2, hop_length=hop_length)

        # 降采样波形数据以减少传输大小（每100个点取一个）
        def downsample(data, factor=100):
            if len(data) <= factor:
                return data.tolist()
            return data[::factor].tolist()

        # 降采样 Chroma（每10帧取一个）
        def downsample_chroma(chroma, factor=10):
            return chroma[:, ::factor].tolist()

        # 计算时间轴
        duration1 = len(y1) / sr1
        duration2 = len(y2) / sr2
        onset_times1 = librosa.frames_to_time(np.arange(len(onset1)), sr=sr1, hop_length=hop_length).tolist()
        onset_times2 = librosa.frames_to_time(np.arange(len(onset2)), sr=sr2, hop_length=hop_length).tolist()

        # 检测节拍
        try:
            tempo1, beat_frames1 = librosa.beat.beat_track(y=y1, sr=sr1, onset_envelope=onset1)
            tempo2, beat_frames2 = librosa.beat.beat_track(y=y2, sr=sr2, onset_envelope=onset2)
            beat_times1 = librosa.frames_to_time(beat_frames1, sr=sr1).tolist()
            beat_times2 = librosa.frames_to_time(beat_frames2, sr=sr2).tolist()
        except:
            beat_times1, beat_times2 = [], []
            tempo1, tempo2 = 0, 0

        # 计算三种算法的对齐结果
        print("[Waveform API] Computing alignment algorithms...")

        # Mel 频谱
        fp1, sr_fp = compute_chromaprint_fingerprint(audio1_path)
        fp2, _ = compute_chromaprint_fingerprint(audio2_path)
        mel_offset, mel_score, _, _ = find_best_match(fp1, fp2, sr_fp)

        # Onset
        onset_offset, onset_score = align_by_onset(audio1_path, audio2_path)

        # Chroma
        chroma_offset, chroma_score = align_by_chroma(audio1_path, audio2_path)

        algorithms = {
            "mel": {"offset": float(mel_offset), "score": float(mel_score)},
            "onset": {"offset": float(onset_offset), "score": float(onset_score)},
            "chroma": {"offset": float(chroma_offset), "score": float(chroma_score)}
        }
        print(f"[Waveform API] Algorithms: {algorithms}")

        return {
            "success": True,
            "video1": {
                "duration": float(duration1),
                "waveform": downsample(y1),
                "onset": onset1.tolist(),
                "onset_times": onset_times1,
                "beat_times": beat_times1,
                "bpm": float(tempo1),
                "chroma": downsample_chroma(chroma1),
                "chroma_times": onset_times1[::10]  # 与chroma降采样对应
            },
            "video2": {
                "duration": float(duration2),
                "waveform": downsample(y2),
                "onset": onset2.tolist(),
                "onset_times": onset_times2,
                "beat_times": beat_times2,
                "bpm": float(tempo2),
                "chroma": downsample_chroma(chroma2),
                "chroma_times": onset_times2[::10]
            },
            "algorithms": algorithms
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for f in temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass
