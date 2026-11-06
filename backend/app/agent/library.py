from pathlib import Path

FOLDER = Path(__file__).parent / "skills"
ORDER = ["Build", "Quality", "Ship", "Research", "Documents", "Browser"]


def parse(text):
    info = {"name": "", "title": "", "category": "Build", "description": "", "body": text}
    if not text.startswith("---"):
        return info
    end = text.find("\n---", 3)
    if end < 0:
        return info
    head = text[3:end]
    for line in head.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        if key in ["name", "title", "category", "description"]:
            info[key] = value.strip()
    info["body"] = text[end + 4:].lstrip("\n")
    return info


def load():
    found = []
    if not FOLDER.exists():
        return found
    for path in sorted(FOLDER.glob("*.md")):
        info = parse(path.read_text(encoding="utf-8"))
        if info["name"] == "":
            info["name"] = path.stem
        if info["title"] == "":
            info["title"] = info["name"]
        found.append(info)
    ordered = []
    for category in ORDER:
        for item in found:
            if item["category"] == category:
                ordered.append(item)
    for item in found:
        if item["category"] not in ORDER:
            ordered.append(item)
    return ordered


SKILLS = load()


def find(name):
    for item in SKILLS:
        if item["name"] == name:
            return item
    return None


def public():
    result = []
    for item in SKILLS:
        result.append({"name": item["name"], "title": item["title"], "category": item["category"], "description": item["description"], "builtin": True})
    return result


def prompt_lines():
    lines = []
    for item in SKILLS:
        lines.append("- " + item["name"] + ": " + item["description"])
    return lines
