import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

celery_app = Celery(
    "kidswear_recommender",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.embed_product"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Taipei",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
