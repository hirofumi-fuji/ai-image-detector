import base64
import json
import google.generativeai as genai
from PIL import Image
from io import BytesIO

ANALYSIS_PROMPT = """あなたは美術・イラストレーションの専門家です。
以下の画像を分析し、JSON形式で回答してください。

分析項目:
1. similar_artists: この画像の画風・タッチ・構図が類似している既知のアーティスト名（最大5名）。特定できない場合は空配列。
2. style_description: 画風の特徴を日本語で簡潔に説明（100文字以内）。
3. risk_factors: 著作権リスクの観点から注意すべき要素をリストアップ。
   - 特定のキャラクターに似ている場合はその旨記載
   - 特定の作品・シリーズの画風に酷似している場合はその旨記載
   - 企業ロゴや商標に似た要素がある場合はその旨記載
   - 特に問題がない場合は空配列
4. recommendation: 以下の3段階で推奨アクションを提示。
   - "SAFE": 特定のアーティスト・作品との類似性が低い。使用可と考えられる。
   - "CAUTION": 一部類似性が見られる。上席確認を推奨。
   - "DANGER": 明確な類似性がある。使用を控えることを強く推奨。

回答はJSON形式のみ。説明文や前置きは不要。"""


def analyze_art_style(image_bytes: bytes, api_key: str) -> dict:
    """
    Gemini APIで画風分析を行う。

    Returns:
        {
            "similar_artists": [str],
            "style_description": str,
            "risk_factors": [str],
            "recommendation": str
        }
    """
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    image = Image.open(BytesIO(image_bytes))

    response = model.generate_content([ANALYSIS_PROMPT, image])

    return _parse_response(response.text)


def _parse_response(response_text: str) -> dict:
    """Geminiのレスポンスをパースする。"""
    try:
        text = response_text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {
            "similar_artists": [],
            "style_description": response_text[:200],
            "risk_factors": [],
            "recommendation": "CAUTION",
        }
