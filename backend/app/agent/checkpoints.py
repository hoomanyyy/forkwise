import asyncio
from app import config
from app.agent import sandbox

EXCLUDES = [
    "node_modules/", ".venv/", "venv/", "__pycache__/", ".next/", ".cache/", "dist/", "build/",
    ".forkwise/logs/", ".forkwise/shots/", "*.pyc", ".git/",
]
LOCKS = {}


def git_dir(wid):
    return config.CHECKPOINTS_DIR / (wid + ".git")


def lock_for(wid):
    if wid not in LOCKS:
        LOCKS[wid] = asyncio.Lock()
    return LOCKS[wid]


async def git(wid, args, timeout=120):
    argv = ["git", "--git-dir", str(git_dir(wid)), "--work-tree", str(sandbox.host_root(wid))] + args
    return await sandbox.run_process(argv, timeout=timeout)


async def prepare(wid):
    folder = git_dir(wid)
    if (folder / "HEAD").exists():
        return
    folder.parent.mkdir(parents=True, exist_ok=True)
    await sandbox.run_process(["git", "init", "--bare", "-q", str(folder)], timeout=30)
    info = folder / "info"
    info.mkdir(exist_ok=True)
    (info / "exclude").write_text("\n".join(EXCLUDES) + "\n", encoding="utf-8")
    await git(wid, ["config", "user.email", "agent@forkwise"])
    await git(wid, ["config", "user.name", "Forkwise"])
    await git(wid, ["config", "core.bare", "false"])


async def snapshot(wid, label):
    async with lock_for(wid):
        await prepare(wid)
        await git(wid, ["add", "-A"], timeout=180)
        await git(wid, ["commit", "-q", "--allow-empty", "-m", label[:200]], timeout=60)
        head = await git(wid, ["rev-parse", "HEAD"])
        if head["code"] != 0:
            return ""
        return head["output"].strip()


async def restore(wid, commit):
    async with lock_for(wid):
        await prepare(wid)
        check = await git(wid, ["cat-file", "-t", commit])
        if check["code"] != 0:
            return False
        await git(wid, ["add", "-A"], timeout=180)
        await git(wid, ["commit", "-q", "--allow-empty", "-m", "before restore"], timeout=60)
        await git(wid, ["read-tree", "-u", "--reset", commit], timeout=120)
        await git(wid, ["clean", "-fdq"], timeout=120)
        await git(wid, ["commit", "-q", "--allow-empty", "-m", "restored " + commit[:10]], timeout=60)
        return True


async def changed_files(wid, commit):
    await prepare(wid)
    await git(wid, ["add", "-A"], timeout=180)
    result = await git(wid, ["diff", "--cached", "--name-status", commit])
    files = []
    if result["code"] != 0:
        return files
    for line in result["output"].splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            files.append({"status": parts[0][0], "path": parts[-1]})
    return files


async def file_at(wid, commit, path):
    result = await git(wid, ["show", commit + ":" + path])
    if result["code"] != 0:
        return None
    return result["output"]


async def diff_text(wid, commit, limit=200000):
    await prepare(wid)
    await git(wid, ["add", "-A"], timeout=180)
    result = await git(wid, ["diff", "--cached", "--stat", "--patch", commit])
    text = result["output"]
    if len(text) > limit:
        text = text[:limit] + "\n[diff cut]"
    return text
