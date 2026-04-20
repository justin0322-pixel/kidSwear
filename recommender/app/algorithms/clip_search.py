import io
import logging

import numpy as np
import torch
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session
from transformers import CLIPModel, CLIPProcessor

from app.models.schemas import SearchResponse, SearchResultItem, ShopInfo

logger = logging.getLogger(__name__)

_CLIP_MODEL_ID = "openai/clip-vit-base-patch32"

SEARCH_SQL = text("""
    SELECT
        p.id::text,
        p.name,
        p.category,
        p.base_price::text,
        s.id::text  AS shop_id,
        s.name      AS shop_name,
        pi.url      AS primary_image_url,
        1 - (p.image_embedding <=> :embedding::vector) AS score
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN product_images pi
           ON pi.product_id = p.id AND pi.is_primary = TRUE
    WHERE p.deleted_at IS NULL
      AND p.status = 'active'
      AND p.image_embedding IS NOT NULL
      AND (:category IS NULL OR p.category = :category)
    ORDER BY p.image_embedding <=> :embedding::vector
    LIMIT :limit
""")


class ClipSearcher:
    """Singleton CLIP model wrapper for text/image → vector search."""

    _instance: "ClipSearcher | None" = None

    def __init__(self) -> None:
        logger.info("Loading CLIP model %s …", _CLIP_MODEL_ID)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model: CLIPModel = CLIPModel.from_pretrained(_CLIP_MODEL_ID).to(self.device)  # type: ignore[assignment]
        self.processor: CLIPProcessor = CLIPProcessor.from_pretrained(_CLIP_MODEL_ID)  # type: ignore[assignment]
        self.model.eval()
        logger.info("CLIP model ready on %s", self.device)

    @classmethod
    def get_instance(cls) -> "ClipSearcher":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def encode_text(self, text_input: str) -> np.ndarray:
        inputs = self.processor(text=[text_input], return_tensors="pt", padding=True).to(self.device)
        with torch.no_grad():
            features = self.model.get_text_features(**inputs)
        vec = features[0].cpu().numpy().astype(np.float32)
        return vec / np.linalg.norm(vec)

    def encode_image(self, image: Image.Image) -> np.ndarray:
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            features = self.model.get_image_features(**inputs)
        vec = features[0].cpu().numpy().astype(np.float32)
        return vec / np.linalg.norm(vec)

    def encode_image_bytes(self, data: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        return self.encode_image(image)

    def search(
        self,
        embedding: np.ndarray,
        db: Session,
        limit: int = 12,
        category: str | None = None,
    ) -> SearchResponse:
        embedding_str = "[" + ",".join(f"{v:.8f}" for v in embedding.tolist()) + "]"
        rows = db.execute(
            SEARCH_SQL,
            {"embedding": embedding_str, "limit": limit, "category": category},
        ).fetchall()

        items = [
            SearchResultItem(
                id=row.id,
                name=row.name,
                category=row.category,
                base_price=row.base_price,
                primary_image_url=row.primary_image_url,
                shop=ShopInfo(id=row.shop_id, name=row.shop_name),
                score=float(row.score),
            )
            for row in rows
        ]
        return SearchResponse(items=items, total=len(items))
