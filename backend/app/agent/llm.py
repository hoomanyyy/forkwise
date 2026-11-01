import asyncio
import json
import httpx
from app import config

RETRY_STATUS = [408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524, 529]


class ModelError(Exception):
    pass


def with_cache(messages, model):
    if "claude" not in model["id"].lower() and "anthropic" not in model["id"].lower():
        return messages
    result = []
    for message in messages:
        if message["role"] == "system" and isinstance(message.get("content"), str):
            result.append({"role": "system", "content": [{"type": "text", "text": message["content"], "cache_control": {"type": "ephemeral"}}]})
        else:
            result.append(message)
    return result


def headers_for(model):
    return {
        "Authorization": "Bearer " + model["api_key"],
        "Content-Type": "application/json",
        "HTTP-Referer": config.SITE_URL,
        "X-Title": "Forkwise",
    }


async def stream_chat(model, messages, tools=None, on_delta=None, max_tokens=16000, temperature=None, stop_flag=None):
    if model is None:
        raise ModelError("No AI model is set up. Add LLM_API_KEY and LLM_MODELS to the .env file.")
    body = {
        "model": model["id"],
        "messages": with_cache(messages, model),
        "stream": True,
        "max_tokens": max_tokens,
        "stream_options": {"include_usage": True},
    }
    if temperature is not None:
        body["temperature"] = temperature
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"
    last_problem = ""
    for attempt in range(5):
        streamed = {"any": False}
        try:
            return await stream_once(model, body, on_delta, streamed, stop_flag)
        except ModelError as problem:
            last_problem = str(problem)
            if streamed["any"] or not retryable(last_problem):
                raise
        except (httpx.TransportError, httpx.TimeoutException) as problem:
            last_problem = "Connection problem: " + str(problem)
            if streamed["any"]:
                raise ModelError(last_problem)
        await asyncio.sleep(min(30, 2 ** attempt * 1.5))
    raise ModelError(last_problem or "The model did not answer.")


def retryable(text):
    for status in RETRY_STATUS:
        if text.startswith("HTTP " + str(status)):
            return True
    return False


async def stream_once(model, body, on_delta, streamed, stop_flag):
    content = []
    reasoning = []
    calls = {}
    usage = {"prompt_tokens": 0, "completion_tokens": 0}
    finish = ""
    timeout = httpx.Timeout(connect=20, read=300, write=60, pool=20)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", model["url"] + "/chat/completions", headers=headers_for(model), json=body) as response:
            if response.status_code != 200:
                raw = await response.aread()
                raise ModelError("HTTP " + str(response.status_code) + ": " + raw.decode("utf-8", "replace")[:600])
            async for line in response.aiter_lines():
                if stop_flag is not None and stop_flag.is_set():
                    finish = "stopped"
                    break
                line = line.strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    packet = json.loads(data)
                except ValueError:
                    continue
                if packet.get("error"):
                    error = packet["error"]
                    if isinstance(error, dict):
                        error = error.get("message") or json.dumps(error)
                    raise ModelError("Provider error: " + str(error)[:600])
                if packet.get("usage"):
                    found = packet["usage"]
                    usage["prompt_tokens"] = found.get("prompt_tokens") or usage["prompt_tokens"]
                    usage["completion_tokens"] = found.get("completion_tokens") or usage["completion_tokens"]
                choices = packet.get("choices") or []
                if len(choices) == 0:
                    continue
                choice = choices[0]
                if choice.get("finish_reason"):
                    finish = choice["finish_reason"]
                delta = choice.get("delta") or {}
                think = delta.get("reasoning") or delta.get("reasoning_content") or ""
                if think:
                    streamed["any"] = True
                    reasoning.append(think)
                    if on_delta:
                        await on_delta("reasoning", think)
                piece = delta.get("content")
                if piece:
                    streamed["any"] = True
                    content.append(piece)
                    if on_delta:
                        await on_delta("text", piece)
                for call in delta.get("tool_calls") or []:
                    streamed["any"] = True
                    index = call.get("index", 0)
                    if index not in calls:
                        calls[index] = {"id": "", "type": "function", "function": {"name": "", "arguments": ""}}
                    slot = calls[index]
                    if call.get("id"):
                        slot["id"] = call["id"]
                    function = call.get("function") or {}
                    if function.get("name"):
                        slot["function"]["name"] = slot["function"]["name"] + function["name"]
                        if on_delta:
                            await on_delta("tool_name", {"index": index, "id": slot["id"], "name": slot["function"]["name"]})
                    if function.get("arguments"):
                        slot["function"]["arguments"] = slot["function"]["arguments"] + function["arguments"]
                        if on_delta:
                            await on_delta("tool_args", {"index": index, "id": slot["id"], "name": slot["function"]["name"], "delta": function["arguments"]})
    tool_calls = []
    for index in sorted(calls.keys()):
        slot = calls[index]
        if slot["function"]["name"] == "":
            continue
        if slot["id"] == "":
            slot["id"] = "call_" + str(index) + "_" + str(len(tool_calls))
        tool_calls.append(slot)
    if usage["prompt_tokens"] == 0:
        usage["prompt_tokens"] = estimate_tokens(body["messages"])
    if usage["completion_tokens"] == 0:
        usage["completion_tokens"] = (len("".join(content)) + len("".join(reasoning))) // 4
    return {
        "content": "".join(content),
        "reasoning": "".join(reasoning),
        "tool_calls": tool_calls,
        "usage": usage,
        "finish": finish,
    }


def estimate_tokens(messages):
    total = 0
    for message in messages:
        content = message.get("content")
        if isinstance(content, str):
            total = total + len(content)
        elif isinstance(content, list):
            for part in content:
                if part.get("type") == "text":
                    total = total + len(part.get("text", ""))
                else:
                    total = total + 3000
        for call in message.get("tool_calls") or []:
            total = total + len(call["function"].get("arguments") or "")
    return total // 3


async def ask(messages, model=None, max_tokens=2000):
    chosen = model or config.small_model()
    result = await stream_chat(chosen, messages, max_tokens=max_tokens, temperature=0.3)
    return result["content"].strip()
