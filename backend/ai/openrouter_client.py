import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

async def query_openrouter(prompt: str, model: str = "mistralai/mistral-7b-instruct", api_key: str = None) -> str:
    if not api_key:
        raise ValueError("OpenRouter API key not configured. Please add it in Settings > AI Models.")
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
        resp = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return content or ""
