from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.algorithms.clip_search import ClipSearcher
from app.database import get_db
from app.models.schemas import SearchResponse, TextSearchRequest

router = APIRouter(prefix="/search", tags=["search"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/text", response_model=SearchResponse, summary="以文字搜尋商品（CLIP 語意搜尋）")
async def search_by_text(
    body: TextSearchRequest,
    db: Session = Depends(get_db),
) -> SearchResponse:
    searcher = ClipSearcher.get_instance()
    embedding = searcher.encode_text(body.query)
    return searcher.search(embedding, db, limit=body.limit, category=body.category)


@router.post("/image", response_model=SearchResponse, summary="以圖片搜尋相似商品（CLIP 視覺搜尋）")
async def search_by_image(
    file: UploadFile = File(..., description="圖片檔案（JPEG / PNG / WebP，最大 10 MB）"),
    limit: int = Query(default=12, ge=1, le=50),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> SearchResponse:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="僅支援 JPEG、PNG、WebP 格式")

    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="圖片不能超過 10 MB")

    searcher = ClipSearcher.get_instance()
    try:
        embedding = searcher.encode_image_bytes(data)
    except Exception:
        raise HTTPException(status_code=400, detail="圖片解析失敗，請確認格式正確")

    return searcher.search(embedding, db, limit=limit, category=category)
