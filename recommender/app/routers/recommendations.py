from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.algorithms.llm_explain import LLMExplainer
from app.algorithms.svd_rec import SvdRecommender
from app.database import get_db

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get(
    "/for-user/{user_id}",
    summary="為指定使用者產生個人化推薦（SVD 協同過濾，冷啟動自動降級為熱門商品）",
)
async def recommend_for_user(
    user_id: str,
    limit: int = Query(default=12, ge=1, le=50),
    explain: bool = Query(default=False, description="是否呼叫 Claude LLM 生成推薦理由"),
    db: Session = Depends(get_db),
) -> dict:
    recommender = SvdRecommender.get_instance()
    result = recommender.recommend(user_id, db, limit=limit)

    if explain and result["items"]:
        explainer = LLMExplainer.get_instance()
        reasons = explainer.explain_batch(result["items"], result["source"])
        for item, reason in zip(result["items"], reasons):
            item["reason"] = reason

    return result
