import { GoogleGenAI } from "@google/genai";
import type { AiAnalysis } from "./types";

const ANALYSIS_PROMPT = `あなたは画像の著作権リスクを判定するアシスタントです。
以下の画像を分析し、JSON形式で回答してください。
専門用語は避け、誰でもわかる平易な日本語で書いてください。

分析項目:
1. similar_artists: この画像の絵柄が似ている有名なアーティストやクリエイターの名前（最大5名）。心当たりがなければ空配列。
2. style_description: この画像がどんな絵柄・雰囲気かを一言で説明（例:「水彩風のやわらかいタッチ」「アニメ調のキャラクターイラスト」など、50文字以内）。
3. risk_factors: 著作権的に気をつけるべきポイントをわかりやすく列挙。
   - 既存のキャラクターに似ている場合 → 「○○に似たキャラクターが含まれています」
   - 有名な作品の絵柄にそっくりな場合 → 「○○（作品名）の絵柄に近い印象です」
   - 企業ロゴや商標に似ている場合 → 「○○のロゴに似た要素があります」
   - 特に問題なければ空配列
4. recommendation: 3段階で判定。
   - "SAFE": 既存作品との類似性が低く、問題なさそう
   - "CAUTION": 似ている部分があるので念のため確認を推奨
   - "DANGER": 明らかに似ているため使用を避けるべき

回答はJSON形式のみ。説明文や前置きは不要。`;

export async function analyzeArtStyle(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<AiAnalysis> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          { text: ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
  });

  const text = response.text ?? "";
  return parseResponse(text);
}

function parseResponse(responseText: string): AiAnalysis {
  try {
    let text = responseText.trim();
    if (text.startsWith("```")) {
      text = text.split("\n", 2)[1];
      text = text.split("```")[0];
    }
    return JSON.parse(text) as AiAnalysis;
  } catch {
    return {
      similar_artists: [],
      style_description: responseText.slice(0, 200),
      risk_factors: [],
      recommendation: "CAUTION",
    };
  }
}
