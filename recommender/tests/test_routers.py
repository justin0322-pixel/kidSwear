"""
FastAPI router tests — 在 import app 前先 mock 所有 ML/DB 重依賴，
讓測試在沒有 torch/clip/postgres 的環境也能跑。
"""
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── Mock 重依賴（必須在 import app 之前）────────────────────────────────────

def _make_module(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)
    sys.modules[name] = mod
    return mod

for _name in [
    "numpy", "numpy.linalg",
    "torch", "torchvision", "torchvision.transforms",
    "PIL", "PIL.Image",
    "transformers",
    "surprise",
    "celery", "celery.app",
    "psycopg2", "psycopg2.extras",
    "pgvector", "pgvector.sqlalchemy",
    "anthropic",
    "redis",
    "sqlalchemy", "sqlalchemy.orm", "sqlalchemy.exc",
]:
    _make_module(_name)

# sqlalchemy 需要幾個具體屬性
import sqlalchemy as _sa  # noqa: E402  (已 mock)
_sa.create_engine = MagicMock()
_sa.Column = MagicMock()
_sa.Integer = MagicMock()
_sa.String = MagicMock()
_sa.Float = MagicMock()
_sa.Text = MagicMock()
_sa.orm = MagicMock()
_sa.orm.Session = MagicMock()
_sa.orm.DeclarativeBase = MagicMock()
_sa.orm.sessionmaker = MagicMock(return_value=MagicMock())

import sqlalchemy.orm as _orm  # noqa: E402
_orm.Session = MagicMock()
_orm.DeclarativeBase = MagicMock()
_orm.sessionmaker = MagicMock(return_value=MagicMock())

# ── 建立輕量 test app（只掛需要測試的 router）────────────────────────────────

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

test_app = FastAPI()


@test_app.get("/health")
async def health() -> dict:
    from datetime import datetime, timezone
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# tasks router 依賴最輕，直接掛
with patch.dict("os.environ", {"DATABASE_URL": "sqlite://", "REDIS_URL": "redis://localhost:6379"}):
    from app.routers.tasks import router as tasks_router  # noqa: E402
    test_app.include_router(tasks_router)


@pytest.fixture
def client() -> TestClient:
    return TestClient(test_app)


# ── Health ────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_returns_ok(self, client: TestClient) -> None:
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        assert "timestamp" in res.json()


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TestTasksRouter:
    def test_embed_product_success(self, client: TestClient) -> None:
        mock_result = MagicMock()
        mock_result.id = "fake-task-id-123"

        mock_module = MagicMock()
        mock_module.embed_product.delay.return_value = mock_result
        with patch.dict("sys.modules", {"app.tasks.embed_product": mock_module}):
            res = client.post("/tasks/embed-product", json={"product_id": 42})

        assert res.status_code == 200
        body = res.json()
        assert body["product_id"] == 42
        assert body["task_id"] == "fake-task-id-123"

    def test_embed_product_missing_field_returns_422(self, client: TestClient) -> None:
        res = client.post("/tasks/embed-product", json={})
        assert res.status_code == 422

    def test_embed_product_celery_error_returns_500(self, client: TestClient) -> None:
        mock_module = MagicMock()
        mock_module.embed_product.delay.side_effect = Exception("Redis unavailable")
        with patch.dict("sys.modules", {"app.tasks.embed_product": mock_module}):
            res = client.post("/tasks/embed-product", json={"product_id": 1})

        assert res.status_code == 500

    def test_embed_product_invalid_type_returns_422(self, client: TestClient) -> None:
        res = client.post("/tasks/embed-product", json={"product_id": "not-a-number"})
        assert res.status_code == 422
