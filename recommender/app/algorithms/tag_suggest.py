import io
import logging

import httpx
import numpy as np
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.algorithms.clip_search import ClipSearcher

logger = logging.getLogger(__name__)

TAG_SUGGEST_SQL = text("""
    WITH similar_products AS (
        SELECT id
        FROM   products
        WHERE  deleted_at IS NULL
          AND  status = 'active'
          AND  image_embedding IS NOT NULL
        ORDER  BY image_embedding <=> :embedding::vector
        LIMIT  15
    )
    SELECT
        t.id::text,
        t.name,
        t.color,
        COUNT(*) AS freq
    FROM   product_tags pt
    JOIN   tags t ON t.id = pt.tag_id
    WHERE  pt.product_id IN (SELECT id FROM similar_products)
    GROUP  BY t.id, t.name, t.color
    ORDER  BY freq DESC
    LIMIT  8
""")


def suggest_from_embedding(embedding: np.ndarray, db: Session) -> list[dict]:
    embedding_str = "[" + ",".join(f"{v:.8f}" for v in embedding.tolist()) + "]"
    rows = db.execute(TAG_SUGGEST_SQL, {"embedding": embedding_str}).fetchall()
    return [
        {"id": row.id, "name": row.name, "color": row.color, "freq": int(row.freq)}
        for row in rows
    ]


def suggest_from_bytes(data: bytes, db: Session) -> list[dict]:
    image = Image.open(io.BytesIO(data)).convert("RGB")
    searcher = ClipSearcher.get_instance()
    embedding = searcher.encode_image(image)
    return suggest_from_embedding(embedding, db)


async def suggest_from_url(url: str, db: Session) -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    return suggest_from_bytes(resp.content, db)
