from ultralytics import YOLO
import numpy as np
from typing import List, Dict, Any

class PersonDetector:
    """YOLO 人物检测器"""

    def __init__(self):
        # 使用 YOLOv8n (nano) 轻量级模型
        try:
            self.model = YOLO('yolov8n.pt')
        except:
            # 如果模型不存在，会自动下载
            self.model = YOLO('yolov8n.pt')

    def detect(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        检测图片中的人物

        Args:
            image: numpy array (H, W, C)

        Returns:
            list: 检测到的人物列表
        """
        results = self.model(image, classes=[0], verbose=False)  # class 0 is person

        persons = []
        img_h, img_w = image.shape[:2]
        min_person_size = min(img_w, img_h) * 0.25  # 人物至少占图片短边的25%
        min_confidence = 0.6  # 最低置信度阈值 60%

        if len(results) > 0:
            boxes = results[0].boxes
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = box.conf[0].cpu().numpy()
                w, h = float(x2 - x1), float(y2 - y1)

                # 过滤掉低置信度的检测（可能是误检）
                if confidence < min_confidence:
                    print(f"Filtering low confidence detection: conf={confidence:.3f}, min required: {min_confidence}")
                    continue

                # 过滤掉太小的检测框（可能是误检）
                if w < min_person_size or h < min_person_size:
                    print(f"Filtering small detection: {w:.0f}x{h:.0f}, min required: {min_person_size:.0f}")
                    continue

                persons.append({
                    "id": i,
                    "bbox": [float(x1), float(y1), w, h],
                    "confidence": float(confidence)
                })

        # 按检测框面积排序，大的在前面（更可能是主要人物）
        persons.sort(key=lambda p: p["bbox"][2] * p["bbox"][3], reverse=True)
        # 重新分配 id
        for i, person in enumerate(persons):
            person["id"] = i

        # 如果没有检测到，返回整个图片作为一个人物
        if not persons:
            persons.append({
                "id": 0,
                "bbox": [0, 0, image.shape[1], image.shape[0]],
                "confidence": 1.0
            })

        return persons
