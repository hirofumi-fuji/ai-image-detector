from dataclasses import dataclass, field
from datetime import datetime
import pandas as pd


@dataclass
class ImageReport:
    filename: str
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    lens_results: list = field(default_factory=list)        # Google Lens検索結果（上位5件）
    ai_analysis: dict = field(default_factory=dict)      # AI画風分析結果
    phash_scores: list = field(default_factory=list)          # pHash類似度
    overall_recommendation: str = "SAFE"                     # 総合判定


def determine_recommendation(ai_analysis: dict, lens_results: list, phash_scores: list, phash_threshold: float = 0.85) -> str:
    """
    総合判定ロジック。

    IF ai_analysis.recommendation == "DANGER": → DANGER
    ELIF ai_analysis.recommendation == "CAUTION" OR lens_resultsに特定アーティスト名が含まれる: → CAUTION
    ELIF phash_scoresの最大値 > phash_threshold: → CAUTION
    ELSE: → SAFE
    """
    ai_rec = ai_analysis.get("recommendation", "SAFE")

    if ai_rec == "DANGER":
        return "DANGER"

    if ai_rec == "CAUTION":
        return "CAUTION"

    # lens_resultsのタイトルにアーティスト名が含まれるかチェック
    similar_artists = ai_analysis.get("similar_artists", [])
    if similar_artists and lens_results:
        for result in lens_results:
            title = result.get("title", "").lower()
            for artist in similar_artists:
                if artist.lower() in title:
                    return "CAUTION"

    # pHash最大値チェック
    valid_scores = [s.get("similarity", -1) for s in phash_scores if s.get("similarity", -1) >= 0]
    if valid_scores and max(valid_scores) > phash_threshold:
        return "CAUTION"

    return "SAFE"


def build_report(filename: str, lens_results: list, ai_analysis: dict, phash_scores: list, phash_threshold: float = 0.85) -> ImageReport:
    """各画像の分析結果からレポートを生成する。"""
    recommendation = determine_recommendation(
        ai_analysis, lens_results, phash_scores, phash_threshold
    )

    return ImageReport(
        filename=filename,
        lens_results=lens_results[:5],
        ai_analysis=ai_analysis,
        phash_scores=phash_scores,
        overall_recommendation=recommendation,
    )


def reports_to_csv(reports: list[ImageReport]) -> str:
    """レポートリストをCSV文字列に変換する。"""
    rows = []
    for r in reports:
        similar_artists = ", ".join(r.ai_analysis.get("similar_artists", []))
        risk_factors = ", ".join(r.ai_analysis.get("risk_factors", []))
        top_title = r.lens_results[0].get("title", "") if r.lens_results else ""
        top_url = r.lens_results[0].get("link", "") if r.lens_results else ""
        valid_scores = [s.get("similarity", -1) for s in r.phash_scores if s.get("similarity", -1) >= 0]
        max_phash = max(valid_scores) if valid_scores else ""

        rows.append({
            "filename": r.filename,
            "analyzed_at": r.timestamp,
            "overall_recommendation": r.overall_recommendation,
            "similar_artists": similar_artists,
            "style_description": r.ai_analysis.get("style_description", ""),
            "risk_factors": risk_factors,
            "top_lens_result_title": top_title,
            "top_lens_result_url": top_url,
            "max_phash_similarity": max_phash,
        })

    df = pd.DataFrame(rows)
    return df.to_csv(index=False)
