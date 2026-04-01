import numpy as np
import os
from typing import Dict, Any, List
from models.pose_detector import PoseDetector

def analyze_pose_difference(pose1: Dict[str, Any], pose2: Dict[str, Any], use_llm: bool = None, user_image: str = None, master_image: str = None) -> Dict[str, Any]:
    """
    分析两个姿态的差异

    Args:
        pose1: 用户姿态
        pose2: 大师姿态
        use_llm: 是否使用大模型生成建议（默认从环境变量读取）
        user_image: 用户图片base64（混合方案使用）
        master_image: 大师图片base64（混合方案使用）

    Returns:
        dict: 包含角度差异和建议
    """
    detector = PoseDetector()

    # 标准化关键点坐标（消除纵横比差异影响）
    # 获取图片尺寸用于标准化（从bbox估算或使用默认值）
    img1_w, img1_h = 1000, 1000  # 默认尺寸，标准化会以肩宽为基准
    img2_w, img2_h = 1000, 1000
    if pose1.get("bbox"):
        img1_w, img1_h = pose1["bbox"][2] * 2, pose1["bbox"][3] * 3  # 估算原图尺寸
    if pose2.get("bbox"):
        img2_w, img2_h = pose2["bbox"][2] * 2, pose2["bbox"][3] * 3

    keypoints1_normalized = detector.normalize_keypoints(pose1["keypoints"], img1_h, img1_w)
    keypoints2_normalized = detector.normalize_keypoints(pose2["keypoints"], img2_h, img2_w)

    # 使用标准化后的坐标计算角度
    pose1_normalized = {"keypoints": keypoints1_normalized}
    pose2_normalized = {"keypoints": keypoints2_normalized}

    # 计算关节角度（使用标准化坐标）
    angles1 = detector.get_joint_angles(pose1_normalized)
    angles2 = detector.get_joint_angles(pose2_normalized)

    # 计算差异
    angle_diffs = {}
    for key in angles1.keys():
        if key in angles2:
            angle_diffs[key] = round(angles1[key] - angles2[key], 2)

    # 计算整体相似度
    if angle_diffs:
        avg_diff = np.mean([abs(diff) for diff in angle_diffs.values()])
        similarity = max(0, min(100, 100 - avg_diff * 1.5))
    else:
        similarity = 50  # 默认值

    # 生成建议
    if use_llm is None:
        use_llm = os.getenv("USE_LLM_SUGGESTIONS", "false").lower() == "true"

    if use_llm:
        try:
            # 检查是否有图片，使用混合方案
            if user_image and master_image:
                from utils.hybrid_llm import generate_hybrid_suggestions
                suggestions = generate_hybrid_suggestions(
                    pose1, pose2, angle_diffs, similarity,
                    user_image=user_image,
                    master_image=master_image
                )
                print("使用混合方案（数据+图片）生成建议成功")
            else:
                from utils.llm_suggestions import generate_llm_suggestions
                suggestions = generate_llm_suggestions(pose1, pose2, angle_diffs, similarity)
                print("使用纯数据LLM生成建议成功")
        except Exception as e:
            print(f"LLM建议生成失败，回退到规则: {e}")
            suggestions = generate_suggestions(angle_diffs)
    else:
        suggestions = generate_suggestions(angle_diffs)

    return {
        "angle_diffs": angle_diffs,
        "similarity": round(similarity, 1),
        "suggestions": suggestions
    }

def generate_suggestions(angle_diffs: Dict[str, float]) -> str:
    """生成改进建议"""
    suggestions = []
    suggestions.append("根据 AI 姿态分析，以下是您的动作改进建议：")
    suggestions.append("")

    # 找出最大的差异
    sorted_angles = sorted(angle_diffs.items(), key=lambda x: abs(x[1]), reverse=True)

    ANGLE_NAMES = {
        "leftShoulderAngle": "左肩",
        "rightShoulderAngle": "右肩",
        "leftElbowAngle": "左肘",
        "rightElbowAngle": "右肘",
        "leftHipAngle": "左髋",
        "rightHipAngle": "右髋",
        "leftKneeAngle": "左膝",
        "rightKneeAngle": "右膝",
        "torsoAngle": "躯干"
    }

    # 分析肩膀
    if "leftShoulderAngle" in angle_diffs or "rightShoulderAngle" in angle_diffs:
        left_diff = angle_diffs.get("leftShoulderAngle", 0)
        right_diff = angle_diffs.get("rightShoulderAngle", 0)

        if abs(left_diff) > 10 or abs(right_diff) > 10:
            if left_diff > 10 and right_diff > 10:
                suggestions.append("• 肩膀位置偏高：尝试放松肩膀，保持自然下沉的状态。摇摆舞中肩膀应该保持平稳，不要耸肩。")
            elif left_diff < -10 and right_diff < -10:
                suggestions.append("• 肩膀下沉过度：适当提升肩膀，保持与大师类似的姿态高度。")
            else:
                suggestions.append("• 肩膀不平衡：注意保持双肩水平，避免一高一低，这是摇摆舞基础框架的重要部分。")

    # 分析手肘
    if "leftElbowAngle" in angle_diffs or "rightElbowAngle" in angle_diffs:
        left_diff = angle_diffs.get("leftElbowAngle", 0)
        right_diff = angle_diffs.get("rightElbowAngle", 0)

        if abs(left_diff) > 10 or abs(right_diff) > 10:
            avg_diff = (left_diff + right_diff) / 2
            if avg_diff > 10:
                suggestions.append("• 手臂过于展开：尝试将手臂稍微收拢，保持更紧凑的框架。摇摆舞的手臂应该保持自然的弯曲。")
            else:
                suggestions.append("• 手臂收得过紧：适当展开手臂，增加舞蹈的表现力和优雅感。")

    # 分析髋部
    if "leftHipAngle" in angle_diffs or "rightHipAngle" in angle_diffs:
        left_diff = angle_diffs.get("leftHipAngle", 0)
        right_diff = angle_diffs.get("rightHipAngle", 0)

        if abs(left_diff) > 10 or abs(right_diff) > 10:
            suggestions.append("• 髋部姿态需要调整：摇摆舞中髋部的律动很重要，注意观察大师的髋部位置和角度。适当的髋部运动能增加舞蹈的动感。")

    # 分析膝盖
    if "leftKneeAngle" in angle_diffs or "rightKneeAngle" in angle_diffs:
        left_diff = angle_diffs.get("leftKneeAngle", 0)
        right_diff = angle_diffs.get("rightKneeAngle", 0)

        if abs(left_diff) > 10 or abs(right_diff) > 10:
            suggestions.append("• 膝盖弯曲度：保持膝盖微屈，这样有助于重心的灵活移动。摇摆舞需要随时准备好的弹跳感。")

    # 分析躯干
    if "torsoAngle" in angle_diffs and abs(angle_diffs["torsoAngle"]) > 10:
        diff = angle_diffs["torsoAngle"]
        direction = "前倾" if diff > 0 else "后仰"
        suggestions.append(f"• 躯干{direction}：注意保持躯干直立，重心放在脚掌中央。良好的姿态是摇摆舞的基础。")

    # 如果没有明显差异
    if len(suggestions) <= 2:
        suggestions.append("• 整体姿态良好！您的动作与大师相似度较高。继续保持练习，在细节上精益求精。")

    suggestions.append("")
    suggestions.append("💡 练习建议：")
    suggestions.append("1. 对着镜子练习，观察自己的姿态与大师的差异")
    suggestions.append("2. 录制自己的视频，使用本工具反复对比分析")
    suggestions.append("3. 多进行基础动作（Basic、Triple Step）的练习，培养肌肉记忆")
    suggestions.append("4. 注意听音乐的节奏，让动作与音乐融合")
    suggestions.append("5. 参加课程或工作坊，获得专业老师的指导")

    return "\n".join(suggestions)
