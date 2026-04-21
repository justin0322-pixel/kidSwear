import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])


class EmbedProductRequest(BaseModel):
    product_id: int


class EmbedProductResponse(BaseModel):
    task_id: str
    product_id: int


@router.post(
    "/embed-product",
    response_model=EmbedProductResponse,
    summary="非同步觸發商品 CLIP embedding（供 backend 內部呼叫）",
)
def trigger_embed_product(body: EmbedProductRequest) -> EmbedProductResponse:
    try:
        from app.tasks.embed_product import embed_product

        result = embed_product.delay(body.product_id)
        logger.info("embed_product task enqueued: product=%s task=%s", body.product_id, result.id)
        return EmbedProductResponse(task_id=result.id, product_id=body.product_id)
    except Exception as exc:
        logger.error("Failed to enqueue embed_product for %s: %s", body.product_id, exc)
        raise HTTPException(status_code=500, detail="無法排程 embedding task") from exc
