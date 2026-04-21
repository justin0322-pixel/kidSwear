import logging

import httpx
from sqlalchemy import text

from app.database import SessionLocal
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

FETCH_SQL = text("""
    SELECT pi.url
    FROM   product_images pi
    WHERE  pi.product_id = :product_id
      AND  pi.is_primary = TRUE
    LIMIT 1
""")

UPDATE_SQL = text("""
    UPDATE products
    SET    image_embedding = :embedding::vector
    WHERE  id = :product_id
""")


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30, name="embed_product")
def embed_product(self, product_id: int) -> dict:  # type: ignore[override]
    """Fetch the primary image of a product, encode via CLIP, write embedding to DB."""
    from app.algorithms.clip_search import ClipSearcher

    with SessionLocal() as db:
        row = db.execute(FETCH_SQL, {"product_id": product_id}).fetchone()

    if row is None:
        logger.warning("embed_product: no primary image for product %s, skipping", product_id)
        return {"status": "skipped", "product_id": product_id}

    image_url: str = row.url

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(image_url)
            resp.raise_for_status()
        image_bytes = resp.content
    except Exception as exc:
        logger.error("embed_product: failed to fetch image %s — %s", image_url, exc)
        raise self.retry(exc=exc)

    try:
        searcher = ClipSearcher.get_instance()
        embedding = searcher.encode_image_bytes(image_bytes)
    except Exception as exc:
        logger.error("embed_product: CLIP encode failed for product %s — %s", product_id, exc)
        raise self.retry(exc=exc)

    embedding_str = "[" + ",".join(f"{v:.8f}" for v in embedding.tolist()) + "]"

    with SessionLocal() as db:
        db.execute(UPDATE_SQL, {"embedding": embedding_str, "product_id": product_id})
        db.commit()

    logger.info("embed_product: product %s embedding written (%d dims)", product_id, len(embedding))
    return {"status": "ok", "product_id": product_id}
