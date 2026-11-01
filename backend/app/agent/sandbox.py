import asyncio
import json
import os
import shlex
import shutil
import subprocess
import time
from pathlib import Path
from app import config

LAST_USED = {}
STARTING = {}
SKIP_DIRS = ["node_modules", ".git", "__pycache__", ".venv", "venv", ".next", "dist", "build", ".cache", ".forkwise"]


def is_docker():
    return config.SANDBOX == "docker"


def box_name(wid):
    return "fw-" + wid


def host_root(wid):
    folder = config.WORKSPACES_DIR / wid
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def root_label(wid):
    if is_docker():
        return "/workspace"
    return str(host_root(wid))


def resolve(wid, path):
    root = host_root(wid).resolve()
    text = str(path or "").strip()
    label = root_label(wid)
    if text == "" or text == "." or text == label:
        return root
    if text.startswith(label + "/"):
        text = text[len(label) + 1:]
    elif text.startswith("/workspace/"):
        text = text[len("/workspace/"):]
    elif text == "/workspace":
        return root
    elif text.startswith("~/"):
        text = text[2:]
    target = (root / text).resolve()
    if target != root and root not in target.parents:
        raise ValueError("The path " + str(path) + " is outside the project folder.")
    return target


def relative(wid, target):
    root = host_root(wid).resolve()
    try:
        return str(Path(target).resolve().relative_to(root))
    except ValueError:
        return str(target)


def touch(wid):
    LAST_USED[wid] = time.time()


async def run_process(argv, timeout=60, cwd=None, stdin_text=None):
    process = await asyncio.create_subprocess_exec(
        *argv,
        cwd=cwd,
        stdin=asyncio.subprocess.PIPE if stdin_text is not None else asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    data = b""
    try:
        if stdin_text is not None:
            data, ignored = await asyncio.wait_for(process.communicate(stdin_text.encode("utf-8")), timeout)
        else:
            data, ignored = await asyncio.wait_for(process.communicate(), timeout)
    except asyncio.TimeoutError:
        process.kill()
        return {"code": -1, "output": "Timed out after " + str(timeout) + " seconds."}
    return {"code": process.returncode, "output": data.decode("utf-8", "replace")}


async def box_running(wid):
    result = await run_process(["docker", "inspect", "-f", "{{.State.Running}}", box_name(wid)], timeout=20)
    return result["code"] == 0 and result["output"].strip() == "true"


async def ensure_network():
    result = await run_process(["docker", "network", "inspect", config.SANDBOX_NETWORK], timeout=20)
    if result["code"] != 0:
        await run_process([
            "docker", "network", "create", "--driver", "bridge",
            "--subnet", config.SANDBOX_SUBNET,
            "-o", "com.docker.network.bridge.name=fwbr0",
            "-o", "com.docker.network.bridge.enable_icc=false",
            config.SANDBOX_NETWORK,
        ], timeout=30)


async def start_box(wid):
    root = host_root(wid)
    name = box_name(wid)
    exists = await run_process(["docker", "inspect", name], timeout=20)
    if exists["code"] == 0:
        started = await run_process(["docker", "start", name], timeout=60)
        if started["code"] == 0:
            return
        await run_process(["docker", "rm", "-f", name], timeout=30)
    await ensure_network()
    argv = [
        "docker", "run", "-d", "--name", name, "--hostname", "forkwise",
        "--network", config.SANDBOX_NETWORK,
        "--memory", config.SANDBOX_MEMORY, "--cpus", config.SANDBOX_CPUS,
        "--pids-limit", config.SANDBOX_PIDS,
        "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
        "--user", str(os.getuid()) + ":" + str(os.getgid()),
        "-e", "HOME=/home/agent", "-e", "WORKSPACE=/workspace",
        "-v", str(root) + ":/workspace:z",
        "-v", str(config.TOOLS_DIR) + ":/opt/fwtools:ro,z",
        "-w", "/workspace",
        "--label", "forkwise=1",
    ]
    if config.SANDBOX_RUNTIME:
        argv = argv + ["--runtime", config.SANDBOX_RUNTIME]
    argv = argv + [config.SANDBOX_IMAGE, "sleep", "infinity"]
    result = await run_process(argv, timeout=120)
    if result["code"] != 0:
        raise RuntimeError("Could not start the sandbox: " + result["output"][-500:])


async def ensure(wid):
    touch(wid)
    host_root(wid)
    if not is_docker():
        return
    if await box_running(wid):
        return
    if wid in STARTING:
        await STARTING[wid].wait()
        return
    event = asyncio.Event()
    STARTING[wid] = event
    try:
        await start_box(wid)
    finally:
        event.set()
        STARTING.pop(wid, None)


def shell_argv(wid, command, interactive=False):
    if is_docker():
        argv = ["docker", "exec", "-i"]
        if interactive:
            argv.append("-t")
        argv = argv + ["-w", "/workspace", box_name(wid), "bash", "-lc", command]
        return argv, None
    return ["bash", "-lc", command], str(host_root(wid))


async def run(wid, command, timeout=120, on_output=None, limit=30000):
    await ensure(wid)
    argv, cwd = shell_argv(wid, command)
    env = None
    if not is_docker():
        env = dict(os.environ)
        env["WORKSPACE"] = str(host_root(wid))
    process = await asyncio.create_subprocess_exec(
        *argv, cwd=cwd, env=env,
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        start_new_session=True,
    )
    chunks = []
    size = 0
    timed_out = False
    started = time.time()
    while True:
        left = timeout - (time.time() - started)
        if left <= 0:
            timed_out = True
            break
        try:
            data = await asyncio.wait_for(process.stdout.read(4096), left)
        except asyncio.TimeoutError:
            timed_out = True
            break
        if not data:
            break
        piece = data.decode("utf-8", "replace")
        size = size + len(piece)
        chunks.append(piece)
        if on_output is not None:
            await on_output(piece)
    if timed_out:
        try:
            os.killpg(process.pid, 9)
        except OSError:
            process.kill()
        if is_docker():
            await run_process(["docker", "exec", box_name(wid), "bash", "-lc", "pkill -f " + shlex.quote(command[:60]) + " || true"], timeout=15)
    try:
        code = await asyncio.wait_for(process.wait(), 10)
    except asyncio.TimeoutError:
        code = -1
    touch(wid)
    output = "".join(chunks)
    if len(output) > limit:
        half = limit // 2
        output = output[:half] + "\n\n[... " + str(len(output) - limit) + " characters cut ...]\n\n" + output[-half:]
    if timed_out:
        output = output + "\n[stopped: the command ran longer than " + str(timeout) + " seconds. Use run_in_background for servers and long jobs.]"
        code = -1
    return {"code": code, "output": output}


def logs_dir(wid):
    folder = host_root(wid) / ".forkwise" / "logs"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def jobs_file(wid):
    return host_root(wid) / ".forkwise" / "jobs.json"


def read_jobs(wid):
    path = jobs_file(wid)
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except ValueError:
        return []


def write_jobs(wid, jobs):
    logs_dir(wid)
    jobs_file(wid).write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")


async def start_background(wid, command, name=""):
    logs_dir(wid)
    job_id = "job" + str(int(time.time() * 1000) % 100000000)
    log = ".forkwise/logs/" + job_id + ".log"
    script = "nohup setsid bash -lc " + shlex.quote(command) + " > " + log + " 2>&1 < /dev/null & echo $!"
    result = await run(wid, script, timeout=30)
    pid = result["output"].strip().split("\n")[-1].strip()
    jobs = read_jobs(wid)
    jobs.append({"id": job_id, "pid": pid, "command": command, "name": name, "log": log, "started": time.time()})
    write_jobs(wid, jobs)
    return {"id": job_id, "pid": pid, "log": log}


async def job_alive(wid, job):
    result = await run(wid, "kill -0 " + str(job["pid"]) + " 2>/dev/null && echo alive || echo dead", timeout=15)
    return "alive" in result["output"]


async def job_output(wid, job_id, tail=6000):
    jobs = read_jobs(wid)
    for job in jobs:
        if job["id"] == job_id:
            path = host_root(wid) / job["log"]
            text = ""
            if path.exists():
                text = path.read_text(encoding="utf-8", errors="replace")
            if len(text) > tail:
                text = "[... earlier output cut ...]\n" + text[-tail:]
            alive = await job_alive(wid, job)
            return {"found": True, "alive": alive, "output": text, "job": job}
    return {"found": False}


async def kill_job(wid, job_id):
    jobs = read_jobs(wid)
    kept = []
    found = False
    for job in jobs:
        if job["id"] == job_id or job["pid"] == str(job_id):
            found = True
            await run(wid, "kill -TERM -- -" + str(job["pid"]) + " 2>/dev/null; kill -TERM " + str(job["pid"]) + " 2>/dev/null; true", timeout=15)
        else:
            kept.append(job)
    write_jobs(wid, kept)
    return found


async def box_address(wid):
    if not is_docker():
        return "127.0.0.1"
    result = await run_process(["docker", "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}", box_name(wid)], timeout=20)
    parts = result["output"].strip().split()
    if len(parts) == 0:
        return ""
    return parts[0]


async def stop(wid):
    if is_docker():
        await run_process(["docker", "stop", "-t", "3", box_name(wid)], timeout=30)
    LAST_USED.pop(wid, None)


async def remove(wid):
    if is_docker():
        await run_process(["docker", "rm", "-f", box_name(wid)], timeout=30)
    folder = config.WORKSPACES_DIR / wid
    if folder.exists():
        shutil.rmtree(folder, ignore_errors=True)


async def reaper():
    while True:
        await asyncio.sleep(60)
        limit = config.SANDBOX_IDLE_MINUTES * 60
        for wid in list(LAST_USED.keys()):
            if time.time() - LAST_USED.get(wid, 0) > limit:
                try:
                    await stop(wid)
                except Exception:
                    pass


def tree(wid, max_items=3000):
    root = host_root(wid).resolve()
    items = []
    walk(root, root, items, max_items, 0)
    return items


def walk(root, folder, items, max_items, depth):
    if len(items) >= max_items or depth > 12:
        return
    try:
        entries = sorted(os.scandir(folder), key=sort_key)
    except OSError:
        return
    for entry in entries:
        if len(items) >= max_items:
            return
        rel = str(Path(entry.path).relative_to(root))
        if entry.is_dir(follow_symlinks=False):
            skipped = entry.name in SKIP_DIRS
            items.append({"path": rel, "type": "dir", "skipped": skipped})
            if not skipped:
                walk(root, entry.path, items, max_items, depth + 1)
        else:
            try:
                size = entry.stat(follow_symlinks=False).st_size
            except OSError:
                size = 0
            items.append({"path": rel, "type": "file", "size": size})


def sort_key(entry):
    if entry.is_dir(follow_symlinks=False):
        return "0" + entry.name.lower()
    return "1" + entry.name.lower()


def docker_ready():
    if not is_docker():
        return True
    try:
        result = subprocess.run(["docker", "image", "inspect", config.SANDBOX_IMAGE], capture_output=True, timeout=20)
        return result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False
