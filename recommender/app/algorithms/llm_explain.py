import json
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

_MODEL = "claude-haiku-4-5-20251001"

_SYSTEM_PROMPT = (
    "你是一個童裝 B2B 採購平台的推薦助手，協助零售商了解為何某件商品值得採購。"
    "回覆風格：簡潔、專業、口語化。"
)


class LLMExplainer:
    """Generate one-sentence purchase reasons for recommended products via Claude."""

    _instance: "LLMExplainer | None" = None

    def __init__(self) -> None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self._client: anthropic.Anthropic | None = (
            anthropic.Anthropic(api_key=api_key) if api_key else None
        )
        if not self._client:
            logger.warning("ANTHROPIC_API_KEY not set — LLM explanations disabled")

    @classmethod
    def get_instance(cls) -> "LLMExplainer":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def explain_batch(
        self, products: list[dict], source: str
    ) -> list[str | None]:
        """Return a reason string per product; falls back to None on any error."""
        if not self._client or not products:
            return [None] * len(products)

        context = (
            "根據您的購買歷史個人化推薦" if source == "svd" else "本週熱門商品推薦"
        )
        numbered = "\n".join(
            f"{i + 1}. {p['name']}（{p['category']}，{p['shop']['name']}，"
            f"批發價 NT${p['base_price']}）"
            for i, p in enumerate(products)
        )
        user_prompt = (
            f"推薦情境：{context}\n\n商品清單：\n{numbered}\n\n"
            "請為每件商品各寫一句推薦理由（15–25 字），說明為何這件商品值得採購。\n"
            "直接輸出 JSON 字串陣列，格式：[\"理由1\", \"理由2\", ...]，不要有其他文字。"
        )

        try:
            message = self._client.messages.create(
                model=_MODEL,
                max_tokens=600,
                system=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )
            raw = message.content[0].text.strip()
            reasons: list = json.loads(raw)
            if isinstance(reasons, list) and len(reasons) == len(products):
                return [str(r) if r else None for r in reasons]
        except Exception as exc:
            logger.warning("LLM explain failed: %s", exc)

        return [None] * len(products)
