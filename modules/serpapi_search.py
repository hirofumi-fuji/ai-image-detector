import requests
from serpapi import GoogleSearch


def _upload_temp_image(image_bytes: bytes) -> str:
    """画像を一時ホスティングにアップロードし、公開URLを返す。"""
    resp = requests.post(
        "https://tmpfiles.org/api/v1/upload",
        files={"file": ("image.png", image_bytes, "image/png")},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    # tmpfiles.org は https://tmpfiles.org/12345/image.png 形式で返す
    # 直リンクは https://tmpfiles.org/dl/12345/image.png に変換が必要
    url = data["data"]["url"]
    return url.replace("tmpfiles.org/", "tmpfiles.org/dl/", 1)


def search_similar_images(image_bytes: bytes, api_key: str) -> dict:
    """
    Google Lensで類似画像を検索する。
    画像を一時ホスティングにアップロードし、そのURLをSerpApiに渡す。

    Returns:
        {
            "visual_matches": [...],
            "knowledge_graph": [...],
            "raw_response": dict
        }
    """
    image_url = _upload_temp_image(image_bytes)

    params = {
        "engine": "google_lens",
        "url": image_url,
        "hl": "ja",
        "country": "jp",
        "api_key": api_key,
    }
    search = GoogleSearch(params)
    results = search.get_dict()

    if "error" in results:
        raise RuntimeError(results["error"])

    return _parse_lens_results(results)


def _parse_lens_results(results: dict) -> dict:
    """SerpApiのレスポンスをパースする。"""
    visual_matches = []
    for match in results.get("visual_matches", []):
        visual_matches.append({
            "title": match.get("title", ""),
            "link": match.get("link", ""),
            "thumbnail": match.get("thumbnail", ""),
            "source": match.get("source", ""),
        })

    knowledge_graph = results.get("knowledge_graph", [])

    return {
        "visual_matches": visual_matches,
        "knowledge_graph": knowledge_graph if isinstance(knowledge_graph, list) else [knowledge_graph] if knowledge_graph else [],
        "raw_response": results,
    }
