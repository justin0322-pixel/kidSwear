import logging
import math

import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session
from surprise import SVD, Dataset, Reader

logger = logging.getLogger(__name__)

# SQL to build user-product interaction matrix from order history
INTERACTIONS_SQL = text("""
    SELECT
        r.user_id::text      AS user_id,
        pv.product_id::text  AS product_id,
        COUNT(*)::float      AS interaction_count
    FROM order_items oi
    JOIN orders o            ON o.id   = oi.order_id
    JOIN retailers r         ON r.id   = o.retailer_id
    JOIN product_variants pv ON pv.id  = oi.variant_id
    WHERE o.status NOT IN ('cancelled', 'refunded')
    GROUP BY r.user_id, pv.product_id
""")

PRODUCT_DETAIL_SQL = text("""
    SELECT
        p.id::text,
        p.name,
        p.category,
        p.base_price::text,
        s.id::text  AS shop_id,
        s.name      AS shop_name,
        pi.url      AS primary_image_url
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN product_images pi
           ON pi.product_id = p.id AND pi.is_primary = TRUE
    WHERE p.deleted_at IS NULL
      AND p.status = 'active'
      AND p.id = ANY(:ids)
""")

POPULAR_SQL = text("""
    SELECT
        p.id::text,
        p.name,
        p.category,
        p.base_price::text,
        s.id::text  AS shop_id,
        s.name      AS shop_name,
        pi.url      AS primary_image_url
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    LEFT JOIN product_images pi
           ON pi.product_id = p.id AND pi.is_primary = TRUE
    WHERE p.deleted_at IS NULL
      AND p.status = 'active'
    ORDER BY p.order_count DESC, p.view_count DESC
    LIMIT :limit
""")


def _row_to_dict(row: object) -> dict:
    return {
        "id": row.id,  # type: ignore[attr-defined]
        "name": row.name,  # type: ignore[attr-defined]
        "category": row.category,  # type: ignore[attr-defined]
        "base_price": row.base_price,  # type: ignore[attr-defined]
        "primary_image_url": row.primary_image_url,  # type: ignore[attr-defined]
        "shop": {"id": row.shop_id, "name": row.shop_name},  # type: ignore[attr-defined]
        "score": 0.0,
    }


class SvdRecommender:
    """Singleton SVD collaborative-filtering recommender."""

    _instance: "SvdRecommender | None" = None

    def __init__(self) -> None:
        self._model: SVD | None = None
        self._trainset = None
        self._all_product_ids: list[str] = []
        self._user_ordered: dict[str, set[str]] = {}

    @classmethod
    def get_instance(cls) -> "SvdRecommender":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def train(self, db: Session) -> None:
        rows = db.execute(INTERACTIONS_SQL).fetchall()
        if not rows:
            logger.warning("No interaction data — SVD skipped")
            return

        df = pd.DataFrame(rows, columns=["user_id", "product_id", "interaction_count"])
        # Cap at 10 and normalise to [1, 5] for surprise
        df["rating"] = df["interaction_count"].clip(upper=10).apply(
            lambda x: 1 + 4 * math.log1p(x) / math.log1p(10)
        )

        self._user_ordered = (
            df.groupby("user_id")["product_id"].apply(set).to_dict()
        )
        self._all_product_ids = df["product_id"].unique().tolist()

        reader = Reader(rating_scale=(1, 5))
        dataset = Dataset.load_from_df(df[["user_id", "product_id", "rating"]], reader)
        self._trainset = dataset.build_full_trainset()
        self._model = SVD(n_factors=50, n_epochs=20, random_state=42)
        self._model.fit(self._trainset)
        logger.info("SVD trained on %d interactions", len(df))

    def recommend(self, user_id: str, db: Session, limit: int = 12) -> dict:
        if self._model is None or self._trainset is None:
            self.train(db)

        if self._model is None:
            return self._popular(db, limit)

        # Cold-start: user not in training set
        try:
            self._trainset.to_inner_uid(user_id)
        except ValueError:
            return self._popular(db, limit)

        already_ordered = self._user_ordered.get(user_id, set())
        candidates = [pid for pid in self._all_product_ids if pid not in already_ordered]

        predictions = [self._model.predict(user_id, pid) for pid in candidates]
        predictions.sort(key=lambda p: p.est, reverse=True)
        top_ids = [p.iid for p in predictions[:limit]]

        rows = db.execute(PRODUCT_DETAIL_SQL, {"ids": top_ids}).fetchall()
        score_map = {p.iid: round(p.est / 5, 4) for p in predictions[:limit]}
        items = [_row_to_dict(r) for r in rows]
        for item in items:
            item["score"] = score_map.get(item["id"], 0.0)
        items.sort(key=lambda x: x["score"], reverse=True)

        return {"items": items, "total": len(items), "source": "svd"}

    def _popular(self, db: Session, limit: int) -> dict:
        rows = db.execute(POPULAR_SQL, {"limit": limit}).fetchall()
        items = [_row_to_dict(r) for r in rows]
        return {"items": items, "total": len(items), "source": "popular"}
