import httpx

GITHUB_MODELS_URL = "https://models.github.ai/inference/chat/completions"
AZURE_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions"

async def query_github_models(prompt: str, model: str = "openai/gpt-4o-mini", api_key: str = None) -> str:
    if not api_key:
        raise ValueError("GitHub Models token not configured. Please add it in Settings > AI Models.")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(GITHUB_MODELS_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return content or ""

async def query_azure_models(prompt: str, model: str = "gpt-4o-mini", api_key: str = None) -> str:
    if not api_key:
        raise ValueError("Azure AI Inference token not configured.")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(AZURE_MODELS_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return content or ""
