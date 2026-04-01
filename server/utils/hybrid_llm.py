"""
混合方案：JSON数据 + 图片缩略图 → LLM
结合数据精确性和视觉上下文
"""

import os
import io
import base64
from typing import Dict, Any, List, Tuple
from PIL import Image
from enum import Enum

class LLMProvider(Enum):
    CLAUDE = "claude"
    OPENAI = "openai"

class HybridLLMGenerator:
    """
    混合方案LLM建议生成器
    输入：姿态数据 + 图片
    输出：结合数据和视觉的专业建议
    """

    def __init__(self, provider: LLMProvider = None):
        self.provider = provider or LLMProvider(os.getenv("LLM_PROVIDER", "claude"))
        self._init_client()

    def _init_client(self):
        """初始化对应的大模型客户端"""
        if self.provider == LLMProvider.CLAUDE:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            self.model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")

        elif self.provider == LLMProvider.OPENAI:
            from openai import OpenAI
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def compress_image(self, image_base64: str, max_size: int = 320) -> str:
        """
        压缩图片以减少Token消耗

        Args:
            image_base64: 原始图片base64
            max_size: 最大边长（默认320px，平衡成本和可视性）

        Returns:
            压缩后的base64图片
        """
        try:
            # 解码base64
            image_data = base64.b64decode(image_base64.split(",")[-1])
            img = Image.open(io.BytesIO(image_data))

            # 转换为RGB（去除透明度）
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

            # 等比例缩放
            ratio = min(max_size / img.width, max_size / img.height)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

            # 压缩质量（进一步减少大小）
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85, optimize=True)

            # 转回base64
            compressed_base64 = base64.b64encode(buffer.getvalue()).decode()
            return f"data:image/jpeg;base64,{compressed_base64}"

        except Exception as e:
            print(f"图片压缩失败: {e}")
            return image_base64  # 失败时返回原图

    def filter_significant_differences(
        self,
        user_keypoints: List[Dict],
        master_keypoints: List[Dict],
        threshold: float = 0.05
    ) -> List[Dict]:
        """
        筛选显著差异的关键点，减少Token消耗

        Args:
            user_keypoints: 用户关键点
            master_keypoints: 大师关键点
            threshold: 差异阈值（默认0.05，即5%图像尺寸）

        Returns:
            显著差异列表
        """
        KEYPOINT_NAMES = {
            0: "鼻子", 1: "左眼", 2: "左眼", 3: "左眼", 4: "右眼",
            5: "右眼", 6: "右眼", 7: "左耳", 8: "右耳", 9: "嘴",
            10: "嘴", 11: "左肩", 12: "右肩", 13: "左肘", 14: "右肘",
            15: "左腕", 16: "右腕", 17: "左手", 18: "右手",
            19: "左手", 20: "右手", 21: "左手", 22: "右手",
            23: "左髋", 24: "右髋", 25: "左膝", 26: "右膝",
            27: "左踝", 28: "右踝", 29: "左脚", 30: "右脚",
            31: "左脚", 32: "右脚"
        }

        significant = []
        priority_indices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]  # 优先关注躯干和四肢

        for i in priority_indices:
            if i >= len(user_keypoints) or i >= len(master_keypoints):
                continue

            uk = user_keypoints[i]
            mk = master_keypoints[i]

            if uk.get("visibility", 0) > 0.5 and mk.get("visibility", 0) > 0.5:
                diff_x = uk["x"] - mk["x"]
                diff_y = uk["y"] - mk["y"]
                distance = (diff_x ** 2 + diff_y ** 2) ** 0.5

                if distance > threshold:
                    significant.append({
                        "id": i,
                        "name": KEYPOINT_NAMES.get(i, f"点{i}"),
                        "user": {"x": round(uk["x"], 3), "y": round(uk["y"], 3)},
                        "master": {"x": round(mk["x"], 3), "y": round(mk["y"], 3)},
                        "diff": {"x": round(diff_x, 3), "y": round(diff_y, 3)},
                        "distance": round(distance, 3)
                    })

        # 按差异大小排序，只保留前8个最重要的
        significant.sort(key=lambda x: x["distance"], reverse=True)
        return significant[:8]

    def build_multimodal_prompt(
        self,
        user_pose: Dict,
        master_pose: Dict,
        angle_diffs: Dict,
        similarity: float,
        significant_diffs: List[Dict]
    ) -> Tuple[List[Dict], str]:
        """
        构建多模态Prompt（文本+图片）

        Returns:
            (messages, system_prompt)
        """

        # 系统提示词
        system_prompt = """你是一位专业的摇摆舞（Swing Dance）教练。你的任务是根据精确的姿态数据，结合参考图片，给学员提供具体、可操作的舞蹈改进建议。

分析原则：
1. 数据优先：以JSON数据为主要依据，图片为辅助参考
2. 具体可操作：每条建议必须包含"问题-做法-检验"三步
3. 量化描述：使用具体数字（如"降低5厘米"而非"放松一点"）
4. 舞蹈专业：结合框架(frame)、姿态(posture)、律动等概念

禁止使用的模糊词汇：放松、自然、保持、稍微、一点"""

        # 构建文本内容
        ANGLE_NAMES = {
            "leftShoulderAngle": "左肩角度（手臂展开度）",
            "rightShoulderAngle": "右肩角度（手臂展开度）",
            "leftElbowAngle": "左肘角度",
            "rightElbowAngle": "右肘角度",
            "leftHipAngle": "左髋角度",
            "rightHipAngle": "右髋角度",
            "leftKneeAngle": "左膝角度",
            "rightKneeAngle": "右膝角度",
            "torsoAngle": "躯干角度"
        }

        # 角度差异描述
        angle_desc = []
        for key, value in angle_diffs.items():
            name = ANGLE_NAMES.get(key, key)
            direction = "偏大" if value > 0 else "偏小"
            severity = "显著" if abs(value) > 20 else "明显" if abs(value) > 10 else "轻微"
            angle_desc.append(f"- {name}: {value:+.1f}° ({severity}{direction})")

        # 关键点差异描述
        kp_desc = []
        for diff in significant_diffs:
            direction_x = "偏右" if diff["diff"]["x"] > 0 else "偏左"
            direction_y = "偏下" if diff["diff"]["y"] > 0 else "偏上"
            kp_desc.append(f"- {diff['name']}: 相对于大师 {direction_x}{abs(diff['diff']['x']):.3f} {direction_y}{abs(diff['diff']['y']):.3f}")

        user_text = f"""## 精确姿态分析数据

### 整体相似度
{similarity:.1f}%{"（优秀）" if similarity > 80 else "（良好）" if similarity > 60 else "（需改进）"}

### 关节角度差异
{chr(10).join(angle_desc) if angle_desc else "- 无明显角度差异"}

### 关键点位置差异（Top {len(significant_diffs)}）
{chr(10).join(kp_desc) if kp_desc else "- 无明显位置差异"}

### 姿态特征
用户姿态：
- 左肩: ({user_pose.get('keypoints', [])[11].get('x', 0):.3f}, {user_pose.get('keypoints', [])[11].get('y', 0):.3f})
- 右肩: ({user_pose.get('keypoints', [])[12].get('x', 0):.3f}, {user_pose.get('keypoints', [])[12].get('y', 0):.3f})
- 左髋: ({user_pose.get('keypoints', [])[23].get('x', 0):.3f}, {user_pose.get('keypoints', [])[23].get('y', 0):.3f})
- 右髋: ({user_pose.get('keypoints', [])[24].get('x', 0):.3f}, {user_pose.get('keypoints', [])[24].get('y', 0):.3f})

大师姿态：
- 左肩: ({master_pose.get('keypoints', [])[11].get('x', 0):.3f}, {master_pose.get('keypoints', [])[12].get('y', 0):.3f})
- 右肩: ({master_pose.get('keypoints', [])[12].get('x', 0):.3f}, {master_pose.get('keypoints', [])[12].get('y', 0):.3f})
- 左髋: ({master_pose.get('keypoints', [])[23].get('x', 0):.3f}, {master_pose.get('keypoints', [])[23].get('y', 0):.3f})
- 右髋: ({master_pose.get('keypoints', [])[24].get('x', 0):.3f}, {master_pose.get('keypoints', [])[24].get('y', 0):.3f})

### 参考图片
下图左侧为用户姿态，右侧为大师姿态。请结合数据进行可视化对比分析。

请给出：
1. 整体评价（1句话概括+1句鼓励）
2. 最多3个需要改进的地方（按优先级），每个包含：问题描述→具体做法→检验方法
3. 3个可执行的练习建议（每个3-5分钟）
4. 鼓励的话"""

        return [{"role": "user", "content": user_text}], system_prompt

    def generate_suggestions(
        self,
        user_pose: Dict,
        master_pose: Dict,
        angle_diffs: Dict,
        similarity: float,
        user_image: str = None,
        master_image: str = None
    ) -> str:
        """
        生成混合方案建议

        Args:
            user_pose: 用户姿态数据
            master_pose: 大师姿态数据
            angle_diffs: 角度差异
            similarity: 相似度
            user_image: 用户图片（可选）
            master_image: 大师图片（可选）

        Returns:
            LLM生成的建议文本
        """
        try:
            # 1. 筛选显著差异
            significant_diffs = self.filter_significant_differences(
                user_pose.get("keypoints", []),
                master_pose.get("keypoints", [])
            )

            # 2. 构建文本Prompt
            messages, system_prompt = self.build_multimodal_prompt(
                user_pose, master_pose, angle_diffs, similarity, significant_diffs
            )

            # 3. 构建多模态内容（文本+图片）
            content = []

            # 添加文本
            content.append({
                "type": "text",
                "text": messages[0]["content"]
            })

            # 添加用户图片（压缩后）
            if user_image:
                compressed_user = self.compress_image(user_image, max_size=320)
                content.append({
                    "type": "image_url",
                    "image_url": {"url": compressed_user}
                })

            # 添加大师图片（压缩后）
            if master_image:
                compressed_master = self.compress_image(master_image, max_size=320)
                content.append({
                    "type": "image_url",
                    "image_url": {"url": compressed_master}
                })

            # 4. 调用LLM
            if self.provider == LLMProvider.CLAUDE:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=1500,
                    temperature=0.7,
                    system=system_prompt,
                    messages=[{
                        "role": "user",
                        "content": content
                    }]
                )
                return response.content[0].text

            elif self.provider == LLMProvider.OPENAI:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": content}
                    ],
                    max_tokens=1500,
                    temperature=0.7
                )
                return response.choices[0].message.content

        except Exception as e:
            print(f"混合方案生成失败: {e}")
            # 回退到纯文本方案
            from utils.llm_suggestions import generate_llm_suggestions
            return generate_llm_suggestions(user_pose, master_pose, angle_diffs, similarity)


# 便捷函数
def generate_hybrid_suggestions(
    user_pose: Dict,
    master_pose: Dict,
    angle_diffs: Dict,
    similarity: float,
    user_image: str = None,
    master_image: str = None
) -> str:
    """便捷函数：使用混合方案生成建议"""
    generator = HybridLLMGenerator()
    return generator.generate_suggestions(
        user_pose, master_pose, angle_diffs, similarity, user_image, master_image
    )
