# The Verifier: checks the forks against each other and gives the verdict.
#
# The main idea (cross testing):
#   every fork writes its own tests. We run the tests of fork A on the code of fork B.
#   - all forks pass each other's tests  -> they behave the same     -> verified
#   - they fail each other's tests a lot -> the task can be read in more than one way -> choice_dependent
#   - something in between, or only one fork works -> fragile
#   - no fork passes its tests -> failing

import os
import shlex
from agent import sandbox
from agent.model import ask_json

TEST_TIMEOUT = 300


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
    for ending in [".test.js", ".spec.js", ".test.ts", ".spec.ts", ".test.jsx", ".test.tsx"]:
        if name.endswith(ending):
            return True
    if "tests" in folders or "__tests__" in folders:
        return name.endswith(".py") or name.endswith(".js") or name.endswith(".ts")
    return False


def run_tests(box, test_command):
    result = sandbox.run(box, test_command, timeout=TEST_TIMEOUT)
    ok = result["code"] == 0
    if "pytest" in test_command and result["code"] == 5:
        # pytest exit code 5 means "no tests found"
        ok = False
        result["output"] += "\n[no tests were found]"
    return {"ok": ok, "output": result["output"]}


def cross_command(test_command, test_files):
    if "pytest" in test_command:
        python_files = [shlex.quote(f) for f in test_files if f.endswith(".py")]
        if python_files:
            return "python3 -m pytest -q -p no:cacheprovider " + " ".join(python_files)
    return test_command


def compute_verdict(forks, checks):
    # forks:  [{"fork_no": 1, "tests_ok": True, "diff": "..."}, ...]
    # checks: [{"tests_from": 1, "code_of": 2, "passed": True}, ...]
    good = [f for f in forks if f.get("tests_ok")]

    if len(good) == 0:
        return {"verdict": "failing", "chosen": None, "agree": None}

    good_numbers = [f["fork_no"] for f in good]
    pairs = [c for c in checks if c["tests_from"] in good_numbers and c["code_of"] in good_numbers and c["tests_from"] != c["code_of"]]
    passed = [c for c in pairs if c["passed"]]

    # Pick the fork that passes the most tests written by the others, then the smallest change.
    best = None
    best_score = None
    for f in good:
        score = len([c for c in passed if c["code_of"] == f["fork_no"]])
        size = len(f.get("diff") or "")
        key = (score, -size)
        if best is None or key > best_score:
            best = f
            best_score = key

    if len(good) == 1:
        return {"verdict": "fragile", "chosen": best["fork_no"], "agree": None}
    if len(pairs) == 0:
        # Several forks work, but none wrote tests we could share, so we cannot compare them.
        return {"verdict": "fragile", "chosen": best["fork_no"], "agree": None}

    agree = len(passed) / len(pairs)
    if agree == 1:
        verdict = "verified"
    elif agree < 0.5:
        verdict = "choice_dependent"
    else:
        verdict = "fragile"
    return {"verdict": verdict, "chosen": best["fork_no"], "agree": round(agree * 100)}


def explain(task, forks, checks, result):
    # Ask the cheap model for a short, honest summary (and a question if the forks disagree).
    lines = []
    for f in forks:
        lines.append("Fork " + str(f["fork_no"]) + " (tests " + ("passed" if f.get("tests_ok") else "failed") + "): " + (f.get("summary") or "")[:600])
    failed = [c for c in checks if not c["passed"]][:4]
    for c in failed:
        lines.append("Tests of fork " + str(c["tests_from"]) + " FAILED on the code of fork " + str(c["code_of"]) + ":\n" + (c.get("output") or "")[-1200:])

    prompt = f"""Task given to several independent engineers:
{task}

Verdict: {result["verdict"]}  (verified, fragile, choice_dependent or failing)
Chosen fork: {result["chosen"]}

What happened:
{chr(10).join(lines)}

Write JSON with two keys:
"summary": 2 or 3 plain sentences for the user about what was built and how sure we are.
"question": only if the verdict is choice_dependent or fragile, ONE question that asks the user to choose between the different behaviours the forks chose. Otherwise "".
"""
    answer = ask_json(prompt)
    if answer is None:
        return default_explanation(result)
    return {"summary": str(answer.get("summary") or default_explanation(result)["summary"]), "question": str(answer.get("question") or "")}


def default_explanation(result):
    texts = {
        "verified": "Independent forks built the change and every fork passed the tests written by the others.",
        "fragile": "The change works and passes its tests, but the forks did not fully agree, or there was nothing to compare it with. Review it carefully.",
        "choice_dependent": "The forks built working code that behaves differently. The task can be read in more than one way.",
        "failing": "No fork produced code that passes the tests."
    }
    return {"summary": texts.get(result["verdict"], ""), "question": ""}
