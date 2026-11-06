/* Isolated copies of a git project for agents (git worktrees). Each agent can
   work on its own branch in its own folder, so several agents never edit the
   same files at once. Its work is merged back with one click, or thrown away. */
const fs = require("fs")
const os = require("os")
const path = require("path")
const crypto = require("crypto")
const { execFile } = require("child_process")

function git(cwd, args, timeout) {
  return new Promise(function (resolve) {
    execFile("git", args, { cwd: cwd, windowsHide: true, maxBuffer: 30 * 1024 * 1024, timeout: timeout || 60000 }, function (error, stdout, stderr) {
      resolve({ ok: !error, out: String(stdout || ""), err: String(stderr || (error && error.message) || "").trim() })
    })
  })
}

async function repoTop(folder) {
  const top = await git(folder, ["rev-parse", "--show-toplevel"])
  if (!top.ok) throw new Error("This folder is not a git repository. Initialise git first (the agent can do it).")
  return path.resolve(top.out.trim())
}

function slug(text) {
  const clean = String(text || "task").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32)
  return clean || "task"
}

function home() {
  return path.join(os.homedir(), ".forkwise", "worktrees")
}

// A new worktree on a new branch, starting from the current commit.
async function create(folder, name) {
  const top = await repoTop(folder)
  const head = await git(top, ["rev-parse", "HEAD"])
  if (!head.ok) throw new Error("The repository has no commit yet. Make a first commit, then try again.")
  const short = crypto.randomBytes(3).toString("hex")
  const branch = "forkwise/" + slug(name) + "-" + short
  const repoName = path.basename(top)
  const hash = crypto.createHash("sha1").update(top).digest("hex").slice(0, 8)
  const target = path.join(home(), repoName + "-" + hash, slug(name) + "-" + short)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const added = await git(top, ["worktree", "add", "-b", branch, target, "HEAD"], 120000)
  if (!added.ok) throw new Error(added.err || "git could not create the worktree")
  // where the open folder sits inside the repository, so the agent starts in the same place
  const inner = path.relative(top, path.resolve(folder))
  const workFolder = inner && !inner.startsWith("..") ? path.join(target, inner) : target
  return { ok: true, path: target, folder: workFolder, branch: branch, repo: top, base: head.out.trim() }
}

async function list(folder) {
  const top = await repoTop(folder)
  const answer = await git(top, ["worktree", "list", "--porcelain"])
  const items = []
  let current = null
  answer.out.split("\n").forEach(function (line) {
    if (line.indexOf("worktree ") === 0) {
      current = { path: path.resolve(line.slice(9).trim()), branch: "", head: "" }
      items.push(current)
    } else if (current && line.indexOf("branch ") === 0) {
      current.branch = line.slice(7).trim().replace("refs/heads/", "")
    } else if (current && line.indexOf("HEAD ") === 0) {
      current.head = line.slice(5).trim()
    }
  })
  return { repo: top, worktrees: items.filter(function (item) { return item.path !== top }) }
}

// How much the agent changed: uncommitted files and commits ahead of the main branch.
async function status(worktreePath) {
  if (!fs.existsSync(worktreePath)) return { ok: false, gone: true }
  const changed = await git(worktreePath, ["status", "--porcelain"])
  const branch = await git(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"])
  const common = await git(worktreePath, ["rev-parse", "--path-format=absolute", "--git-common-dir"])
  let ahead = 0
  let stat = ""
  if (common.ok) {
    const repo = path.dirname(common.out.trim())
    const mainBranch = await git(repo, ["rev-parse", "--abbrev-ref", "HEAD"])
    if (mainBranch.ok) {
      const count = await git(worktreePath, ["rev-list", "--count", mainBranch.out.trim() + "..HEAD"])
      ahead = count.ok ? Number(count.out.trim()) || 0 : 0
      const diff = await git(worktreePath, ["diff", "--shortstat", mainBranch.out.trim()])
      stat = diff.ok ? diff.out.trim() : ""
    }
  }
  return { ok: true, changed: changed.ok ? changed.out.split("\n").filter(Boolean).length : 0, ahead: ahead, branch: branch.ok ? branch.out.trim() : "", stat: stat }
}

// The worktree's full change against the main branch, for review.
async function diff(worktreePath) {
  const common = await git(worktreePath, ["rev-parse", "--path-format=absolute", "--git-common-dir"])
  if (!common.ok) return { ok: false, text: "" }
  const repo = path.dirname(common.out.trim())
  const mainBranch = await git(repo, ["rev-parse", "--abbrev-ref", "HEAD"])
  const text = await git(worktreePath, ["diff", "--no-color", mainBranch.ok ? mainBranch.out.trim() : "HEAD"])
  const added = await require("./workbench").untrackedDiff(worktreePath)
  return { ok: text.ok, text: text.out + added.text }
}

// Commit what the agent left, then merge its branch into the main folder.
async function merge(worktreePath, message) {
  const common = await git(worktreePath, ["rev-parse", "--path-format=absolute", "--git-common-dir"])
  if (!common.ok) throw new Error("That worktree is gone.")
  const repo = path.dirname(common.out.trim())
  const branch = (await git(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"])).out.trim()
  const dirty = await git(worktreePath, ["status", "--porcelain"])
  if (dirty.out.trim()) {
    await git(worktreePath, ["add", "-A"])
    const committed = await git(worktreePath, ["-c", "user.name=Forkwise", "-c", "user.email=agent@forkwiseai.com", "commit", "-m", message || "Work from a Forkwise agent"])
    if (!committed.ok) throw new Error(committed.err || "Could not commit the agent's changes")
  }
  const mainDirty = await git(repo, ["status", "--porcelain", "--untracked-files=no"])
  if (mainDirty.out.trim()) throw new Error("The main folder has uncommitted changes. Commit or stash them first, then merge.")
  const merged = await git(repo, ["-c", "user.name=Forkwise", "-c", "user.email=agent@forkwiseai.com", "merge", "--no-ff", "--no-edit", "-m", "Merge " + branch + ": " + (message || "agent work"), branch], 120000)
  if (!merged.ok) {
    const conflicts = await git(repo, ["diff", "--name-only", "--diff-filter=U"])
    await git(repo, ["merge", "--abort"])
    const files = conflicts.out.split("\n").filter(Boolean)
    throw new Error(files.length ? "Merge conflict in " + files.slice(0, 6).join(", ") + ". Nothing was changed; ask the agent to rebase its branch, or merge by hand." : merged.err || "git could not merge")
  }
  return { ok: true, branch: branch, repo: repo }
}

async function remove(worktreePath, dropBranch) {
  const common = await git(worktreePath, ["rev-parse", "--path-format=absolute", "--git-common-dir"])
  let repo = ""
  let branch = ""
  if (common.ok) {
    repo = path.dirname(common.out.trim())
    branch = (await git(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"])).out.trim()
  }
  if (repo) {
    const removed = await git(repo, ["worktree", "remove", "--force", worktreePath])
    if (!removed.ok && fs.existsSync(worktreePath)) throw new Error(removed.err || "git could not remove the worktree")
    if (dropBranch && branch && branch !== "HEAD") await git(repo, ["branch", "-D", branch])
    await git(repo, ["worktree", "prune"])
  }
  return { ok: true }
}

module.exports = { create, list, status, diff, merge, remove, home }
