import os
import shlex
from agent import sandbox
from agent.model import ask_json

TEST_TIMEOUT = 300
TEST_ENDINGS = [".test.js", ".spec.js", ".test.ts", ".spec.ts", ".test.jsx", ".test.tsx"]


def detect_test_command(box):
    package = sandbox.read_text(box, "package.json")
    if package and '"test"' in package and "no test specified" not in package:
        return "npm test --silent"

    found = sandbox.run(box, "ls pytest.ini setup.cfg tox.ini pyproject.toml 2>/dev/null; find . -path ./node_modules -prune -o \\( -name 'test_*.py' -o -name '*_test.py' \\) -print | head -1", timeout=30)
    if found["output"].strip():
        return "python3 -m pytest -q -p no:cacheprovider"
    return None


def is_test_file(path):
    name = os.path.basename(path).lower()
    folders = path.lower().split("/")[:-1]
    if name.startswith("test_") and name.endswith(".py"):
        return True
    if name.endswith("_test.py") or name.endswith("_test.go"):
        return True
    for ending in TEST_ENDINGS:
        if name.endswith(ending):
            return True
    if "tests" in folders or "__tests__" in folders:
        return name.endswith(".py") or name.endswith(".js") or name.endswith(".ts")
    return False


def run_tests(box, test_command):
    result = sandbox.run(box, test_command, timeout=TEST_TIMEOUT)
    ok = result["code"] == 0
    if "pytest" in test_command and result["code"] == 5:
        ok = False
        result["output"] = result["output"] + "\n[no tests were found]"
    return {"ok": ok, "output": result["output"]}


def cross_command(test_command, test_files):
    if "pytest" not in test_command:
        return test_command
    python_files = []
    for path in test_files:
        if path.endswith(".py"):
            python_files.append(shlex.quote(path))
    if len(python_files) == 0:
        return test_command
    return "python3 -m pytest -q -p no:cacheprovider " + " ".join(python_files)


def compute_verdict(forks, checks):
    good = []
    good_numbers = []
    for fork in forks:
        if fork.get("tests_ok"):
            good.append(fork)
            good_numbers.append(fork["fork_no"])

    if len(good) == 0:
        return {"verdict": "failing", "chosen": None, "agree": None}

    pairs = 0
    passed = 0
    passed_by_fork = {}
    for check in checks:
        if check["tests_from"] == check["code_of"]:
            continue
        if check["tests_from"] not in good_numbers or check["code_of"] not in good_numbers:
            continue
        pairs = pairs + 1
        if check["passed"]:
            passed = passed + 1
            old = passed_by_fork.get(check["code_of"], 0)
            passed_by_fork[check["code_of"]] = old + 1

    best = None
    best_score = -1
    best_size = 0
    for fork in good:
        score = passed_by_fork.get(fork["fork_no"], 0)
        size = len(fork.get("diff") or "")
        if best is None or score > best_score or (score == best_score and size < best_size):
            best = fork
            best_score = score
            best_size = size

    if len(good) == 1 or pairs == 0:
        return {"verdict": "fragile", "chosen": best["fork_no"], "agree": None}

    agree = passed / pairs
    if agree == 1:
        verdict = "verified"
    elif agree < 0.5:
        verdict = "choice_dependent"
    else:
        verdict = "fragile"
    return {"verdict": verdict, "chosen": best["fork_no"], "agree": round(agree * 100)}


def explain(task, forks, checks, result):
    lines = []
    for fork in forks:
        state = "failed"
        if fork.get("tests_ok"):
            state = "passed"
        lines.append("Fork " + str(fork["fork_no"]) + " (tests " + state + "): " + (fork.get("summary") or "")[:600])

    shown = 0
    for check in checks:
        if check["passed"] or shown >= 4:
            continue
        shown = shown + 1
        lines.append("Tests of fork " + str(check["tests_from"]) + " FAILED on the code of fork " + str(check["code_of"]) + ":\n" + (check.get("output") or "")[-1200:])

    prompt = "Task given to several independent engineers:\n" + task + "\n\n"
    prompt = prompt + "Verdict: " + result["verdict"] + "  (verified, fragile, choice_dependent or failing)\n"
    prompt = prompt + "Chosen fork: " + str(result["chosen"]) + "\n\n"
    prompt = prompt + "What happened:\n" + "\n".join(lines) + "\n\n"
    prompt = prompt + "Write JSON with two keys:\n"
    prompt = prompt + '"summary": 2 or 3 plain sentences for the user about what was built and how sure we are.\n'
    prompt = prompt + '"question": only if the verdict is choice_dependent or fragile, ONE question that asks the user to choose between the different behaviours the forks chose. Otherwise "".\n'

    answer = ask_json(prompt)
    if answer is None:
        return default_explanation(result)
    summary = str(answer.get("summary") or "")
    if summary == "":
        summary = default_explanation(result)["summary"]
    return {"summary": summary, "question": str(answer.get("question") or "")}


def default_explanation(result):
    texts = {
        "verified": "Independent forks built the change and every fork passed the tests written by the others.",
        "fragile": "The change works and passes its tests, but the forks did not fully agree, or there was nothing to compare it with. Review it carefully.",
        "choice_dependent": "The forks built working code that behaves differently. The task can be read in more than one way.",
        "failing": "No fork produced code that passes the tests."
    }
    return {"summary": texts.get(result["verdict"], ""), "question": ""}
