# The Fork Engine: runs one task with several independent agents and then verifies them.
#
#  1. clone the repository once
#  2. start one sandbox per fork and copy the code in
#  3. run the setup command (with internet), then cut the internet
#  4. every fork runs the agent loop in parallel, each with its own style
#  5. run the tests in every fork
#  6. cross testing: the tests of each fork run on the code of every other fork
#  7. verdict, the chosen fork's patch, and a short explanation

import os
import shutil
import threading
from datetime import datetime
from database import agent_db
from agent import sandbox, verify
from agent.loop import run_agent

STYLES = [
    "You make the smallest change that solves the task.",
    "You are very careful about edge cases and wrong input.",
    "You write clean, readable code and you are happy to restructure it.",
    "You think about speed and performance.",
    "You write the tests first, then the code."
]


def box_name(task_id, fork_no):
    return "fw-task-" + str(task_id) + "-fork-" + str(fork_no)


def prepare_fork(task, fork_no, folder):
    task_id = task["id"]
    box = box_name(task_id, fork_no)

    def log(kind, text):
        agent_db.add_event(task_id, fork_no, kind, text)

    problem = sandbox.start_sandbox(box)
    if problem is None:
        problem = sandbox.copy_repo_in(box, folder)
    if problem:
        log("error", problem)
        return problem

    if task.get("setup_command"):
        log("tool", "$ " + task["setup_command"] + "   (setup, internet on)")
        result = sandbox.run(box, task["setup_command"], timeout=600)
        if result["code"] != 0:
            log("error", "The setup command failed:\n" + result["output"][-2000:])
            return "setup failed"

    sandbox.cut_internet(box)
    sandbox.save_point(box, "forkwise start")
    return None


def prepare_into(task, fork_no, folder, problems):
    problems[fork_no] = prepare_fork(task, fork_no, folder)


def work_on_fork(task, fork_no, test_command, results):
    task_id = task["id"]
    box = box_name(task_id, fork_no)

    def log(kind, text):
        agent_db.add_event(task_id, fork_no, kind, text)

    agent_db.update_fork(task_id, fork_no, {"status": "working"})
    style = STYLES[(fork_no - 1) % len(STYLES)]
    try:
        answer = run_agent(box, task["task"], style, test_command, log)

        tests = {"ok": False, "output": "No test command was found."}
        if test_command:
            log("tool", "$ " + test_command + "   (final check)")
            tests = verify.run_tests(box, test_command)
            log("info", "Tests " + ("passed" if tests["ok"] else "failed"))

        diff = sandbox.get_diff(box)
        test_files = [f for f in sandbox.changed_files(box) if verify.is_test_file(f)]
        sandbox.save_point(box, "forkwise fork " + str(fork_no))

        if diff.strip() == "":
            tests["ok"] = False
            log("error", "This fork did not change any file.")

        results[fork_no] = {
            "fork_no": fork_no,
            "tests_ok": tests["ok"],
            "diff": diff,
            "summary": answer["summary"],
            "test_files": test_files
        }
        agent_db.update_fork(task_id, fork_no, {
            "status": "done" if answer["ok"] else "failed",
            "summary": answer["summary"],
            "diff": diff,
            "tests_ok": 1 if tests["ok"] else 0,
            "test_output": tests["output"][-6000:],
            "steps": answer["steps"],
            "tokens": answer["tokens"]
        })
    except Exception as e:
        log("error", "This fork crashed: " + str(e))
        agent_db.update_fork(task_id, fork_no, {"status": "failed", "summary": "Crashed: " + str(e)})
        results[fork_no] = {"fork_no": fork_no, "tests_ok": False, "diff": "", "summary": "", "test_files": []}


def cross_test(task, results, test_command):
    task_id = task["id"]
    checks = []
    good = [r for r in results.values() if r["tests_ok"]]

    for author in good:
        if len(author["test_files"]) == 0:
            continue
        author_box = box_name(task_id, author["fork_no"])
        files = {}
        for path in author["test_files"]:
            text = sandbox.read_text(author_box, path)
            if text is not None:
                files[path] = text

        for other in good:
            if other["fork_no"] == author["fork_no"]:
                continue
            other_box = box_name(task_id, other["fork_no"])
            for path in files:
                sandbox.write_text(other_box, path, files[path])
            result = verify.run_tests(other_box, verify.cross_command(test_command, list(files.keys())))
            sandbox.go_back(other_box)

            check = {"tests_from": author["fork_no"], "code_of": other["fork_no"], "passed": result["ok"], "output": result["output"][-4000:]}
            checks.append(check)
            agent_db.add_check(task_id, check["tests_from"], check["code_of"], check["passed"], check["output"])
            agent_db.add_event(task_id, 0, "info", "Tests of fork " + str(check["tests_from"]) + " on fork " + str(check["code_of"]) + ": " + ("passed" if check["passed"] else "FAILED"))
    return checks


def run_task(task):
    task_id = task["id"]
    forks = max(1, min(int(task["forks"] or 3), 5))
    folder = os.path.join(sandbox.WORK_DIR, "task-" + str(task_id))

    def log(kind, text):
        agent_db.add_event(task_id, 0, kind, text)

    try:
        log("info", "Cloning " + task["repo_url"])
        problem = sandbox.clone_repo(task["repo_url"], task.get("branch"), folder)
        if problem:
            raise Exception(problem)

        for n in range(1, forks + 1):
            agent_db.add_fork(task_id, n, STYLES[(n - 1) % len(STYLES)])

        log("info", "Starting " + str(forks) + " sandboxes")
        problems = {}
        threads = []
        for n in range(1, forks + 1):
            t = threading.Thread(target=prepare_into, args=(task, n, folder, problems))
            t.start()
            threads.append(t)
        for t in threads:
            t.join()

        ready = [n for n in range(1, forks + 1) if problems.get(n) is None]
        for n in range(1, forks + 1):
            if n not in ready:
                agent_db.update_fork(task_id, n, {"status": "failed", "summary": "The sandbox could not be prepared."})
        if len(ready) == 0:
            raise Exception("No sandbox could be prepared. See the log.")

        test_command = task.get("test_command") or verify.detect_test_command(box_name(task_id, ready[0]))
        log("info", "Test command: " + (test_command or "none found"))

        log("info", "The forks are working")
        results = {}
        threads = []
        for n in ready:
            t = threading.Thread(target=work_on_fork, args=(task, n, test_command, results))
            t.start()
            threads.append(t)
        for t in threads:
            t.join()

        checks = []
        if test_command:
            log("info", "Cross testing the forks")
            checks = cross_test(task, results, test_command)

        forks_list = [results[n] for n in sorted(results)]
        result = verify.compute_verdict(forks_list, checks)
        explanation = verify.explain(task["task"], forks_list, checks, result)

        patch = None
        if result["chosen"] is not None:
            patch = results[result["chosen"]]["diff"]

        log("verdict", result["verdict"] + (" (fork " + str(result["chosen"]) + " chosen)" if result["chosen"] else ""))
        agent_db.update_task(task_id, {
            "status": "done",
            "verdict": result["verdict"],
            "chosen_fork": result["chosen"],
            "summary": explanation["summary"],
            "question": explanation["question"],
            "patch": patch,
            "finished_at": datetime.now()
        })
    except Exception as e:
        log("error", str(e))
        agent_db.update_task(task_id, {"status": "failed", "error": str(e)[:2000], "finished_at": datetime.now()})
    finally:
        for n in range(1, forks + 1):
            sandbox.stop_sandbox(box_name(task_id, n))
        shutil.rmtree(folder, ignore_errors=True)
