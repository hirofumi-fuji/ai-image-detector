import os
import streamlit as st
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

from modules.serpapi_search import search_similar_images
from modules.gemini_analysis import analyze_art_style
from modules.hash_compare import calculate_phash_similarity
from modules.report import build_report, reports_to_csv, ImageReport

load_dotenv()

# ページ設定
st.set_page_config(page_title="画像著作権リスク判定ツール", page_icon="🔍", layout="wide")

# ── APIキー読み込み ──
def _get_secret(key: str) -> str:
    try:
        return st.secrets[key]
    except Exception:
        return os.getenv(key, "")

serpapi_key = _get_secret("SERPAPI_API_KEY")
gemini_key = _get_secret("GEMINI_API_KEY")
api_keys_ready = bool(serpapi_key) and bool(gemini_key)

# ── メインエリア ──
st.title("🔍 画像著作権リスク判定ツール")

st.warning(
    "⚠️ 本ツールは類似性の参考情報を提示するものであり、"
    "著作権侵害の有無を法的に保証するものではありません。"
    "最終判断は必ず人間が行い、必要に応じて法務専門家にご相談ください。"
)

if not api_keys_ready:
    st.error("⚠️ システム設定エラー: APIキーが構成されていません。管理者にお問い合わせください。")

# 結果表示エリア（画面上部に確保）
result_area = st.container()

st.divider()

# 画像アップロード
uploaded_files = st.file_uploader(
    "判定する画像をアップロードしてください",
    type=["png", "jpg", "jpeg", "webp"],
    accept_multiple_files=True,
)

# サムネイルプレビュー
if uploaded_files:
    cols = st.columns(min(len(uploaded_files), 4))
    for i, f in enumerate(uploaded_files):
        with cols[i % len(cols)]:
            st.image(f, caption=f.name, use_container_width=True)

# ── サイドバー ──
with st.sidebar:
    st.header("⚙️ 設定")
    st.subheader("判定パラメータ")
    phash_threshold = st.slider("pHash類似度閾値（CAUTION判定）", 0.5, 1.0, 0.85, 0.05)
    max_lens_results = st.slider("Lens検索表示件数", 3, 10, 5)

    st.divider()
    run_analysis = st.button(
        "▶ 分析開始",
        disabled=not (uploaded_files and api_keys_ready),
        type="primary",
        use_container_width=True,
    )

# ── 分析処理 ──
if run_analysis and uploaded_files:
    reports: list[ImageReport] = []

    for uploaded_file in uploaded_files:
        image_bytes = uploaded_file.read()
        target_image = Image.open(BytesIO(image_bytes))

        with st.status(f"分析中: {uploaded_file.name}", expanded=True):
            # ── 1. Google Lens検索 ──
            st.write("🔎 Google Lens検索を実行中...")
            try:
                lens_data = search_similar_images(image_bytes, serpapi_key)
                lens_results = lens_data.get("visual_matches", [])[:max_lens_results]
            except Exception as e:
                st.error(f"Google Lens検索エラー: {e}")
                lens_results = []

            # ── 2. Gemini画風分析 ──
            st.write("🎨 AI画風分析を実行中...")
            try:
                gemini_result = analyze_art_style(image_bytes, gemini_key)
            except Exception as e:
                st.warning(f"AI画風分析は利用できませんでした: {e}")
                # リトライ1回
                try:
                    gemini_result = analyze_art_style(image_bytes, gemini_key)
                except Exception:
                    gemini_result = {
                        "similar_artists": [],
                        "style_description": "分析不可",
                        "risk_factors": [],
                        "recommendation": "CAUTION",
                    }

            # ── 3. pHash計算 ──
            st.write("🔢 pHash類似度を計算中...")
            phash_scores = []
            for match in lens_results:
                thumbnail_url = match.get("thumbnail", "")
                if not thumbnail_url:
                    continue
                similarity = calculate_phash_similarity(target_image, thumbnail_url)
                phash_scores.append({
                    "url": match.get("link", ""),
                    "title": match.get("title", ""),
                    "similarity": similarity,
                })

            # ── 4. レポート生成 ──
            st.write("📝 レポートを生成中...")
            report = build_report(
                filename=uploaded_file.name,
                lens_results=lens_results,
                ai_analysis=gemini_result,
                phash_scores=phash_scores,
                phash_threshold=phash_threshold,
            )
            reports.append(report)

    # ── 結果を画面上部に表示 ──
    with result_area:
        st.subheader("■ 分析結果")

        for report in reports:
            rec = report.overall_recommendation
            if rec == "DANGER":
                badge = "🔴 DANGER"
            elif rec == "CAUTION":
                badge = "🟡 CAUTION"
            else:
                badge = "🟢 SAFE"

            with st.expander(f"{report.filename}  【{badge}】", expanded=(rec != "SAFE")):
                # 総合判定バッジ
                if rec == "DANGER":
                    st.error("使用は避けてください — 既存作品と明らかに似ています")
                elif rec == "CAUTION":
                    st.warning("念のため確認を — 似ている部分が見つかりました")
                else:
                    st.success("問題なさそうです — 既存作品との類似性は低いです")

                # AI分析結果
                st.markdown("**画像の特徴**")
                ca = report.ai_analysis
                st.write(ca.get("style_description", "（分析できませんでした）"))

                artists = ca.get("similar_artists", [])
                if artists:
                    st.markdown("**似ているアーティスト**")
                    st.write("、".join(artists))

                risks = ca.get("risk_factors", [])
                if risks:
                    st.markdown("**注意ポイント**")
                    for risk in risks:
                        st.write(f"- {risk}")

                st.divider()

                # Google Lens検索結果
                st.markdown("**ネット上の類似画像**")
                if report.lens_results:
                    for i, result in enumerate(report.lens_results, 1):
                        title = result.get("title", "不明")
                        link = result.get("link", "")
                        source = result.get("source", "")
                        st.markdown(f"{i}. [{title}]({link}) - {source}")
                else:
                    st.write("似ている画像は見つかりませんでした")

                st.divider()

                # pHash類似度
                st.markdown("**画像の一致度（数値が高いほど似ている）**")
                valid_scores = [s for s in report.phash_scores if s.get("similarity", -1) >= 0]
                if valid_scores:
                    top = max(valid_scores, key=lambda s: s["similarity"])
                    pct = int(top["similarity"] * 100)
                    st.write(f"最も似ている画像との一致度: **{pct}%** （{top.get('title', top.get('url', 'N/A'))}）")
                else:
                    st.write("比較できる画像がありませんでした")

        # CSVダウンロード
        if reports:
            st.divider()
            csv_data = reports_to_csv(reports)
            st.download_button(
                label="📥 レポートCSVダウンロード",
                data=csv_data,
                file_name="copyright_check_report.csv",
                mime="text/csv",
            )
