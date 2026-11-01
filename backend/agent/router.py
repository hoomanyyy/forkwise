"""Decides what kind of message the user sent, so Studio does not start a project for "hello".

    chat     small talk or a question the model can answer from what it knows
    answer   needs fresh facts from the internet (prices, news, weather, a website), with a search query
    project  make or change code, files, sites, data analysis, images, video, or anything that needs the computer
"""
import re
from agent.model import ask_json

GREETINGS = ["سلام", "درود", "خوبی", "خوبین", "چطوری", "مرسی", "ممنون", "ممنونم", "مچکرم", "متشکرم", "خداحافظ",
             "hi", "hello", "hey", "thanks", "thank you", "thx", "bye", "good morning", "good night", "salam"]
CONTINUE_WORDS = ["continue", "go on", "go ahead", "ادامه", "ادامه بده", "برو", "ادامه بده لطفا", "بساز", "شروع کن", "ok", "اوکی", "باشه"]

PROMPT = """Classify the last message of the user to an AI assistant that can also build software on its own computer.

Kinds:
- "chat": greetings, thanks, small talk, opinions, or a question that general knowledge answers well (how something works, an explanation, advice, translating or writing a short text). No files, no code to run.
- "answer": the answer needs current facts from the internet: prices (dollar, gold, crypto, products), news, weather, scores, schedules, recent events, what a website says now, the latest version of something.
- "project": make, change, run, fix or test code, a website, an app, a script, a file, a data analysis or chart, an image, a video or audio, use a browser or the computer, or work on files the user uploaded. Short follow ups on earlier work ("make the button blue", "fix it", "add a login page") are projects too.

Earlier work in this chat: {history}

Last message of the user:
\"\"\"{message}\"\"\"

Answer with JSON only: {"kind": "chat" | "answer" | "project", "query": "a web search query for kind answer, in the language that gives the best results, else empty"}"""


def simple(text):
    text = re.sub(r"[!؟?.,،:;)(\s]+", " ", text.lower()).strip()
    return text


def quick_kind(message, has_project):
    words = simple(message)
    if words == "":
        return "project" if has_project else "chat"
    if words in CONTINUE_WORDS and has_project:
        return "project"
    if len(words.split()) <= 5:
        rest = words
        for greeting in sorted(GREETINGS, key=len, reverse=True):
            rest = rest.replace(greeting, " ")
        rest = re.sub(r"\b(jan|joon|جان|عزیز|دوست|من|you|so much|very much|a lot|خیلی|مرسی)\b", " ", rest).strip()
        if rest == "":
            return "chat"
    return None


def classify(message, has_project, history_note, has_upload):
    """Returns (kind, query). On any doubt or error it returns project, the safe choice."""
    if has_upload:
        return "project", ""
    kind = quick_kind(message, has_project)
    if kind:
        return kind, ""
    answer = ask_json(PROMPT.replace("{history}", history_note or "none").replace("{message}", message[:3000]))
    if not isinstance(answer, dict):
        return "project", ""
    kind = str(answer.get("kind", "")).strip().lower()
    query = str(answer.get("query") or "").strip()
    if kind == "answer":
        return "answer", query or message[:200]
    if kind == "chat":
        return "chat", ""
    return "project", ""
