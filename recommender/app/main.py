from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import search, recommendations, tags

app = FastAPI(
    title="Kidswear Recommender",
    description="童裝推薦微服務：SVD 協同過濾、CLIP 視覺搜尋、Claude LLM 解釋",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(recommendations.router)
app.include_router(tags.router)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    from datetime import datetime, timezone

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
