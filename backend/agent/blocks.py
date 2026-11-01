"""Files written as plain text, not as JSON.

A model that has to put a whole file inside a JSON tool call must escape every quote, backslash and
new line. Weak models break that often, and some providers (for example Groq) then refuse the whole
answer. So Studio lets the model write files straight into its message:

    <file path="/workspace/app/main.py">
    ...the whole file...
    </file>

    <edit path="/workspace/app/main.py">
    <<<<<<< SEARCH
    old text
    =======
    new text
    >>>>>>> REPLACE
    </edit>

This module finds those blocks, and also repairs broken JSON from tool calls when it can."""
import re
import json

WORKSPACE = "/workspace"
ALLOWED_ROOTS = ["/workspace", "/home/agent/outputs"]

FILE_OPEN = re.compile(r"<(file|edit)\s+path\s*=\s*[\"']?([^\"'>\s]+)[\"']?([^>]*)>", re.I)
EDIT_PART = re.compile(r"<{5,9}\s*SEARCH\s*\n(.*?)\n?={5,9}\s*\n(.*?)\n?>{5,9}\s*REPLACE", re.S)


def clean_path(path):
    path = (path or "").strip().strip("`")
    if path == "":
        return None
    if not path.startswith("/"):
        path = WORKSPACE + "/" + path.lstrip("./")
    parts = []
    for part in path.split("/"):
        if part in ["", "."]:
            continue
        if part == "..":
            if parts:
                parts.pop()
            continue
        parts.append(part)
    path = "/" + "/".join(parts)
    for root in ALLOWED_ROOTS:
        if path == root or path.startswith(root + "/"):
            return path
    return None


def strip_fence(body):
    """Models often put a markdown code fence inside the block. Take it off."""
    lines = body.split("\n")
    while lines and lines[0].strip() == "":
        lines.pop(0)
    while lines and lines[-1].strip() == "":
        lines.pop()
    if len(lines) >= 2 and lines[0].strip().startswith("```") and lines[-1].strip() == "```":
        lines = lines[1:-1]
    elif lines and lines[0].strip().startswith("```") and len(lines[0].strip()) < 20:
        # an opening fence without a closing one: the answer was cut
        lines = lines[1:]
    return "\n".join(lines)


def find_blocks(text):
    """Returns (text without the blocks, list of actions). An action is a dict:
    {"kind": "file" | "edit", "path", "content", "append", "cut"}. "cut" means the closing tag
    is missing, so the answer ended in the middle of the block."""
    if not text or "<" not in text:
        return text or "", []
    actions = []
    kept = []
    position = 0
    while True:
        match = FILE_OPEN.search(text, position)
        if not match:
            kept.append(text[position:])
            break
        kept.append(text[position:match.start()])
        kind = match.group(1).lower()
        path = match.group(2)
        extra = match.group(3) or ""
        append = re.search(r"append\s*=\s*[\"']?(true|yes|1)", extra, re.I) is not None
        start = match.end()
        close = re.search(r"</" + kind + r"\s*>", text[start:], re.I)
        cut = close is None
        if cut:
            body = text[start:]
            position = len(text)
        else:
            body = text[start:start + close.start()]
            position = start + close.end()
        if body.startswith("\n"):
            body = body[1:]
        actions.append({"kind": kind, "path": path, "content": body, "append": append, "cut": cut})
        if cut:
            kept.append("")
            break
    clean = "".join(kept)
    clean = re.sub(r"\n{3,}", "\n\n", clean).strip()
    return clean, actions


def apply_edit(old_text, body):
    parts = EDIT_PART.findall(body)
    if not parts:
        return None, "the edit block has no SEARCH / ======= / REPLACE parts"
    text = old_text
    for search, replace in parts:
        if search in text:
            if text.count(search) > 1:
                return None, "this SEARCH text appears more than once, add more lines around it:\n" + search[:300]
            text = text.replace(search, replace, 1)
            continue
        # the same lines with different spaces at the end of the lines
        found = loose_find(text, search)
        if found is None:
            return None, "this SEARCH text was not found in the file (copy it exactly, read_file first):\n" + search[:300]
        text = text[:found[0]] + replace + text[found[1]:]
    return text, None


def loose_find(text, search):
    want = [line.rstrip() for line in search.split("\n")]
    lines = text.split("\n")
    size = len(want)
    if size == 0:
        return None
    hits = []
    for i in range(len(lines) - size + 1):
        if [line.rstrip() for line in lines[i:i + size]] == want:
            hits.append(i)
    if len(hits) != 1:
        return None
    start = sum(len(line) + 1 for line in lines[:hits[0]])
    end = start + sum(len(line) + 1 for line in lines[hits[0]:hits[0] + size]) - 1
    return start, end


def run_blocks(actions, read_text, write_text):
    """Carries out the actions. read_text(path) returns the text or None, write_text(path, text)
    returns a problem or None. Returns a list of (path, kind, report, ok)."""
    reports = []
    for action in actions:
        path = clean_path(action["path"])
        if path is None:
            reports.append((action["path"], action["kind"], "Not saved: files go in /workspace (or /home/agent/outputs).", False))
            continue
        if action["kind"] == "file":
            body = strip_fence(action["content"])
            if action["append"]:
                old = read_text(path) or ""
                if old and not old.endswith("\n"):
                    old = old + "\n"
                body = old + body
            if not body.endswith("\n"):
                body = body + "\n"
            problem = write_text(path, body)
            if problem:
                reports.append((path, "file", problem, False))
                continue
            lines = body.count("\n")
            if action["cut"]:
                reports.append((path, "file", "Saved, but your answer was cut off inside this file. It now has " + str(lines) +
                                " lines and ends with:\n" + last_lines(body) +
                                "\nWrite the rest with <file path=\"" + path + "\" append=\"true\"> starting right after that line.", False))
            else:
                reports.append((path, "file", "Saved (" + str(lines) + " lines).", True))
        else:
            if action["cut"]:
                reports.append((path, "edit", "Not changed: your answer was cut off inside the edit block. Send the edit again.", False))
                continue
            old = read_text(path)
            if old is None:
                reports.append((path, "edit", "Not changed: the file does not exist. Write it with a <file> block.", False))
                continue
            new, problem = apply_edit(old, action["content"])
            if problem:
                reports.append((path, "edit", "Not changed: " + problem, False))
                continue
            problem = write_text(path, new)
            if problem:
                reports.append((path, "edit", problem, False))
            else:
                reports.append((path, "edit", "Changed.", True))
    return reports


def last_lines(text, count=3):
    lines = text.rstrip("\n").split("\n")
    return "\n".join(lines[-count:])


def report_text(reports):
    lines = []
    for path, kind, report, ok in reports:
        lines.append(("[saved] " if ok else "[problem] ") + path + ": " + report)
    return "\n".join(lines)


# ---------------------------------------------------------------- broken JSON

CLOSERS = ["", "}", "\"}", "\"}}", "}}", "\"]}", "\"}]}", "]}", "\"]}}", "}]}"]


def loose_json(text):
    """Reads JSON that a model wrote, even with raw new lines in strings, wrong backslashes or a
    missing end. Returns (value, was_cut) or (None, False)."""
    if text is None:
        return None, False
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    if text == "":
        return {}, False
    tries = [text, re.sub(r"\\(?![\"\\/bfnrtu])", r"\\\\", text)]
    for candidate in tries:
        for closer in CLOSERS:
            try:
                value = json.loads(candidate + closer, strict=False)
                return value, closer != ""
            except ValueError:
                continue
    return None, False


def salvage_calls(failed):
    """Groq sends the text of a refused tool call back as failed_generation. Turn it into normal
    tool calls when it can be read. Returns (calls, was_cut)."""
    if not failed:
        return [], False
    failed = failed.strip()
    items = []
    cut = False
    # <function=name>{...}</function> (some Llama models)
    for name, body in re.findall(r"<function=([\w\-]+)>?(.*?)(?:</function>|$)", failed, re.S):
        args, was_cut = loose_json(body)
        if isinstance(args, dict):
            items.append({"name": name, "arguments": args})
            cut = cut or was_cut
    if not items:
        value, was_cut = loose_json(failed)
        cut = was_cut
        if isinstance(value, dict):
            value = [value]
        if isinstance(value, list):
            for item in value:
                if not isinstance(item, dict):
                    continue
                name = item.get("name") or (item.get("function") or {}).get("name")
                args = item.get("arguments")
                if args is None:
                    args = item.get("parameters")
                if args is None:
                    args = (item.get("function") or {}).get("arguments")
                if isinstance(args, str):
                    args, more = loose_json(args)
                    cut = cut or more
                if name and isinstance(args, dict):
                    items.append({"name": name, "arguments": args})
    if cut and items:
        items[-1]["arguments"]["_cut"] = True
    calls = []
    for i, item in enumerate(items):
        calls.append({"id": "fw_saved_" + str(i), "type": "function",
                      "function": {"name": item["name"], "arguments": json.dumps(item["arguments"])}})
    return calls, cut
