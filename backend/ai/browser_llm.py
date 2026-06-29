import logging
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import AIConfig
from browser_use.llm import ChatOpenRouter, ChatOpenAI, ChatAnthropic, ChatGoogle
from browser_use.llm import BaseMessage
from browser_use.llm.base import BaseChatModel, ChatInvokeCompletion

logger = logging.getLogger(__name__)

_BROWSER_LLM_AVAILABLE = True


class RotatingChatModel:
    _verified_api_keys: bool = True

    def __init__(self, models: list[BaseChatModel]):
        self.models = models
        self.active_index = 0
        self._exhausted: set[int] = set()
        self._update_active_model_properties()

    def _update_active_model_properties(self):
        if self.models:
            current = self.models[self.active_index]
            self.model = current.model
            self._current_provider = current.provider
            self._current_name = current.name
        else:
            self.model = "unknown"
            self._current_provider = "unknown"
            self._current_name = "unknown"

    @property
    def provider(self) -> str:
        return self._current_provider

    @property
    def name(self) -> str:
        return self._current_name

    @property
    def model_name(self) -> str:
        return self.model

    def _available_indices(self) -> list[int]:
        return [i for i in range(len(self.models)) if i not in self._exhausted]

    def _is_token_error(self, e: Exception) -> bool:
        msg = str(e)
        return any(kw in msg for kw in ("413", "tokens_limit", "too large", "token limit", "content_length"))

    async def ainvoke(
        self, messages: list[BaseMessage], output_format: type[Any] | None = None, **kwargs: Any
    ) -> ChatInvokeCompletion[Any]:
        if not self.models:
            raise RuntimeError("No AI models configured in RotatingChatModel.")

        available = self._available_indices()
        if not available:
            raise RuntimeError(
                "All models exhausted due to token limits. "
                "Restart the browser agent to reset context."
            )

        if self.active_index not in available:
            self.active_index = available[0]
            self._update_active_model_properties()

        last_error = None
        for _ in range(len(available)):
            current_model = self.models[self.active_index]
            logger.info(
                f"[RotatingChatModel] Attempting LLM call using model "
                f"{current_model.provider}/{current_model.model} (Index: {self.active_index})"
            )
            try:
                self._update_active_model_properties()
                res = await current_model.ainvoke(messages, output_format=output_format, **kwargs)
                return res
            except Exception as e:
                last_error = e
                if self._is_token_error(e):
                    self._exhausted.add(self.active_index)
                    logger.warning(
                        f"[RotatingChatModel] Model {current_model.provider}/{current_model.model} "
                        f"exceeded token limit — marked exhausted. {len(self._available_indices())} models left."
                    )
                else:
                    logger.warning(
                        f"[RotatingChatModel] Model {current_model.provider}/{current_model.model} "
                        f"failed: {e}. Rotating to next configured model..."
                    )
                available = self._available_indices()
                if not available:
                    break
                if self.active_index in available:
                    self.active_index = available[
                        (available.index(self.active_index) + 1) % len(available)
                    ]
                else:
                    self.active_index = available[0]
                self._update_active_model_properties()

        logger.error("[RotatingChatModel] All configured models failed.")
        if last_error:
            raise last_error
        raise RuntimeError("All configured AI models failed during rotation.")

    def invoke(
        self, messages: list[BaseMessage], output_format: type[Any] | None = None, **kwargs: Any
    ) -> ChatInvokeCompletion[Any]:
        if not self.models:
            raise RuntimeError("No AI models configured in RotatingChatModel.")

        available = self._available_indices()
        if not available:
            raise RuntimeError(
                "All models exhausted due to token limits. "
                "Restart the browser agent to reset context."
            )

        if self.active_index not in available:
            self.active_index = available[0]
            self._update_active_model_properties()

        last_error = None
        for _ in range(len(available)):
            current_model = self.models[self.active_index]
            try:
                self._update_active_model_properties()
                res = current_model.invoke(messages, output_format=output_format, **kwargs)
                return res
            except Exception as e:
                last_error = e
                if self._is_token_error(e):
                    self._exhausted.add(self.active_index)
                available = self._available_indices()
                if not available:
                    break
                if self.active_index in available:
                    self.active_index = available[
                        (available.index(self.active_index) + 1) % len(available)
                    ]
                else:
                    self.active_index = available[0]
                self._update_active_model_properties()

        if last_error:
            raise last_error
        raise RuntimeError("All configured AI models failed during rotation.")


def _create_llm(provider: str, model: str, api_key: str | None):
    if not api_key:
        raise ValueError(f"API key missing for {provider} / {model}")
    if provider == "openrouter":
        return ChatOpenRouter(
            model=model,
            api_key=api_key,
            timeout=30,
            max_retries=2,
            temperature=0.0
        )
    elif provider == "github":
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://models.github.ai/inference",
            timeout=30,
            max_retries=2,
            temperature=0.0
        )
    elif provider == "azure":
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://models.inference.ai.azure.com",
            timeout=30,
            max_retries=2,
            temperature=0.0
        )
    elif provider == "openai":
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            timeout=30,
            max_retries=2,
            temperature=0.0
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model=model,
            api_key=api_key,
            timeout=30,
            max_retries=2,
            temperature=0.0
        )
    elif provider == "google":
        return ChatGoogle(
            model=model,
            api_key=api_key,
            max_retries=2,
            temperature=0.0
        )
    else:
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=30,
            max_retries=2,
            temperature=0.0
        )


async def get_browser_llm(db: AsyncSession):
    """Read AIConfig table and return a RotatingChatModel for browser-use Agent."""
    result = await db.execute(select(AIConfig))
    all_configs = result.scalars().all()
    if not all_configs:
        raise ValueError("No AI models configured. Add one in Settings > AI Model.")

    # Sort: GitHub models first (free, support structured output), then primary, then others
    sorted_configs = sorted(all_configs, key=lambda c: (c.provider not in ('github', 'azure'), not c.is_primary))

    loaded_models = []
    for config in sorted_configs:
        try:
            model_client = _create_llm(config.provider, config.model, config.api_key)
            loaded_models.append(model_client)
        except Exception as e:
            logger.warning(f"Failed to initialize model {config.provider}/{config.model}: {e}")

    if not loaded_models:
        raise ValueError("Failed to initialize any of the configured AI models.")

    rotating_llm = RotatingChatModel(loaded_models)
    return rotating_llm, None
