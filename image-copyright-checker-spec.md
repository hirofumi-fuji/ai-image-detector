# 画像著作権リスク判定ツール MVP仕様書

## プロジェクト概要

画像生成AIから出力された画像が、既存の著作物に類似していないかを事前スクリーニングするWebアプリケーション。  
「著作権侵害の法的判定」ではなく、**「類似情報の提示 + 人間判断の補助」**を目的とする。

### ターゲットユーザー
- 事務方スタッフ（非デザイナー）
- 最終判断者は上席（管理職）

### 利用規模
- 月50件程度（最大）
- SerpApi無料プラン（月100検索）の範囲内で運用

---

## 技術スタック

| 項目 | 技術 |
|---|---|
| 言語 | Python 3.11+ |
| フレームワーク | Streamlit |
| 画像検索API | SerpApi（Google Lens エンドポイント） |
| 画風分析AI | Anthropic Claude API（claude-sonnet-4-20250514） |
| 画像ハッシュ | imagehash（pHash） |
| デプロイ | ローカル実行（`streamlit run app.py`） |

---

## ディレクトリ構成

```
image-copyright-checker/
├── app.py                 # メインアプリケーション（Streamlit）
├── modules/
│   ├── __init__.py
│   ├── serpapi_search.py  # SerpApi Google Lens検索
│   ├── claude_analysis.py # Claude API 画風分析
│   ├── hash_compare.py    # pHash類似度計算
│   └── report.py          # レポート生成
├── .env                   # 環境変数（APIキー）※gitignore対象
├── .env.example           # 環境変数テンプレート
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 環境変数（.env）

```env
SERPAPI_API_KEY=your_serpapi_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### .env.example

```env
SERPAPI_API_KEY=
ANTHROPIC_API_KEY=
```

---

## requirements.txt

```
streamlit>=1.30.0
python-dotenv>=1.0.0
anthropic>=0.40.0
google-search-results>=2.4.2
imagehash>=4.3.1
Pillow>=10.0.0
requests>=2.31.0
pandas>=2.0.0
```

---

## 機能仕様

### 1. 画像入力（app.py）

- Streamlitの `st.file_uploader` を使用
  - `accept_multiple_files=True` で複数画像対応
  - 対応フォーマット: `.png`, `.jpg`, `.jpeg`, `.webp`
  - 最大ファイルサイズ: 10MB/枚
- アップロード後、画像のサムネイルプレビューを表示

```python
uploaded_files = st.file_uploader(
    "判定する画像をアップロードしてください",
    type=["png", "jpg", "jpeg", "webp"],
    accept_multiple_files=True
)
```

### 2. Google Lens検索（modules/serpapi_search.py）

SerpApiの Google Lens エンドポイントを使用し、類似画像を検索する。

#### API仕様
- エンドポイント: `google_lens`（google-search-resultsライブラリ経由）
- 画像はbase64エンコードしてURLとして送信、**または**一時ファイルとしてアップロード

#### 実装方針
```python
from serpapi import GoogleSearch
import base64
import tempfile
import os

def search_similar_images(image_bytes: bytes, api_key: str) -> dict:
    """
    Google Lensで類似画像を検索する。
    
    Returns:
        {
            "visual_matches": [
                {
                    "title": str,       # ページタイトル
                    "link": str,        # ページURL
                    "thumbnail": str,   # サムネイルURL
                    "source": str       # ドメイン名
                },
                ...
            ],
            "knowledge_graph": [...],  # 関連情報（あれば）
            "raw_response": dict       # デバッグ用生レスポンス
        }
    """
    # 一時ファイルに保存してアップロード
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name
    
    try:
        params = {
            "engine": "google_lens",
            "url": tmp_path,  # またはbase64 data URI
            "api_key": api_key
        }
        search = GoogleSearch(params)
        results = search.get_dict()
    finally:
        os.unlink(tmp_path)
    
    return parse_lens_results(results)
```

#### 注意事項
- SerpApi Google Lensは画像URLを受け取る仕様。ローカルファイルの場合は一時的にホスティングするか、base64 data URIを使用する。
- SerpApiの`google_lens`エンジンで`url`パラメータに画像URLを渡す。ローカルファイルの場合、`url`にdata URIを使用するか、別途imgbbなどの一時アップロードサービスを使う方法を検討すること。
- 無料プランのレート制限に注意（月100検索）

### 3. 画風分析（modules/claude_analysis.py）

Claude APIにアップロード画像を送り、画風の類似性分析を依頼する。

#### 実装方針
```python
import anthropic
import base64

def analyze_art_style(image_bytes: bytes, api_key: str) -> dict:
    """
    Claude APIで画風分析を行う。
    
    Returns:
        {
            "similar_artists": [str],    # 類似アーティスト名リスト
            "style_description": str,    # 画風の説明
            "risk_factors": [str],       # リスク要因
            "recommendation": str        # 推奨アクション
        }
    """
    client = anthropic.Anthropic(api_key=api_key)
    
    image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",  # 実際のMIMEタイプに合わせる
                            "data": image_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": ANALYSIS_PROMPT
                    }
                ],
            }
        ],
    )
    
    return parse_claude_response(message.content[0].text)
```

#### プロンプト（ANALYSIS_PROMPT）

```
あなたは美術・イラストレーションの専門家です。
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

回答はJSON形式のみ。説明文や前置きは不要。
```

#### parse_claude_response の処理
- JSONパースを試みる
- パース失敗時はテキストをそのまま `style_description` に入れ、他はデフォルト値

### 4. pHash類似度計算（modules/hash_compare.py）

Google Lens検索で見つかった類似画像と、対象画像のpHash距離を計算する。  
**補助指標**として使用（メインはGoogle LensとClaude分析）。

```python
import imagehash
from PIL import Image
import requests
from io import BytesIO

def calculate_phash_similarity(target_image: Image.Image, reference_url: str) -> float:
    """
    対象画像と参照画像のpHash類似度を計算する。
    
    Returns:
        similarity: 0.0〜1.0（1.0が完全一致）
    """
    try:
        response = requests.get(reference_url, timeout=10)
        ref_image = Image.open(BytesIO(response.content))
        
        hash1 = imagehash.phash(target_image)
        hash2 = imagehash.phash(ref_image)
        
        distance = hash1 - hash2  # ハミング距離
        max_distance = 64  # 64bitハッシュ
        similarity = 1.0 - (distance / max_distance)
        
        return round(similarity, 3)
    except Exception:
        return -1.0  # エラー時
```

### 5. レポート生成（modules/report.py）

各画像の分析結果をまとめ、構造化されたレポートを返す。

#### レポートデータ構造
```python
@dataclass
class ImageReport:
    filename: str
    timestamp: str                    # 分析日時
    lens_results: list[dict]          # Google Lens検索結果（上位5件）
    claude_analysis: dict             # Claude画風分析結果
    phash_scores: list[dict]          # pHash類似度（検索結果上位との比較）
    overall_recommendation: str       # 総合判定（SAFE / CAUTION / DANGER）
```

#### 総合判定ロジック
```
IF claude_analysis.recommendation == "DANGER":
    → DANGER
ELIF claude_analysis.recommendation == "CAUTION" OR lens_resultsに特定アーティスト名が含まれる:
    → CAUTION
ELIF phash_scoresの最大値 > 0.85:
    → CAUTION
ELSE:
    → SAFE
```

### 6. UI設計（app.py）

#### ページ構成（シングルページ）

```
┌─────────────────────────────────────┐
│ 🔍 画像著作権リスク判定ツール          │
│ ⚠️ 免責事項（常時表示）               │
├─────────────────────────────────────┤
│ [画像アップロードエリア]               │
│  ファイルをドラッグ&ドロップ           │
│  または クリックして選択               │
├─────────────────────────────────────┤
│ [▶ 分析開始] ボタン                   │
├─────────────────────────────────────┤
│ ■ 分析結果（画像ごとにexpander）       │
│                                       │
│ ▼ sample_01.png  【🔴 DANGER】       │
│ ┌───────────────────────────────────┐ │
│ │ ■ 画風分析（Claude）               │ │
│ │ 類似アーティスト: 天野喜孝, ...     │ │
│ │ 画風説明: 水彩風タッチで...         │ │
│ │ リスク要因: ・FFシリーズの...       │ │
│ │ 推奨: 使用を控えることを強く推奨    │ │
│ ├───────────────────────────────────┤ │
│ │ ■ Google Lens検索結果（上位5件）    │ │
│ │ 1. [タイトル](URL) - ドメイン名     │ │
│ │ 2. [タイトル](URL) - ドメイン名     │ │
│ │    ...                              │ │
│ ├───────────────────────────────────┤ │
│ │ ■ pHash類似度（参考値）             │ │
│ │ 最高類似度: 0.72 (URL)              │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ▶ sample_02.png  【🟢 SAFE】         │
│  （クリックで展開）                    │
├─────────────────────────────────────┤
│ [📥 レポートCSVダウンロード]           │
└─────────────────────────────────────┘
```

#### 免責事項テキスト（常時表示）
```
⚠️ 本ツールは類似性の参考情報を提示するものであり、
著作権侵害の有無を法的に保証するものではありません。
最終判断は必ず人間が行い、必要に応じて法務専門家にご相談ください。
```

#### 判定バッジの色分け
- 🟢 SAFE: `st.success`（緑）
- 🟡 CAUTION: `st.warning`（黄）
- 🔴 DANGER: `st.error`（赤）

### 7. CSVレポート出力

分析完了後、以下のカラムでCSVダウンロードを提供:

| カラム名 | 内容 |
|---|---|
| filename | ファイル名 |
| analyzed_at | 分析日時 |
| overall_recommendation | 総合判定 |
| similar_artists | 類似アーティスト（カンマ区切り） |
| style_description | 画風説明 |
| risk_factors | リスク要因（カンマ区切り） |
| top_lens_result_title | Lens検索結果1位のタイトル |
| top_lens_result_url | Lens検索結果1位のURL |
| max_phash_similarity | pHash最高類似度 |

---

## エラーハンドリング

| エラーケース | 対処 |
|---|---|
| SerpApi APIキー未設定 | サイドバーにAPIキー入力欄を表示。設定されるまで分析ボタン無効化 |
| Anthropic APIキー未設定 | 同上 |
| SerpApi月間上限到達 | エラーメッセージ表示「今月のAPI利用上限に達しました」 |
| 画像フォーマット非対応 | アップロード時にバリデーション、エラー表示 |
| Google Lens結果0件 | 「類似画像は見つかりませんでした」と表示。Claudeの画風分析のみで判定 |
| Claude API応答エラー | リトライ1回。失敗時は「AI画風分析は利用できませんでした」と表示し、Lens結果のみで判定 |
| 参照画像ダウンロード失敗（pHash計算用） | その画像のpHashをスキップ、他の結果で判定継続 |

---

## 設定（サイドバー）

```python
with st.sidebar:
    st.header("⚙️ 設定")
    serpapi_key = st.text_input("SerpApi APIキー", type="password", value=os.getenv("SERPAPI_API_KEY", ""))
    anthropic_key = st.text_input("Anthropic APIキー", type="password", value=os.getenv("ANTHROPIC_API_KEY", ""))
    
    st.divider()
    st.subheader("判定パラメータ")
    phash_threshold = st.slider("pHash類似度閾値（CAUTION判定）", 0.5, 1.0, 0.85, 0.05)
    max_lens_results = st.slider("Lens検索表示件数", 3, 10, 5)
```

---

## 実行方法

```bash
# 1. 依存パッケージインストール
pip install -r requirements.txt

# 2. 環境変数設定（.envファイルにAPIキーを記入）
cp .env.example .env
# .envを編集してAPIキーを設定

# 3. アプリケーション起動
streamlit run app.py
```

---

## 注意事項・制約

1. **SerpApi Google Lensの画像送信方法**: ローカル画像をSerpApiに送るには、画像をWeb上にアップロードしてURLを渡す必要がある場合がある。その場合、imgbb APIなどの無料画像ホスティングを一時利用するか、data URI方式を検討すること。
2. **Claude APIの料金**: Sonnet利用で画像1枚あたり約$0.01〜0.03程度。月50枚で$0.5〜1.5。
3. **pHashは補助指標**: pHash単体での著作権判定は不可能。あくまでGoogle Lens + Claude分析の補助として位置づける。
4. **プロンプトの改善**: 運用開始後、Claude画風分析の精度が低い場合はプロンプトをチューニングすること。
5. **ログ**: 分析結果はCSVで保存可能だが、画像自体の保存機能は本MVPでは実装しない。

---

## 将来拡張（MVP後）

- 社内使用禁止リストDB（キャラクター・ロゴ等）とのローカルpHash照合（1次フィルタ）
- 分析結果のSlack/Teams通知（上席自動連携）
- 分析履歴のDB保存とダッシュボード
- バッチ処理（フォルダ監視で自動分析）
