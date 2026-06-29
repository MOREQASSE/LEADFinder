import httpx
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import AIConfig


def _is_token_error(e: Exception) -> bool:
    msg = str(e).lower()
    return any(kw in msg for kw in ("413", "tokens_limit", "too large", "token limit", "content_length", "429", "rate limit"))


def _is_retryable(e: Exception) -> bool:
    msg = str(e).lower()
    if _is_token_error(e):
        return False
    if any(kw in msg for kw in ("401", "403", "invalid api key", "unauthorized", "not found")):
        return False
    return True


async def query_llm_api(provider: str, model: str, api_key: str, prompt: str, max_tokens: int = 500) -> str:
    if not api_key:
        raise ValueError(f"API key missing for provider {provider}")

    async with httpx.AsyncClient(timeout=30) as client:
        if provider == "openrouter":
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens}
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"] or ""

        elif provider in ("github", "azure"):
            url = (
                "https://models.github.ai/inference/chat/completions"
                if provider == "github"
                else "https://models.inference.ai.azure.com/chat/completions"
            )
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens}
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"] or ""

        elif provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens}
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"] or ""

        elif provider == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
            payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": max_tokens}
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["content"][0]["text"] or ""

        elif provider == "google":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"maxOutputTokens": max_tokens}}
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"] or ""

        else:
            raise ValueError(f"Unsupported provider: {provider}")


async def query_with_fallback(prompt: str, db: AsyncSession, max_tokens: int = 500) -> str:
    result = await db.execute(select(AIConfig))
    all_configs = result.scalars().all()
    if not all_configs:
        return "I would be happy to help with your project. Let me know if you'd like to discuss further!"

    sorted_configs = sorted(all_configs, key=lambda c: (c.provider not in ("github", "azure"), not c.is_primary))

    exhausted_providers: set[str] = set()
    last_error = None

    for config in sorted_configs:
        model_id = f"{config.provider}/{config.model}"

        if model_id in exhausted_providers:
            continue

        try:
            return await query_llm_api(config.provider, config.model, config.api_key, prompt, max_tokens=max_tokens)
        except Exception as e:
            last_error = e
            if _is_token_error(e):
                exhausted_providers.add(model_id)
            if _is_retryable(e):
                await asyncio.sleep(1)

    return "I would be happy to help with your project. Let me know if you'd like to discuss further!"
