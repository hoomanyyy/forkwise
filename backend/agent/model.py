# Talks to the language model.
# It uses the "OpenAI compatible" format, which almost every provider supports:
#   OpenRouter  (one key for Claude, GPT, Gemini, Qwen...)  AGENT_BASE_URL=https://openrouter.ai/api/v1
#   OpenAI                                                   AGENT_BASE_URL=https://api.openai.com/v1
#   Cloudflare Workers AI                                    AGENT_BASE_URL=https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1
# So you can change the model without changing the code.

import os
import time
import json
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("AGENT_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
API_KEY = os.getenv("AGENT_API_KEY")
MAIN_MODEL = os.getenv("AGENT_MODEL")                       # strong model, writes the code
SMALL_MODEL = os.getenv("AGENT_SMALL_MODEL") or MAIN_MODEL  # cheap model, writes short summaries


def call_model(messages, tools=None, model=None, max_tokens=4000, temperature=0.4):
    if model is None:
        model = MAIN_MODEL

    body = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    if tools:
        body["tools"] = tools

    headers = {"Authorization": "Bearer " + str(API_KEY), "Content-Type": "application/json"}

    last_error = ""
    for attempt in range(3):
        try:
            response = requests.post(BASE_URL + "/chat/completions", headers=headers, json=body, timeout=180)
            if response.status_code == 200:
                data = response.json()
                message = data["choices"][0]["message"]
                tokens = 0
                if data.get("usage"):
                    tokens = data["usage"].get("total_tokens", 0) or 0
                return {"message": message, "tokens": tokens}

            last_error = "status " + str(response.status_code) + ": " + response.text[:300]
            # 429 = too many requests, 5xx = provider problem: wait and try again
            if response.status_code == 429 or response.status_code >= 500:
                time.sleep(5 * (attempt + 1))
                continue
            break
        except Exception as e:
            last_error = str(e)
            time.sleep(3)

    print("MODEL ERROR:", last_error, flush=True)
    return {"error": last_error}


def ask_json(prompt, system="Answer with JSON only."):
    # A short question for the cheap model that must come back as JSON.
    result = call_model([
        {"role": "system", "content": system},
        {"role": "user", "content": prompt}
    ], model=SMALL_MODEL, max_tokens=600, temperature=0.2)

    if "error" in result:
        return None
    text = result["message"].get("content") or ""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(text[start:end + 1])
    except ValueError:
        return None
