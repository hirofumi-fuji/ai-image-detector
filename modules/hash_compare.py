import imagehash
from PIL import Image
import requests
from io import BytesIO


def calculate_phash_similarity(target_image: Image.Image, reference_url: str) -> float:
    """
    対象画像と参照画像のpHash類似度を計算する。

    Returns:
        similarity: 0.0〜1.0（1.0が完全一致）。エラー時は -1.0。
    """
    try:
        response = requests.get(reference_url, timeout=10)
        response.raise_for_status()
        ref_image = Image.open(BytesIO(response.content))

        hash1 = imagehash.phash(target_image)
        hash2 = imagehash.phash(ref_image)

        distance = hash1 - hash2  # ハミング距離
        max_distance = 64  # 64bitハッシュ
        similarity = 1.0 - (distance / max_distance)

        return round(similarity, 3)
    except Exception:
        return -1.0
