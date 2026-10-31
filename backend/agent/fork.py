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


def style_of(fork_no):
    return STYLES[(fork_no - 1) % len(STYLES)]


def prepare_fork(task, fork_no, folder):
    task_id = task["id"]
    box = box_name(task_id, fork_no)

    problem = sandbox.start_sandbox(box)
    if problem is None:
        problem = sandbox.copy_repo_in(box, folder)
    if problem:
        agent_db.add_event(task_id, fork_no, "error", problem)
        return problem

    if task.get("setup_command"):
        agent_db.add_event(task_id, fork_no, "tool", "$ " + task["setup_command"] + "   (setup, internet on)")
        result = sandbox.run(box, task["setup_command"], timeout=600)
        if result["code"] != 0:
            agent_db.add_event(task_id, fork_no, "error", "The setup command failed:\n" + result["output"][-2000:])
            return "setup failed"

    sandbox.cut_internet(box)
    sandbox.save_point(box, "forkwise start")
    return None


def prepare_into(task, fork_no, folder, problems):
    problems[fork_no] = prepare_fork(task, fork_no, folder)


def work_on_fork(task, fork_no, test_command, results):
    task_id = task["id"]
    box = box_name(task_id, fork_no)
    agent_db.update_fork(task_id, fork_no, {"status": "working"})

    try:
        answer = run_agent(box, task["task"], style_of(fork_no), test_command, task_id, fork_no)

        tests = {"ok": False, "output": "No test command was found."}
        if test_command:
            agent_db.add_event(task_id, fork_no, "tool", "$ " + test_command + "   (final check)")
            tests = verify.run_tests(box, test_command)
            if tests["ok"]:
                agent_db.add_event(task_id, fork_no, "info", "Tests passed")
            else:
                agent_db.add_event(task_id, fork_no, "info", "Tests failed")

        diff = sandbox.get_diff(box)
        test_files = []
        for path in sandbox.changed_files(box):
            if verify.is_test_file(path):
                test_files.append(path)
        sandbox.save_point(box, "forkwise fork " + str(fork_no))

        if diff.strip() == "":
            tests["ok"] = False
            agent_db.add_event(task_id, fork_no, "error", "This fork did not change any file.")

        results[fork_no] = {
            "fork_no": fork_no,
            "tests_ok": tests["ok"],
            "diff": diff,
            "summary": answer["summary"],
            "test_files": test_files
        }

        status = "failed"
        if answer["ok"]:
            status = "done"
        tests_number = 0
        if tests["ok"]:
            tests_number = 1
        agent_db.update_fork(task_id, fork_no, {
            "status": status,
            "summary": answer["summary"],
            "diff": diff,
            "tests_ok": tests_number,
            "test_output": tests["output"][-6000:],
            "steps": answer["steps"],
            "tokens": answer["tokens"]
        })
    except Exception as e:
        agent_db.add_event(task_id, fork_no, "error", "This fork crashed: " + str(e))
        agent_db.update_fork(task_id, fork_no, {"status": "failed", "summary": "Crashed: " + str(e)})
        results[fork_no] = {"fork_no": fork_no, "tests_ok": False, "diff": "", "summary": "", "test_files": []}


def cross_test(task, results, test_command):
    task_id = task["id"]
    checks = []
    good = []
    for fork_no in results:
        if results[fork_no]["tests_ok"]:
            good.append(results[fork_no])

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
            word = "FAILED"
            if check["passed"]:
                word = "passed"
            agent_db.add_event(task_id, 0, "info", "Tests of fork " + str(check["tests_from"]) + " on fork " + str(check["code_of"]) + ": " + word)
    return checks


def run_task(task):
    task_id = task["id"]
    forks = max(1, min(int(task["forks"] or 3), 5))
    folder = os.path.join(sandbox.WORK_DIR, "task-" + str(task_id))

    try:
        agent_db.add_event(task_id, 0, "info", "Cloning " + task["repo_url"])
        problem = sandbox.clone_repo(task["repo_url"], task.get("branch"), folder)
        if problem:
            raise Exception(problem)

        for n in range(1, forks + 1):
            agent_db.add_fork(task_id, n, style_of(n))

        agent_db.add_event(task_id, 0, "info", "Starting " + str(forks) + " sandboxes")
        problems = {}
        threads = []
        for n in range(1, forks + 1):
            t = threading.Thread(target=prepare_into, args=(task, n, folder, problems))
            t.start()
            threads.append(t)
        for t in threads:
            t.join()

        ready = []
        for n in range(1, forks + 1):
            if problems.get(n) is None:
                ready.append(n)
            else:
                agent_db.update_fork(task_id, n, {"status": "failed", "summary": "The sandbox could not be prepared."})
        if len(ready) == 0:
            raise Exception("No sandbox could be prepared. See the log.")

        test_command = task.get("test_command") or verify.detect_test_command(box_name(task_id, ready[0]))
        agent_db.add_event(task_id, 0, "info", "Test command: " + (test_command or "none found"))

        agent_db.add_event(task_id, 0, "info", "The forks are working")
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
            agent_db.add_event(task_id, 0, "info", "Cross testing the forks")
            checks = cross_test(task, results, test_command)

        forks_list = []
        for n in sorted(results):
            forks_list.append(results[n])
        result = verify.compute_verdict(forks_list, checks)
        explanation = verify.explain(task["task"], forks_list, checks, result)

        patch = None
        verdict_text = result["verdict"]
        if result["chosen"] is not None:
            patch = results[result["chosen"]]["diff"]
            verdict_text = verdict_text + " (fork " + str(result["chosen"]) + " chosen)"

        agent_db.add_event(task_id, 0, "verdict", verdict_text)
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
        agent_db.add_event(task_id, 0, "error", str(e))
        agent_db.update_task(task_id, {"status": "failed", "error": str(e)[:2000], "finished_at": datetime.now()})
    finally:
        for n in range(1, forks + 1):
            sandbox.stop_sandbox(box_name(task_id, n))
        shutil.rmtree(folder, ignore_errors=True)
