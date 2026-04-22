import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="retrain_svd")
def retrain_svd() -> dict:
    """Retrain the SVD collaborative-filtering model from latest order data."""
    from app.algorithms.svd_rec import SvdRecommender
    from app.database import SessionLocal

    logger.info("retrain_svd: starting SVD retraining …")

    with SessionLocal() as db:
        recommender = SvdRecommender.get_instance()
        recommender.train(db)

    logger.info("retrain_svd: done")
    return {"status": "ok"}
