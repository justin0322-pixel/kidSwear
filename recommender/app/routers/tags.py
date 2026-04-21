import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadedFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.algorithms.tag_suggest import suggest_from_bytes, suggest_from_url
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tags", tags=["tags"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


class TagSuggestion(BaseModel):
    id: str
    name: str
    color: str | None
    freq: int


class TagSuggestResponse(BaseModel):
    tags: list[TagSuggestion]


@router.post("/suggest", response_model=TagSuggestResponse, summary="根據圖片建議標籤（AI）")
async def suggest_tags(
    file: UploadedFile | None = File(default=None),
    image_url: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> TagSuggestResponse:
    if file is not None:
        data = await file.read()
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="圖片不能超過 10MB")
        tags = suggest_from_bytes(data, db)
    elif image_url:
        tags = await suggest_from_url(image_url, db)
    else:
        raise HTTPException(status_code=422, detail="請提供 file 或 image_url")

    return TagSuggestResponse(tags=[TagSuggestion(**t) for t in tags])
