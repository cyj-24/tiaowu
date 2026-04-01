"""
使用大模型生成舞蹈改进建议
支持多提供商：Claude、OpenAI、通义千问
"""

import os
import json
from typing import Dict, Any, List
from enum import Enum

class LLMProvider(Enum):
    CLAUDE = "claude"
    OPENAI = "openai"
    DASHSCOPE = "dashscope"  # 通义千问

class LLMSuggestionGenerator:
    """大模型建议生成器"""

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

        elif self.provider == LLMProvider.DASHSCOPE:
            import dashscope
            dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")
            self.model = os.getenv("DASHSCOPE_MODEL", "qwen-turbo")

    def _build_prompt(self, user_pose: Dict, master_pose: Dict, angle_diffs: Dict, similarity: float) -> str:
        """构建提示词"""

        # 提取关键点数据（简化）
        user_keypoints = user_pose.get("keypoints", [])
        master_keypoints = master_pose.get("keypoints", [])

        # 关键关节映射（MediaPipe 33个关键点）
        KEYPOINT_NAMES = {
            0: "鼻子", 1: "左眼内", 2: "左眼", 3: "左眼外", 4: "右眼内",
            5: "右眼", 6: "右眼外", 7: "左耳", 8: "右耳", 9: "嘴左",
            10: "嘴右", 11: "左肩", 12: "右肩", 13: "左肘", 14: "右肘",
            15: "左腕", 16: "右腕", 17: "左小指", 18: "右小指",
            19: "左食指", 20: "右食指", 21: "左拇指", 22: "右拇指",
            23: "左髋", 24: "右髋", 25: "左膝", 26: "右膝",
            27: "左踝", 28: "右踝", 29: "左脚", 30: "右脚",
            31: "左趾", 32: "右趾"
        }

        # 构建关键点差异描述
        keypoint_diffs = []
        for i, (uk, mk) in enumerate(zip(user_keypoints, master_keypoints)):
            if uk.get("visibility", 0) > 0.5 and mk.get("visibility", 0) > 0.5:
                diff_x = uk["x"] - mk["x"]
                diff_y = uk["y"] - mk["y"]
                if abs(diff_x) > 0.05 or abs(diff_y) > 0.05:  # 只记录明显差异
                    keypoint_diffs.append(f"  {KEYPOINT_NAMES.get(i, f'点{i}')}: 位置偏移 ({diff_x:+.2f}, {diff_y:+.2f})")

        prompt = f"""你是一位专业的摇摆舞（Swing Dance）教练。请根据AI姿态分析数据，给学员提供具体、 actionable 的舞蹈改进建议。

## 分析数据

### 整体相似度
{similarity:.1f}%

### 关节角度差异（度）
"""
        # 添加角度差异
        ANGLE_NAMES = {
            "leftShoulderAngle": "左肩角度",
            "rightShoulderAngle": "右肩角度",
            "leftElbowAngle": "左肘角度",
            "rightElbowAngle": "右肘角度",
            "leftHipAngle": "左髋角度",
            "rightHipAngle": "右髋角度",
            "leftKneeAngle": "左膝角度",
            "rightKneeAngle": "右膝角度",
            "torsoAngle": "躯干角度"
        }

        for key, value in angle_diffs.items():
            name = ANGLE_NAMES.get(key, key)
            direction = "偏大" if value > 0 else "偏小"
            prompt += f"- {name}: {value:+.1f}° ({direction})\n"

        prompt += f"""
### 关键点位置差异（显著差异）
{chr(10).join(keypoint_diffs[:10]) if keypoint_diffs else "无明显位置差异"}

## 要求

1. **语气友好专业**，像经验丰富的舞蹈老师
2. **具体指出问题**：哪些身体部位需要调整
3. **给出改进方法**：如何调整姿态，具体的动作要领
4. **结合摇摆舞特点**：提及框架(frame)、姿态(posture)、律动等概念
5. **鼓励性结尾**：肯定学员的努力，给出练习建议

请用中文回复，格式如下：

**整体评价**：简要评价整体姿态

**需要改进的地方**：
• 具体问题和改进建议

**练习建议**：
1. 具体练习方法
2. 注意事项"""

        return prompt

    def generate_suggestions(self, user_pose: Dict, master_pose: Dict, angle_diffs: Dict, similarity: float) -> str:
        """生成建议"""
        prompt = self._build_prompt(user_pose, master_pose, angle_diffs, similarity)

        try:
            if self.provider == LLMProvider.CLAUDE:
                return self._call_claude(prompt)
            elif self.provider == LLMProvider.OPENAI:
                return self._call_openai(prompt)
            elif self.provider == LLMProvider.DASHSCOPE:
                return self._call_dashscope(prompt)
        except Exception as e:
            print(f"LLM调用失败: {e}")
            # 失败时回退到规则生成
            from utils.analysis import generate_suggestions
            return generate_suggestions(angle_diffs)

    def _call_claude(self, prompt: str) -> str:
        """调用 Claude API"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    def _call_openai(self, prompt: str) -> str:
        """调用 OpenAI API"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        return response.choices[0].message.content

    def _call_dashscope(self, prompt: str) -> str:
        """调用通义千问 API"""
        import dashscope
        response = dashscope.Generation.call(
            model=self.model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.output.choices[0].message.content


# 便捷函数
def generate_llm_suggestions(user_pose: Dict, master_pose: Dict, angle_diffs: Dict, similarity: float) -> str:
    """便捷函数：使用环境变量配置的LLM生成建议"""
    generator = LLMSuggestionGenerator()
    return generator.generate_suggestions(user_pose, master_pose, angle_diffs, similarity)
