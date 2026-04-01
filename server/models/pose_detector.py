import mediapipe as mp
import numpy as np
import cv2
from typing import List, Dict, Any

# MediaPipe 0.10+ 新 API
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode
from mediapipe.tasks.python.core.base_options import BaseOptions

class PoseDetector:
    """MediaPipe 姿态检测器"""

    def __init__(self):
        try:
            # 使用新的 Task API
            options = PoseLandmarkerOptions(
                base_options=BaseOptions(model_asset_path='pose_landmarker.task'),
                running_mode=RunningMode.IMAGE,
                num_poses=1,
                min_pose_detection_confidence=0.5,
                min_pose_presence_confidence=0.5,
                min_tracking_confidence=0.5
            )
            self.detector = PoseLandmarker.create_from_options(options)
            self.mp_pose = mp.solutions.pose if hasattr(mp, 'solutions') else None
        except Exception as e:
            print(f"MediaPipe Task init error: {e}")
            print("Trying legacy API...")
            # 回退到旧 API
            try:
                self.mp_pose = mp.solutions.pose
                self.pose = self.mp_pose.Pose(
                    static_image_mode=True,
                    model_complexity=1,
                    enable_segmentation=False,
                    min_detection_confidence=0.5
                )
                self.detector = None
            except Exception as e2:
                print(f"Legacy API also failed: {e2}")
                self.detector = None
                self.pose = None

    def detect_pose(self, image: np.ndarray) -> Dict[str, Any]:
        """检测图片中的姿态（返回标准化坐标）"""
        print(f"Detecting pose on image shape: {image.shape}, dtype: {image.dtype}")

        if self.detector is None and self.pose is None:
            print("No detector available, using fallback")
            return self._fallback_pose(image)

        try:
            import cv2
            # 确保图片是 RGB uint8 格式
            if len(image.shape) == 3 and image.shape[2] == 3:
                # 转换 BGR -> RGB
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) if image.shape[2] == 3 else image
            else:
                image_rgb = image

            # 确保是 uint8
            if image_rgb.dtype != np.uint8:
                image_rgb = (image_rgb * 255).astype(np.uint8) if image_rgb.max() <= 1.0 else image_rgb.astype(np.uint8)

            # 如果图片太小，放大到最小尺寸以提高检测率
            h, w = image_rgb.shape[:2]
            min_dim = 480  # MediaPipe 推荐的最小尺寸
            if h < min_dim or w < min_dim:
                scale = max(min_dim / h, min_dim / w)
                new_w, new_h = int(w * scale), int(h * scale)
                image_rgb = cv2.resize(image_rgb, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
                print(f"Resized small image from {w}x{h} to {new_w}x{new_h}")

            print(f"Image ready for detection: shape={image_rgb.shape}, dtype={image_rgb.dtype}")

            # 使用新的 Task API
            if self.detector:
                import mediapipe as mp
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
                results = self.detector.detect(mp_image)

                print(f"Detection results: pose_landmarks = {results.pose_landmarks}")
                print(f"pose_landmarks type: {type(results.pose_landmarks)}")
                print(f"pose_landmarks length: {len(results.pose_landmarks) if results.pose_landmarks else 0}")

                if not results.pose_landmarks or len(results.pose_landmarks) == 0:
                    print("No pose detected, using fallback")
                    return self._fallback_pose(image)

                # 提取关键点 (新 API 返回的是扁平列表)
                keypoints = []
                landmarks = results.pose_landmarks[0]  # 取第一个检测到的人
                print(f"First landmark: x={landmarks[0].x:.3f}, y={landmarks[0].y:.3f}, visibility={landmarks[0].visibility if hasattr(landmarks[0], 'visibility') else landmarks[0].presence}")

                for landmark in landmarks:
                    keypoints.append({
                        "x": landmark.x,
                        "y": landmark.y,
                        "z": landmark.z,
                        "visibility": landmark.visibility if hasattr(landmark, 'visibility') else landmark.presence
                    })

            else:
                # 使用旧 API
                results = self.pose.process(image_rgb)

                if not results.pose_landmarks:
                    return self._fallback_pose(image)

                keypoints = []
                landmarks = results.pose_landmarks.landmark

                for landmark in landmarks:
                    keypoints.append({
                        "x": landmark.x,
                        "y": landmark.y,
                        "z": landmark.z,
                        "visibility": landmark.visibility
                    })

            # 计算边界框（使用原始坐标）
            visible_points = [(kp["x"], kp["y"]) for kp in keypoints if kp["visibility"] > 0.5]

            if visible_points:
                xs = [p[0] for p in visible_points]
                ys = [p[1] for p in visible_points]
                bbox = [
                    min(xs) * image.shape[1],
                    min(ys) * image.shape[0],
                    (max(xs) - min(xs)) * image.shape[1],
                    (max(ys) - min(ys)) * image.shape[0]
                ]
            else:
                bbox = [0, 0, image.shape[1], image.shape[0]]

            return {
                "keypoints": keypoints,  # 原始坐标（0-1范围，用于可视化）
                "bbox": bbox
            }

        except Exception as e:
            print(f"Pose detection error: {e}")
            import traceback
            traceback.print_exc()
            return self._fallback_pose(image)

    def _fallback_pose(self, image: np.ndarray) -> Dict[str, Any]:
        """生成默认姿态（检测失败时使用）"""
        h, w = image.shape[:2]
        keypoints = []
        for i in range(33):
            keypoints.append({
                "x": 0.5,
                "y": 0.5,
                "z": 0,
                "visibility": 0.5
            })

        return {
            "keypoints": keypoints,
            "bbox": [w*0.2, h*0.1, w*0.6, h*0.8]
        }

    def normalize_keypoints(self, keypoints: List[Dict], img_h: int, img_w: int) -> List[Dict]:
        """
        标准化关键点坐标，消除纵横比差异影响

        方法：
        1. 使用肩宽作为基准计算缩放因子
        2. 将坐标投影到统一比例的正方形空间（肩宽 = 1.0）
        3. 以两肩中心为原点

        Args:
            keypoints: 原始关键点列表（归一化坐标 0-1）
            img_h, img_w: 图片原始尺寸

        Returns:
            标准化后的关键点（肩宽为1.0的单位坐标系）
        """
        if len(keypoints) < 13:
            return keypoints

        left_shoulder = keypoints[11]  # 左肩
        right_shoulder = keypoints[12]  # 右肩

        # 检查肩膀点是否可见
        if left_shoulder["visibility"] < 0.5 or right_shoulder["visibility"] < 0.5:
            # 如果肩膀不可见，使用髋部作为基准
            if len(keypoints) >= 24:
                left_hip = keypoints[23]
                right_hip = keypoints[24]
                if left_hip["visibility"] >= 0.5 and right_hip["visibility"] >= 0.5:
                    shoulder_center_x = (left_hip["x"] + right_hip["x"]) / 2
                    shoulder_center_y = (left_hip["y"] + right_hip["y"]) / 2
                    # 使用髋宽作为基准（髋宽约等于肩宽）
                    scale = abs(right_hip["x"] - left_hip["x"])
                    if scale < 0.01:  # 避免除以0
                        print(f"Normalization skipped: hip width too small ({scale:.4f})")
                        return keypoints
                else:
                    print("Normalization skipped: shoulders not visible, hips not visible")
                    return keypoints
            else:
                print("Normalization skipped: not enough keypoints")
                return keypoints
        else:
            # 计算肩膀中心
            shoulder_center_x = (left_shoulder["x"] + right_shoulder["x"]) / 2
            shoulder_center_y = (left_shoulder["y"] + right_shoulder["y"]) / 2
            # 肩宽作为基准（归一化坐标空间中）
            scale = abs(right_shoulder["x"] - left_shoulder["x"])
            if scale < 0.01:  # 避免除以0
                print(f"Normalization skipped: shoulder width too small ({scale:.4f})")
                return keypoints

        # 标准化所有关键点
        normalized = []
        aspect_ratio = img_w / img_h
        for kp in keypoints:
            # 以肩膀中心为原点，肩宽为1.0进行标准化
            norm_x = (kp["x"] - shoulder_center_x) / scale
            # y轴也要按比例缩放，消除纵横比影响
            norm_y = (kp["y"] - shoulder_center_y) / scale * aspect_ratio

            normalized.append({
                "x": norm_x,
                "y": norm_y,
                "z": kp["z"],
                "visibility": kp["visibility"]
            })

        print(f"Normalized keypoints: shoulder_width={scale:.4f}, aspect_ratio={aspect_ratio:.3f}")
        print(f"  Left shoulder: ({normalized[11]['x']:.3f}, {normalized[11]['y']:.3f})")
        print(f"  Right shoulder: ({normalized[12]['x']:.3f}, {normalized[12]['y']:.3f})")

        return normalized

    def calculate_angle(self, p1: Dict, p2: Dict, p3: Dict) -> float:
        """计算三个点形成的角度"""
        a = np.array([p1["x"], p1["y"]])
        b = np.array([p2["x"], p2["y"]])
        c = np.array([p3["x"], p3["y"]])

        ba = a - b
        bc = c - b

        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))

        return np.degrees(angle)

    def get_joint_angles(self, pose: Dict[str, Any]) -> Dict[str, float]:
        """计算关节角度"""
        keypoints = pose["keypoints"]
        if len(keypoints) < 33:
            return {}

        angles = {}

        # 肩膀角度
        try:
            if keypoints[11]["visibility"] > 0.5 and keypoints[13]["visibility"] > 0.5 and keypoints[15]["visibility"] > 0.5:
                angles["leftShoulderAngle"] = self.calculate_angle(
                    keypoints[13], keypoints[11], keypoints[12]
                )
        except: pass

        try:
            if keypoints[12]["visibility"] > 0.5 and keypoints[14]["visibility"] > 0.5 and keypoints[16]["visibility"] > 0.5:
                angles["rightShoulderAngle"] = self.calculate_angle(
                    keypoints[14], keypoints[12], keypoints[11]
                )
        except: pass

        # 肘部角度
        try:
            if keypoints[11]["visibility"] > 0.5 and keypoints[13]["visibility"] > 0.5 and keypoints[15]["visibility"] > 0.5:
                angles["leftElbowAngle"] = self.calculate_angle(
                    keypoints[11], keypoints[13], keypoints[15]
                )
        except: pass

        try:
            if keypoints[12]["visibility"] > 0.5 and keypoints[14]["visibility"] > 0.5 and keypoints[16]["visibility"] > 0.5:
                angles["rightElbowAngle"] = self.calculate_angle(
                    keypoints[12], keypoints[14], keypoints[16]
                )
        except: pass

        # 髋部角度
        try:
            if keypoints[11]["visibility"] > 0.5 and keypoints[23]["visibility"] > 0.5 and keypoints[25]["visibility"] > 0.5:
                angles["leftHipAngle"] = self.calculate_angle(
                    keypoints[11], keypoints[23], keypoints[25]
                )
        except: pass

        try:
            if keypoints[12]["visibility"] > 0.5 and keypoints[24]["visibility"] > 0.5 and keypoints[26]["visibility"] > 0.5:
                angles["rightHipAngle"] = self.calculate_angle(
                    keypoints[12], keypoints[24], keypoints[26]
                )
        except: pass

        # 膝盖角度
        try:
            if keypoints[23]["visibility"] > 0.5 and keypoints[25]["visibility"] > 0.5 and keypoints[27]["visibility"] > 0.5:
                angles["leftKneeAngle"] = self.calculate_angle(
                    keypoints[23], keypoints[25], keypoints[27]
                )
        except: pass

        try:
            if keypoints[24]["visibility"] > 0.5 and keypoints[26]["visibility"] > 0.5 and keypoints[28]["visibility"] > 0.5:
                angles["rightKneeAngle"] = self.calculate_angle(
                    keypoints[24], keypoints[26], keypoints[28]
                )
        except: pass

        # 躯干角度
        try:
            if keypoints[11]["visibility"] > 0.5 and keypoints[23]["visibility"] > 0.5:
                shoulder_y = keypoints[11]["y"]
                hip_y = keypoints[23]["y"]
                angles["torsoAngle"] = np.degrees(np.arctan2(
                    shoulder_y - hip_y,
                    abs(keypoints[11]["x"] - keypoints[23]["x"]) + 1e-6
                ))
        except: pass

        return angles
