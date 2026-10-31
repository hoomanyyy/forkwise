# Sandboxes for the Forkwise Agent.
# Every fork works inside its own Docker container. The agent can only touch
# files inside that container, never the server itself.
#
# Safety limits on every container:
#   - its own user (not root), no extra Linux permissions
#   - limited memory, CPU and number of processes
#   - internet only while the setup command installs packages, then it is cut
#   - every command has a time limit

import os
import shlex
import shutil
import subprocess
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

IMAGE = os.getenv("SANDBOX_IMAGE", "forkwise-sandbox")
MEMORY = os.getenv("SANDBOX_MEMORY", "2g")
CPUS = os.getenv("SANDBOX_CPUS", "1")
PIDS = os.getenv("SANDBOX_PIDS", "256")
RUNTIME = os.getenv("SANDBOX_RUNTIME", "")          # for example "runsc" if gVisor is installed
INTERNET = os.getenv("SANDBOX_INTERNET", "setup")   # setup, always or never
WORK_DIR = os.getenv("AGENT_WORK_DIR", "/tmp/forkwise-agent")
ALLOWED_GIT_HOSTS = os.getenv("ALLOWED_GIT_HOSTS", "github.com,gitlab.com,bitbucket.org").split(",")
MAX_REPO_MB = int(os.getenv("MAX_REPO_MB", "200"))
MAX_OUTPUT = 12000

JUNK = ["__pycache__", ".pyc", ".pytest_cache", "node_modules", ".mypy_cache"]


def docker(args, input_text=None, timeout=120):
    try:
        result = subprocess.run(["docker"] + args, input=input_text, capture_output=True, text=True, timeout=timeout)
        return {"code": result.returncode, "output": result.stdout + result.stderr}
    except subprocess.TimeoutExpired:
        return {"code": 124, "output": "docker command timed out"}
    except Exception as e:
        return {"code": 1, "output": str(e)}


def short(text, limit=MAX_OUTPUT):
    # Keep the start and the end of long outputs, the middle is usually less useful.
    if len(text) <= limit:
        return text
    half = limit // 2
    return text[:half] + "\n\n... [" + str(len(text) - limit) + " characters cut] ...\n\n" + text[-half:]


def check_repo_url(url):
    parsed = urlparse(url)
    if parsed.scheme != "https":
        return "Only https links are allowed, for example https://github.com/user/project"
    if parsed.hostname not in ALLOWED_GIT_HOSTS:
        return "Only these hosts are allowed: " + ", ".join(ALLOWED_GIT_HOSTS)
    if parsed.username or parsed.password:
        return "Do not put a password or token in the link."
    return None


def folder_size_mb(folder):
    total = 0
    for root, dirs, files in os.walk(folder):
        for name in files:
            path = os.path.join(root, name)
            if not os.path.islink(path):
                total += os.path.getsize(path)
    return total / (1024 * 1024)


def clone_repo(url, branch, folder):
    problem = check_repo_url(url)
    if problem:
        return problem

    if os.path.exists(folder):
        shutil.rmtree(folder)
    os.makedirs(os.path.dirname(folder), exist_ok=True)

    command = ["git", "clone", "--depth", "1", "--single-branch"]
    if branch:
        command += ["--branch", branch]
    command += [url, folder]

    env = dict(os.environ)
    env["GIT_TERMINAL_PROMPT"] = "0"      # never wait for a password
    env["GIT_ALLOW_PROTOCOL"] = "https"
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=180, env=env)
    except subprocess.TimeoutExpired:
        return "Cloning took too long."
    if result.returncode != 0:
        return "Could not clone the repository. Is it public and is the branch name right?\n" + short(result.stderr, 1500)

    size = folder_size_mb(folder)
    if size > MAX_REPO_MB:
        return "The repository is " + str(round(size)) + " MB. The limit is " + str(MAX_REPO_MB) + " MB."
    return None


def start_sandbox(name):
    docker(["rm", "-f", name])
    args = ["run", "-d", "--name", name,
            "--user", "agent",
            "--workdir", "/workspace",
            "--memory", MEMORY, "--memory-swap", MEMORY,
            "--cpus", CPUS,
            "--pids-limit", PIDS,
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges",
            "--env", "HOME=/home/agent",
            "--env", "PIP_DISABLE_PIP_VERSION_CHECK=1",
            "--label", "forkwise-agent=1"]
    if RUNTIME:
        args += ["--runtime", RUNTIME]
    if INTERNET == "never":
        args += ["--network", "none"]
    args += [IMAGE, "sleep", "infinity"]

    result = docker(args)
    if result["code"] != 0:
        return "Could not start the sandbox: " + short(result["output"], 1500)
    return None


def copy_repo_in(name, folder):
    # Pack the folder with tar and unpack it inside the container as the agent user,
    # so the agent owns its files.
    try:
        tar = subprocess.run(["tar", "-C", folder, "-c", "."], capture_output=True, timeout=120)
        result = subprocess.run(["docker", "exec", "-i", name, "tar", "-x", "-C", "/workspace"],
                                input=tar.stdout, capture_output=True, timeout=120)
        if result.returncode != 0:
            return "Could not copy the code into the sandbox: " + result.stderr.decode(errors="ignore")[:1500]
    except Exception as e:
        return "Could not copy the code into the sandbox: " + str(e)
    return None


def run(name, command, timeout=120, limit=MAX_OUTPUT):
    # "timeout" runs inside the container, so a long command is really stopped.
    wrapped = "timeout -k 5 " + str(int(timeout)) + " bash -c " + shlex.quote(command)
    result = docker(["exec", name, "bash", "-c", wrapped], timeout=timeout + 30)
    output = result["output"]
    if result["code"] == 124:
        output += "\n[stopped: the command took longer than " + str(int(timeout)) + " seconds]"
    return {"code": result["code"], "output": short(output, limit)}


def read_text(name, path):
    result = docker(["exec", name, "cat", "--", path], timeout=60)
    if result["code"] != 0:
        return None
    return result["output"]


def write_text(name, path, content):
    script = 'mkdir -p "$(dirname "$1")" && cat > "$1"'
    result = docker(["exec", "-i", name, "bash", "-c", script, "_", path], input_text=content, timeout=60)
    if result["code"] != 0:
        return "Could not write " + path + ": " + short(result["output"], 500)
    return None


def cut_internet(name):
    if INTERNET != "setup":
        return
    docker(["network", "disconnect", "bridge", name])


def save_point(name, message):
    # A git commit inside the sandbox, used as a point we can compare with or go back to.
    command = "git add -A && git -c user.name=forkwise -c user.email=agent@forkwiseai.com commit -q --allow-empty --no-verify -m " + shlex.quote(message)
    return run(name, command, timeout=120)


def get_diff(name):
    excludes = " ".join(["':(exclude)*" + j + "*'" for j in JUNK])
    result = run(name, "git add -A 2>/dev/null && git diff --cached HEAD -- . " + excludes, timeout=120, limit=3000000)
    return result["output"]


def changed_files(name):
    excludes = " ".join(["':(exclude)*" + j + "*'" for j in JUNK])
    result = run(name, "git add -A 2>/dev/null && git diff --cached --name-only --diff-filter=AM HEAD -- . " + excludes, timeout=60)
    files = []
    for line in result["output"].splitlines():
        line = line.strip()
        if line:
            files.append(line)
    return files


def go_back(name):
    # Throw away everything since the last save point (node_modules is kept).
    return run(name, "git reset -q --hard && git clean -fdq -e node_modules", timeout=120)


def stop_sandbox(name):
    docker(["rm", "-f", name], timeout=60)
