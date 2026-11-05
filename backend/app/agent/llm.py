import asyncio
import json
import re
import time
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


def flat_text(content):
    if isinstance(content, str):
        return content
    if content is None:
        return ""
    pieces = []
    if isinstance(content, list):
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                pieces.append(part.get("text") or "")
            elif isinstance(part, str):
                pieces.append(part)
    return "\n".join(pieces)


def for_plain_models(messages, model):
    if not model["id"].startswith("@cf/"):
        return messages
    result = []
    for message in messages:
        copy = dict(message)
        if isinstance(copy.get("content"), list) or copy.get("content") is None:
            copy["content"] = flat_text(copy.get("content"))
        result.append(copy)
    return result


def headers_for(model):
    return {
        "Authorization": "Bearer " + model["api_key"],
        "Content-Type": "application/json",
        "HTTP-Referer": config.SITE_URL,
        "X-Title": "Forkwise",
    }


IMAGE_URL_PREFIX = re.compile(r"^data:image/(png|jpeg|jpg|webp|gif);base64,", re.IGNORECASE)


def fixed_call(call):
    function = dict(call.get("function") or {})
    arguments = function.get("arguments", "")
    if not isinstance(arguments, str):
        arguments = json.dumps(arguments if arguments is not None else {})
    try:
        parsed = json.loads(arguments) if arguments.strip() else None
    except ValueError:
        parsed = None
    if not isinstance(parsed, dict):
        arguments = "{}"
    function["arguments"] = arguments
    result = dict(call)
    result["type"] = "function"
    result["function"] = function
    return result


def clean_messages(messages):
    result = []
    for message in messages:
        copy = dict(message)
        if copy.get("role") == "assistant" and copy.get("tool_calls"):
            copy["tool_calls"] = [fixed_call(call) for call in copy["tool_calls"] if isinstance(call, dict)]
        content = copy.get("content")
        if isinstance(content, list):
            parts = []
            for part in content:
                if not isinstance(part, dict):
                    continue
                if part.get("type") == "text" and (part.get("text") or "").strip():
                    parts.append(part)
                elif part.get("type") == "image_url" and IMAGE_URL_PREFIX.match(str((part.get("image_url") or {}).get("url") or "")):
                    parts.append(part)
            content = parts if parts else None
        elif isinstance(content, str) and content.strip() == "":
            content = None
        copy["content"] = content
        if copy.get("role") == "assistant" and not copy.get("tool_calls") and content is None:
            continue
        if copy.get("role") == "user" and content is None:
            copy["content"] = "(empty message)"
        if copy.get("role") == "tool" and content is None:
            copy["content"] = "(no output)"
        result.append(copy)
    return result


def text_only(messages):
    result = []
    for message in messages:
        copy = dict(message)
        if isinstance(copy.get("content"), list):
            copy["content"] = flat_text(copy["content"]) or "(empty message)"
        result.append(copy)
    return clean_messages(result)


NAME_OK = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")
PROPERTY_OK = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,63}$")
SCHEMA_TYPES = ["string", "number", "integer", "boolean", "array", "object"]


def clean_schema(value, depth=0):
    if not isinstance(value, dict) or depth > 6:
        return None
    kind = value.get("type")
    if isinstance(kind, list):
        picked = None
        for item in kind:
            if item in SCHEMA_TYPES:
                picked = item
                break
        kind = picked
    if kind not in SCHEMA_TYPES:
        kind = "object" if isinstance(value.get("properties"), dict) else "string"
    node = {"type": kind}
    if isinstance(value.get("description"), str) and value["description"].strip():
        node["description"] = value["description"][:1000]
    if isinstance(value.get("enum"), list):
        allowed = []
        for item in value["enum"]:
            if isinstance(item, (str, int, float, bool)):
                allowed.append(str(item))
        if len(allowed) > 0:
            node["type"] = "string"
            node["enum"] = allowed
            return node
    if kind == "array":
        node["items"] = clean_schema(value.get("items"), depth + 1) or {"type": "string"}
    if kind == "object":
        properties = {}
        source = value.get("properties")
        if isinstance(source, dict):
            for key in source:
                child = clean_schema(source[key], depth + 1)
                if child is None:
                    continue
                if not PROPERTY_OK.match(str(key)):
                    print("MODEL SCHEMA dropped bad property name:", str(key)[:60], flush=True)
                    continue
                properties[str(key)] = child
        if len(properties) == 0:
            hint = node.get("description", "")
            node = {"type": "string"}
            node["description"] = (hint + " Give it as a JSON object in a string.").strip()
            return node
        node["properties"] = properties
        required = []
        if isinstance(value.get("required"), list):
            for name in value["required"]:
                if isinstance(name, str) and name in properties:
                    required.append(name)
        if len(required) > 0:
            node["required"] = required
    return node


def clean_tools(tools):
    if not tools:
        return tools
    result = []
    for tool in tools:
        if not isinstance(tool, dict):
            continue
        function = tool.get("function")
        if not isinstance(function, dict):
            continue
        name = str(function.get("name") or "")
        if not NAME_OK.match(name):
            print("MODEL TOOL SKIPPED, bad name:", name[:80], flush=True)
            continue
        cleaned = {"name": name}
        if isinstance(function.get("description"), str) and function["description"].strip():
            cleaned["description"] = function["description"][:4000]
        schema = clean_schema(function.get("parameters"))
        if schema is not None and schema.get("type") == "object" and len(schema.get("properties") or {}) > 0:
            cleaned["parameters"] = schema
        result.append({"type": "function", "function": cleaned})
    return result


def tool_names(tools):
    found = []
    for tool in tools or []:
        function = tool.get("function") or {}
        found.append(str(function.get("name") or "?"))
    return found


def message_shapes(messages):
    parts = []
    for message in messages or []:
        content = message.get("content")
        if isinstance(content, list):
            kinds = []
            for part in content:
                kinds.append(str((part or {}).get("type"))[:5] if isinstance(part, dict) else "?")
            shape = "[" + "+".join(kinds) + "]"
        elif content is None:
            shape = "none"
        else:
            shape = str(len(str(content)))
        if message.get("tool_calls"):
            shape = shape + "+calls" + str(len(message["tool_calls"]))
        if message.get("tool_call_id"):
            shape = shape + "+id"
        parts.append(str(message.get("role")) + ":" + shape)
    return " ".join(parts)


def body_summary(body):
    parts = []
    for key in sorted(body.keys()):
        if key == "messages":
            parts.append("messages=" + str(len(body[key])))
        elif key == "tools":
            parts.append("tools=" + str(len(body[key])))
        else:
            parts.append(key + "=" + json.dumps(body[key])[:140])
    return " ".join(parts)


def merge_turns(messages):
    result = []
    for message in messages:
        last = result[-1] if len(result) > 0 else None
        same = last is not None and last.get("role") == message.get("role")
        plain = message.get("role") in ["user", "assistant"] and not message.get("tool_calls")
        if same and plain and not last.get("tool_calls"):
            left = last.get("content")
            right = message.get("content")
            if isinstance(left, str) and isinstance(right, str):
                joined = dict(last)
                joined["content"] = left + "\n\n" + right
                result[-1] = joined
                continue
        result.append(message)
    return result


def next_degrade(body, state):
    while state["step"] < 9:
        step = state["step"]
        state["step"] = step + 1
        if step == 0 and ("reasoning" in body or "reasoning_effort" in body):
            body.pop("reasoning", None)
            body.pop("reasoning_effort", None)
            return "without reasoning"
        if step == 1 and "stream_options" in body:
            del body["stream_options"]
            return "without stream_options"
        if step == 2:
            merged = merge_turns(body["messages"])
            if len(merged) != len(body["messages"]):
                body["messages"] = merged
                return "with same-role turns merged"
        if step == 3:
            plain = merge_turns(text_only(body["messages"]))
            if plain != body["messages"]:
                body["messages"] = plain
                return "with plain text messages"
        if step == 4 and "temperature" in body:
            del body["temperature"]
            return "without temperature"
        if step == 5 and "tool_choice" in body:
            del body["tool_choice"]
            return "without tool_choice"
        if step == 6 and body.get("max_tokens", 0) > 8192:
            body["max_tokens"] = 8192
            return "with max_tokens 8192"
        if step == 7 and body.get("tools"):
            kept = []
            for tool in body["tools"]:
                name = (tool.get("function") or {}).get("name") or ""
                if not name.startswith("my_") and not name.startswith("mcp__"):
                    kept.append(tool)
            if len(kept) != len(body["tools"]):
                body["tools"] = kept
                return "without custom and MCP tools"
        if step == 8 and body.get("tools"):
            del body["tools"]
            body.pop("tool_choice", None)
            return "without any tools"
    return None


async def stream_single(model, messages, tools, on_delta, max_tokens, temperature, stop_flag, attempts, effort=""):
    body = {
        "model": model["id"],
        "messages": for_plain_models(with_cache(clean_messages(messages), model), model),
        "stream": True,
        "max_tokens": max_tokens,
        "stream_options": {"include_usage": True},
    }
    if temperature is not None:
        body["temperature"] = temperature
    if effort in ["low", "medium", "high"]:
        if "openrouter" in model["url"]:
            body["reasoning"] = {"effort": effort}
        else:
            body["reasoning_effort"] = effort
    safe_tools = clean_tools(tools)
    if safe_tools:
        body["tools"] = safe_tools
        body["tool_choice"] = "auto"
    last_problem = ""
    told = {"on": False}
    state = {"step": 0}
    attempt = 0
    while attempt < attempts:
        streamed = {"any": False}
        try:
            return await stream_once(model, body, on_delta, streamed, stop_flag)
        except ModelError as problem:
            last_problem = str(problem)
            if streamed["any"]:
                raise
            if last_problem.startswith("HTTP 400"):
                if not told["on"]:
                    told["on"] = True
                    print("MODEL 400", model["key"], model["id"], "|", body_summary(body), "| tools:", ",".join(tool_names(body.get("tools"))), "| messages:", message_shapes(body.get("messages")), "| raw:", last_problem[:400], flush=True)
                    for tool in body.get("tools") or []:
                        name = (tool.get("function") or {}).get("name") or ""
                        if name.startswith("my_") or name.startswith("mcp__"):
                            print("MODEL 400 user tool", name, json.dumps(tool.get("function", {}).get("parameters"), ensure_ascii=False)[:600], flush=True)
                label = next_degrade(body, state)
                if label is not None:
                    print("MODEL 400 retrying", label, flush=True)
                    continue
            if not retryable(last_problem):
                raise
        except (httpx.TransportError, httpx.TimeoutException) as problem:
            last_problem = "Connection problem: " + str(problem)
            if streamed["any"]:
                raise ModelError(last_problem)
        await asyncio.sleep(min(30, 2 ** attempt * 1.5))
        attempt = attempt + 1
    raise ModelError(last_problem or "The model did not answer.")


COOLDOWNS = {}
LEARNED_CONTEXT = {}
MIN_ANSWER_ROOM = 1500


def real_context(model):
    size = model.get("context") or 128000
    learned = LEARNED_CONTEXT.get(model["key"])
    if learned and learned < size:
        return learned
    return size


def learn_limit(model, text):
    found = re.search(r"(?:window|context)[^0-9]{0,60}limit[^0-9]{0,6}(\d{4,7})", text, re.IGNORECASE)
    if not found:
        found = re.search(r"maximum context length is (\d{4,7})", text, re.IGNORECASE)
    if not found:
        found = re.search(r"limit \((\d{4,7})\)", text, re.IGNORECASE)
    if found:
        LEARNED_CONTEXT[model["key"]] = int(found.group(1))
        return int(found.group(1))
    return 0


def is_overflow(text):
    lowered = text.lower()
    if status_of(text) == 413:
        return True
    if "context" in lowered and ("length" in lowered or "too long" in lowered or "exceed" in lowered or "maximum" in lowered or "limit" in lowered):
        return True
    return "too many tokens" in lowered or "input and maximum output" in lowered


def tools_size(tools):
    if not tools:
        return 0
    return len(json.dumps(tools)) // 3
FAILOVER_STATUS = [401, 402, 403, 404, 408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524, 529]


def status_of(text):
    if text.startswith("HTTP "):
        digits = text[5:8]
        if digits.isdigit():
            return int(digits)
    return 0


def wait_seconds(text):
    found = re.search(r"retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?", text)
    if found and (found.group(1) or found.group(2) or found.group(3)):
        hours = int(found.group(1) or 0)
        minutes = int(found.group(2) or 0)
        seconds = float(found.group(3) or 0)
        return int(hours * 3600 + minutes * 60 + seconds) + 1
    status = status_of(text)
    if status in [401, 403, 404]:
        return 3600
    if status == 429:
        return 120
    return 45


def cooling(model):
    until = COOLDOWNS.get(model["key"], 0)
    return until > time.time()


def candidates_for(model):
    result = [model]
    for other in config.MODELS:
        if other["key"] != model["key"]:
            result.append(other)
    ready = []
    waiting = []
    for item in result:
        if cooling(item):
            waiting.append(item)
        else:
            ready.append(item)
    return ready + waiting


async def stream_chat(model, messages, tools=None, on_delta=None, max_tokens=16000, temperature=None, stop_flag=None, effort=""):
    if model is None:
        raise ModelError("No AI model is set up. Add LLM_API_KEY and LLM_MODELS to the .env file.")
    need = estimate_tokens(messages) + tools_size(tools)
    if not config.FAILOVER:
        room = real_context(model) - need - 500
        return await stream_single(model, messages, tools, on_delta, fit_output(max_tokens, room), temperature, stop_flag, 5, effort)
    options = candidates_for(model)
    last = None
    for position in range(len(options)):
        item = options[position]
        last_one = position == len(options) - 1
        if cooling(item) and not last_one:
            continue
        room = real_context(item) - need - 500
        if room < MIN_ANSWER_ROOM and not last_one:
            continue
        try:
            answer = await stream_single(item, messages, tools, on_delta, fit_output(max_tokens, room), temperature, stop_flag, 5 if last_one else 2, effort)
            if item["key"] != model["key"]:
                answer["switched_to"] = item["label"]
            return answer
        except ModelError as problem:
            last = problem
            text = str(problem)
            if is_overflow(text):
                learn_limit(item, text)
                if not last_one:
                    continue
                raise
            if status_of(text) in FAILOVER_STATUS and not last_one:
                COOLDOWNS[item["key"]] = time.time() + wait_seconds(text)
                print("MODEL FAILOVER", item["key"], text[:160], flush=True)
                continue
            raise
    if last is not None:
        raise last
    raise ModelError("The model did not answer.")


def fit_output(max_tokens, room):
    if room >= max_tokens:
        return max_tokens
    if room < 512:
        return 512
    return room


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
    last_index = 0
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
                    index = call.get("index")
                    if index is None:
                        index = last_index
                        if call.get("id") and last_index in calls and calls[last_index]["id"] and calls[last_index]["id"] != call["id"]:
                            index = last_index + 1
                    last_index = index
                    if index not in calls:
                        calls[index] = {"id": "", "type": "function", "function": {"name": "", "arguments": ""}}
                    slot = calls[index]
                    if call.get("id"):
                        slot["id"] = call["id"]
                    if call.get("extra_content"):
                        slot["extra_content"] = call["extra_content"]
                    function = call.get("function") or {}
                    if function.get("name"):
                        slot["function"]["name"] = slot["function"]["name"] + function["name"]
                        if on_delta:
                            await on_delta("tool_name", {"index": index, "id": slot["id"], "name": slot["function"]["name"]})
                    if function.get("arguments"):
                        piece_args = function["arguments"]
                        if not isinstance(piece_args, str):
                            piece_args = json.dumps(piece_args, ensure_ascii=False)
                        slot["function"]["arguments"] = slot["function"]["arguments"] + piece_args
                        if on_delta:
                            await on_delta("tool_args", {"index": index, "id": slot["id"], "name": slot["function"]["name"], "delta": piece_args})
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
