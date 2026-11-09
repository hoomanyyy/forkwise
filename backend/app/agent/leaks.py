import json
import re

"""
Some open models, GPT-OSS above all, sometimes write a tool call as plain text
in their "harmony" format instead of a real tool call, for example:
analysisWe should list files.<|end|><|start|>assistant to=functions.bash code<|message|>{"command": "ls"}<|call|>
Without help the run then ends, because there is no tool call. This file finds
such calls, turns them into real ones and cleans the text.
"""

MARKERS = ["<|start|>", "<|channel|>", "<|message|>", "<|call|>", "<|end|>", "<|return|>", "<|constrain|>", "<|assistant", "to=functions"]
HOLD = "to=functions"


def has_leak(text):
    if not text:
        return False
    for marker in MARKERS:
        if marker in text:
            return True
    return False


def analysis_start(text):
    found = re.match(r"\s*analysis(?=[A-Z<\"'(])", text)
    if found:
        return found.start()
    return -1


def first_marker(text):
    best = -1
    for marker in MARKERS:
        position = text.find(marker)
        if position >= 0 and (best < 0 or position < best):
            best = position
    start = analysis_start(text)
    if start >= 0 and (best < 0 or start < best):
        best = start
    return best


def safe_end(text):
    end = len(text)
    tail_start = max(0, end - 14)
    angle = text.rfind("<", tail_start)
    if angle >= 0 and "|>" not in text[angle:]:
        end = angle
    for size in range(len(HOLD) - 1, 1, -1):
        if text[:end].endswith(HOLD[:size]):
            end = end - size
            break
    if len(text) < 10 and "analysis".startswith(text.strip()):
        end = 0
    return end


def read_object(text, start):
    begin = text.find("{", start)
    if begin < 0:
        return None, -1
    depth = 0
    inside = False
    escaped = False
    for position in range(begin, len(text)):
        char = text[position]
        if inside:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == "\"":
                inside = False
            continue
        if char == "\"":
            inside = True
        elif char == "{":
            depth = depth + 1
        elif char == "}":
            depth = depth - 1
            if depth == 0:
                return text[begin:position + 1], position + 1
    return None, -1


def parse_object(raw):
    try:
        value = json.loads(raw)
    except ValueError:
        fixed = re.sub(r",\s*([}\]])", r"\1", raw)
        try:
            value = json.loads(fixed)
        except ValueError:
            return None
    if isinstance(value, dict):
        return value
    return None


def pick_name(word, names):
    for suffix in ["commentary", "analysis", "final", "code", "json"]:
        if word.endswith(suffix) and len(word) > len(suffix):
            word = word[:-len(suffix)]
    if word in names:
        return word
    simple = word.lower().replace("-", "_")
    for name in names:
        if name.lower() == simple:
            return name
    aliases = {"ls": "list_dir", "list_files": "list_dir", "listdir": "list_dir", "read": "read_file", "open_file": "read_file", "write": "write_file", "create_file": "write_file", "shell": "bash", "exec": "bash", "run": "bash", "terminal": "bash", "search": "grep"}
    if simple in aliases and aliases[simple] in names:
        return aliases[simple]
    return ""


def extract_calls(text, names):
    calls = []
    unknown = []
    if not text:
        return calls, unknown
    for found in re.finditer(r"to=functions[.\s]*([A-Za-z0-9_\-]+)", text):
        raw, end = read_object(text, found.end())
        if raw is None:
            continue
        args = parse_object(raw)
        if args is None:
            continue
        name = pick_name(found.group(1), names)
        if not name:
            unknown.append(found.group(1))
            continue
        calls.append({"name": name, "arguments": json.dumps(args, ensure_ascii=False)})
    return calls, unknown


def clean(text):
    if not text:
        return "", ""
    reasoning = ""
    visible = text
    start = analysis_start(visible)
    if start >= 0:
        stop = visible.find("<|end|>", start)
        if stop >= 0:
            reasoning = visible[start + len("analysis"):stop].strip()
            visible = visible[:start] + visible[stop + len("<|end|>"):]
        else:
            reasoning = visible[start + len("analysis"):].strip()
            visible = visible[:start]
    cut = first_marker(visible)
    if cut >= 0:
        rest = visible[cut:]
        final = re.search(r"<\|channel\|>\s*final\s*<\|message\|>(.*?)(<\|end\|>|<\|return\|>|$)", rest, re.S)
        visible = visible[:cut]
        if final:
            visible = visible + final.group(1)
    for marker in MARKERS:
        visible = visible.replace(marker, "")
    return visible.strip(), reasoning


def repair_note(names, unknown):
    text = "Your last message wrote a tool call as plain text (with markers like <|start|>, <|channel|> or to=functions). Text like that does not run anything, so nothing happened. Call tools only through the function calling interface, one real tool call at a time, and do not write those markers in your answer."
    if unknown:
        text = text + " There is no tool named " + ", ".join(unknown[:3]) + "."
    shown = sorted(names)[:40]
    if shown:
        text = text + " Your tools are: " + ", ".join(shown) + "."
    return text
