from pydantic import BaseModel, Field


class ShopInfo(BaseModel):
    id: str
    name: str


class SearchResultItem(BaseModel):
    id: str
    name: str
    category: str
    base_price: str
    primary_image_url: str | None
    shop: ShopInfo
    score: float
    reason: str | None = None


class SearchResponse(BaseModel):
    items: list[SearchResultItem]
    total: int


class TextSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    limit: int = Field(default=12, ge=1, le=50)
    category: str | None = None
