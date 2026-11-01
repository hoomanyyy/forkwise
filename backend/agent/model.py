import os
import time
import json
import copy
import requests
from dotenv import load_dotenv
from agent.blocks import salvage_calls

load_dotenv()

BASE_URL = os.getenv("AGENT_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
API_KEY = os.getenv("AGENT_API_KEY")
MAIN_MODEL = os.getenv("AGENT_MODEL")
SMALL_MODEL = os.getenv("AGENT_SMALL_MODEL") or MAIN_MODEL
# one model or a comma separated list, tried in order when the main model fails
FALLBACK_MODELS = [m.strip() for m in (os.getenv("AGENT_FALLBACK_MODEL") or "").split(",") if m.strip()]
SITE_URL = os.getenv("BASE_SITE_URL", "https://forkwiseai.com")

LIMIT_WORDS = ["rate limit", "rate_limit", "too many requests", "quota", "daily free allocation", "credits",
               "insufficient", "overloaded", "capacity", "exceeded"]


def is_limit_error(status, text):
    """True when waiting or another model can help: rate limits, no credits, overloaded servers."""
    if status in [402, 408, 409, 425, 429, 500, 502, 503, 504, 529]:
        return True
    lower = (text or "").lower()
    for word in LIMIT_WORDS:
        if word in lower:
            return True
    return False


def wait_seconds(response, attempt):
    try:
        value = response.headers.get("retry-after")
        if value:
            return min(max(float(value), 1), 60)
    except Exception:
        pass
    return min(5 * (2 ** attempt), 40)


def with_cache_marks(messages, model):
    """Anthropic models on OpenRouter only cache what is marked. The system prompt and the
    last text message of the user are marked, so the long fixed start of every request is cheap."""
    if not model or not model.startswith("anthropic/"):
        return messages
    marked = copy.deepcopy(messages)
    targets = []
    if marked and marked[0].get("role") == "system":
        targets.append(0)
    for i in range(len(marked) - 1, 0, -1):
        if marked[i].get("role") == "user" and isinstance(marked[i].get("content"), str):
            targets.append(i)
            break
    for i in targets:
        content = marked[i].get("content")
        if isinstance(content, str) and content:
            marked[i]["content"] = [{"type": "text", "text": content, "cache_control": {"type": "ephemeral"}}]
        elif isinstance(content, list) and content:
            last = content[-1]
            if isinstance(last, dict) and last.get("type") == "text":
                last["cache_control"] = {"type": "ephemeral"}
    return marked


def call_model(messages, tools=None, model=None, max_tokens=4000, temperature=0.4):
    """Returns {"message", "tokens", "model"} or {"error", "limit": bool}.
    On a limit error it tries every fallback model before giving up."""
    first = model or MAIN_MODEL
    order = [first] + [m for m in FALLBACK_MODELS if m != first]
    result = {"error": "No model is set. Put AGENT_MODEL in the worker settings.", "limit": False}
    for i, name in enumerate(order):
        if not name:
            continue
        if i > 0:
            print("MODEL: trying the fallback model", name, flush=True)
        result = call_one_model(messages, tools, name, max_tokens, temperature)
        if "error" not in result:
            result["model"] = name
            return result
    return result


def call_one_model(messages, tools, model, max_tokens, temperature):
    if not API_KEY:
        return {"error": "AGENT_API_KEY is empty in the worker settings.", "limit": False}
    body = {
        "model": model,
        "messages": with_cache_marks(messages, model),
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    if tools:
        body["tools"] = tools

    headers = {
        "Authorization": "Bearer " + str(API_KEY),
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-Title": "Forkwise Studio"
    }

    last_error = ""
    limit = False
    bad_json = False
    for attempt in range(4):
        try:
            response = requests.post(BASE_URL + "/chat/completions", headers=headers, json=body, timeout=240)
            if response.status_code == 200:
                data = response.json()
                if data.get("error"):
                    last_error = "provider error: " + json.dumps(data["error"])[:300]
                    limit = is_limit_error(0, last_error)
                    if limit:
                        time.sleep(wait_seconds(response, attempt))
                        continue
                    break
                choices = data.get("choices") or []
                if not choices:
                    last_error = "the model sent an empty answer"
                    time.sleep(2)
                    continue
                message = choices[0]["message"]
                tokens = 0
                if data.get("usage"):
                    tokens = data["usage"].get("total_tokens", 0) or 0
                return {"message": message, "tokens": tokens, "finish": choices[0].get("finish_reason")}

            last_error = "status " + str(response.status_code) + ": " + response.text[:300]
            limit = is_limit_error(response.status_code, response.text)
            # some providers (for example Groq) refuse an answer whose tool call is not valid JSON;
            # a new try usually works, because the model writes the call again
            lower = response.text.lower()
            if response.status_code == 400 and ("tool_use_failed" in lower or "parse tool call" in lower):
                bad_json = True
                # the refused text is often still readable: repair it and use it, no new request needed
                saved = saved_answer(response)
                if saved:
                    print("MODEL: repaired a broken tool call from", model, flush=True)
                    return saved
                if attempt < 2:
                    time.sleep(1)
                    continue
                break
            # a used up daily allowance will not come back in a few seconds, so go to the next model
            if response.status_code == 402 or "daily" in response.text.lower():
                break
            if limit:
                time.sleep(wait_seconds(response, attempt))
                continue
            break
        except requests.exceptions.Timeout:
            last_error = "the model took too long to answer"
            limit = True
        except Exception as e:
            last_error = str(e)[:300]
            limit = True
            time.sleep(3)

    print("MODEL ERROR:", model, last_error, flush=True)
    return {"error": last_error, "limit": limit, "bad_tool_json": bad_json}


def saved_answer(response):
    try:
        error = response.json().get("error") or {}
    except ValueError:
        return None
    failed = error.get("failed_generation")
    if not isinstance(failed, str):
        return None
    calls, cut = salvage_calls(failed)
    if not calls:
        # no tool call in it: it may be a normal answer the provider did not like
        if failed.strip() and not failed.strip().startswith(("{", "[", "<function")):
            return {"message": {"role": "assistant", "content": failed}, "tokens": 0, "finish": "stop"}
        return None
    return {"message": {"role": "assistant", "content": "", "tool_calls": calls}, "tokens": 0,
            "finish": "length" if cut else "tool_calls", "repaired": True, "cut": cut}


def ask_json(prompt, system="Answer with JSON only."):
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
