/* The editor workbench on this computer: browse, read, edit and search the
   files of an open folder, watch it for changes and compare with git. Every
   path is checked to stay inside the folder it belongs to. */
const fs = require("fs")
const os = require("os")
const path = require("path")
const { execFile } = require("child_process")

const SKIP = ["node_modules", ".git", ".hg", ".svn", "dist", "build", "out", ".next", ".nuxt", ".cache", "__pycache__", ".venv", "venv", ".idea", "coverage", "target", ".turbo", ".gradle", "Pods"]
const TEXT_LIMIT = 5 * 1024 * 1024
const IMAGE_LIMIT = 10 * 1024 * 1024
const IMAGES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".bmp": "image/bmp" }

// A folder can be opened unless it is the root of a drive.
function checkRoot(root) {
  const full = path.resolve(String(root || ""))
  if (!root || full === path.parse(full).root) throw new Error("Pick a project folder, not the whole drive.")
  const info = fs.statSync(full)
  if (!info.isDirectory()) throw new Error("That is not a folder.")
  return full
}

// Joins a path inside the folder and refuses anything that leaves it.
function inside(root, rel) {
  const base = checkRoot(root)
  const full = path.resolve(base, String(rel || "."))
  const relative = path.relative(base, full)
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("That path is outside the folder.")
  return full
}

function toRel(root, full) {
  return path.relative(root, full).split(path.sep).join("/")
}

async function list(root, rel) {
  const folder = inside(root, rel)
  const entries = await fs.promises.readdir(folder, { withFileTypes: true })
  const result = []
  for (let index = 0; index < entries.length && index < 5000; index += 1) {
    const entry = entries[index]
    if (entry.name === ".git" || entry.name === ".DS_Store") continue
    let dir = entry.isDirectory()
    if (entry.isSymbolicLink()) {
      try {
        dir = fs.statSync(path.join(folder, entry.name)).isDirectory()
      } catch (problem) {
        dir = false
      }
    }
    result.push({ name: entry.name, path: toRel(checkRoot(root), path.join(folder, entry.name)), dir: dir, heavy: dir && SKIP.indexOf(entry.name) >= 0 })
  }
  result.sort(function (a, b) {
    if (a.dir !== b.dir) return a.dir ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
  })
  return { entries: result }
}

function looksBinary(buffer) {
  const length = Math.min(buffer.length, 8000)
  for (let index = 0; index < length; index += 1) {
    if (buffer[index] === 0) return true
  }
  return false
}

async function read(root, rel) {
  const full = inside(root, rel)
  const info = await fs.promises.stat(full)
  const ext = path.extname(full).toLowerCase()
  if (IMAGES[ext]) {
    if (info.size > IMAGE_LIMIT) return { kind: "large", size: info.size }
    const data = await fs.promises.readFile(full)
    return { kind: "image", size: info.size, url: "data:" + IMAGES[ext] + ";base64," + data.toString("base64"), mtime: info.mtimeMs }
  }
  if (info.size > TEXT_LIMIT) return { kind: "large", size: info.size }
  const data = await fs.promises.readFile(full)
  if (looksBinary(data)) return { kind: "binary", size: info.size }
  let text = data.toString("utf8")
  const crlf = text.indexOf("\r\n") >= 0
  return { kind: "text", text: text, size: info.size, mtime: info.mtimeMs, eol: crlf ? "crlf" : "lf" }
}

async function write(root, rel, text) {
  const full = inside(root, rel)
  await fs.promises.mkdir(path.dirname(full), { recursive: true })
  await fs.promises.writeFile(full, String(text == null ? "" : text), "utf8")
  const info = await fs.promises.stat(full)
  return { ok: true, mtime: info.mtimeMs, size: info.size }
}

async function create(root, rel, isDir) {
  const full = inside(root, rel)
  if (fs.existsSync(full)) throw new Error("Something with that name is already there.")
  if (isDir) await fs.promises.mkdir(full, { recursive: true })
  else {
    await fs.promises.mkdir(path.dirname(full), { recursive: true })
    await fs.promises.writeFile(full, "", "utf8")
  }
  return { ok: true, path: toRel(checkRoot(root), full) }
}

async function rename(root, from, to) {
  const source = inside(root, from)
  const target = inside(root, to)
  if (fs.existsSync(target)) throw new Error("Something with that name is already there.")
  await fs.promises.mkdir(path.dirname(target), { recursive: true })
  await fs.promises.rename(source, target)
  return { ok: true, path: toRel(checkRoot(root), target) }
}

// Deleting moves to the Recycle Bin / Trash, so a mistake can be undone.
async function remove(root, rel, shell) {
  const full = inside(root, rel)
  if (full === checkRoot(root)) throw new Error("The project folder itself cannot be deleted here.")
  await shell.trashItem(full)
  return { ok: true }
}

// Every file path in the folder, for quick open and @ mentions.
async function files(root) {
  const base = checkRoot(root)
  const found = []
  async function walk(folder, depth) {
    if (found.length >= 20000 || depth > 14) return
    let entries = []
    try {
      entries = await fs.promises.readdir(folder, { withFileTypes: true })
    } catch (problem) {
      return
    }
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      if (entry.isDirectory()) {
        if (SKIP.indexOf(entry.name) >= 0) continue
        await walk(path.join(folder, entry.name), depth + 1)
      } else if (entry.isFile()) {
        found.push(toRel(base, path.join(folder, entry.name)))
        if (found.length >= 20000) return
      }
    }
  }
  await walk(base, 0)
  return { files: found, cut: found.length >= 20000 }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function globTest(glob) {
  const parts = String(glob || "").split(",").map(function (item) {
    return item.trim()
  }).filter(Boolean)
  if (!parts.length) return null
  const tests = parts.map(function (item) {
    const pattern = "^" + item.split("*").map(escapeRegExp).join(".*") + "$"
    return new RegExp(pattern, "i")
  })
  return function (rel) {
    const name = rel.split("/").pop()
    return tests.some(function (test) {
      return test.test(name) || test.test(rel)
    })
  }
}

// Text search across the folder, like Ctrl+Shift+F.
async function search(root, options) {
  const settings = options || {}
  const query = String(settings.query || "")
  if (!query) return { results: [], count: 0 }
  let matcher = null
  try {
    matcher = new RegExp(settings.regex ? query : escapeRegExp(query), settings.caseSensitive ? "g" : "gi")
  } catch (problem) {
    throw new Error("That search pattern is not valid: " + problem.message)
  }
  const include = globTest(settings.include)
  const listing = await files(root)
  const base = checkRoot(root)
  const results = []
  let count = 0
  for (let index = 0; index < listing.files.length; index += 1) {
    const rel = listing.files[index]
    if (include && !include(rel)) continue
    const full = path.join(base, rel)
    let data = null
    try {
      const info = await fs.promises.stat(full)
      if (info.size > 1024 * 1024) continue
      data = await fs.promises.readFile(full)
    } catch (problem) {
      continue
    }
    if (looksBinary(data)) continue
    const lines = data.toString("utf8").split(/\r?\n/)
    const hits = []
    for (let line = 0; line < lines.length; line += 1) {
      matcher.lastIndex = 0
      const found = matcher.exec(lines[line])
      if (found) {
        hits.push({ line: line + 1, col: found.index + 1, length: found[0].length || 1, text: lines[line].slice(0, 400) })
        count += 1
        if (hits.length >= 100 || count >= 3000) break
      }
    }
    if (hits.length) results.push({ path: rel, hits: hits })
    if (count >= 3000) break
  }
  return { results: results, count: count, cut: count >= 3000 }
}

// Replace every match in the files that a search found.
async function replaceAll(root, options) {
  const settings = options || {}
  const found = await search(root, settings)
  let matcher = new RegExp(settings.regex ? settings.query : escapeRegExp(settings.query), settings.caseSensitive ? "g" : "gi")
  let changed = 0
  for (let index = 0; index < found.results.length; index += 1) {
    const full = inside(root, found.results[index].path)
    const text = await fs.promises.readFile(full, "utf8")
    const next = text.replace(matcher, String(settings.replace || ""))
    if (next !== text) {
      await fs.promises.writeFile(full, next, "utf8")
      changed += 1
    }
  }
  return { ok: true, files: changed }
}

function git(cwd, args) {
  return new Promise(function (resolve) {
    execFile("git", args, { cwd: cwd, windowsHide: true, maxBuffer: 20 * 1024 * 1024, timeout: 15000 }, function (error, stdout, stderr) {
      resolve({ ok: !error, out: String(stdout || ""), err: String(stderr || (error && error.message) || "") })
    })
  })
}

// The file as git last saw it, for the diff view.
async function original(root, rel) {
  const base = checkRoot(root)
  inside(root, rel)
  const top = await git(base, ["rev-parse", "--show-toplevel"])
  if (!top.ok) return { ok: false, text: "", reason: "not a git folder" }
  const repo = top.out.trim()
  const inRepo = path.relative(repo, path.join(base, rel)).split(path.sep).join("/")
  const shown = await git(repo, ["show", "HEAD:" + inRepo])
  if (!shown.ok) return { ok: true, text: "", isNew: true }
  return { ok: true, text: shown.out }
}

async function branch(root) {
  const base = checkRoot(root)
  const name = await git(base, ["rev-parse", "--abbrev-ref", "HEAD"])
  if (!name.ok) return { branch: "" }
  const dirty = await git(base, ["status", "--porcelain"])
  return { branch: name.out.trim(), changes: dirty.ok ? dirty.out.split("\n").filter(Boolean).length : 0 }
}

// Throw away the changes to one file (back to the last commit).
async function revert(root, rel, shell) {
  const base = checkRoot(root)
  const full = inside(root, rel)
  const known = await git(base, ["ls-files", "--error-unmatch", "--", full])
  if (!known.ok) {
    if (fs.existsSync(full)) await shell.trashItem(full)
    return { ok: true, removed: true }
  }
  const back = await git(base, ["checkout", "HEAD", "--", full])
  if (!back.ok) throw new Error(back.err.trim() || "git could not restore the file")
  return { ok: true }
}

// Watches open folders and reports changed files (debounced per folder).
function createWatcher(onChange) {
  const watchers = {}
  function watch(root) {
    const base = checkRoot(root)
    if (watchers[base]) return { ok: true }
    let pending = {}
    let timer = null
    function flush() {
      timer = null
      const paths = Object.keys(pending)
      pending = {}
      if (paths.length) onChange({ root: base, paths: paths })
    }
    try {
      const handle = fs.watch(base, { recursive: true }, function (event, name) {
        if (!name) return
        const rel = String(name).split(path.sep).join("/")
        const first = rel.split("/")[0]
        if (SKIP.indexOf(first) >= 0 && first !== "dist" && first !== "build") return
        if (rel.indexOf(".git/") === 0) return
        pending[rel] = true
        if (!timer) timer = setTimeout(flush, 250)
      })
      handle.on("error", function () {
        unwatch(base)
      })
      watchers[base] = handle
    } catch (problem) {
      return { ok: false, reason: problem.message }
    }
    return { ok: true }
  }
  function unwatch(root) {
    const base = path.resolve(String(root || ""))
    if (!watchers[base]) return
    try {
      watchers[base].close()
    } catch (problem) {}
    delete watchers[base]
  }
  function closeAll() {
    Object.keys(watchers).forEach(unwatch)
  }
  return { watch: watch, unwatch: unwatch, closeAll: closeAll }
}

function home() {
  return os.homedir()
}

// New files are shown as added, without touching the git index.
async function untrackedDiff(repo) {
  const listed = await git(repo, ["ls-files", "--others", "--exclude-standard"])
  let text = ""
  const files = listed.out.split("\n").filter(Boolean).slice(0, 200)
  for (let index = 0; index < files.length; index += 1) {
    const full = path.join(repo, files[index])
    try {
      const info = await fs.promises.stat(full)
      if (info.size > 200000) {
        text += "diff --git a/" + files[index] + " b/" + files[index] + "\nnew file (too big to show, " + info.size + " bytes)\n"
        continue
      }
      const data = await fs.promises.readFile(full)
      if (looksBinary(data)) {
        text += "diff --git a/" + files[index] + " b/" + files[index] + "\nnew binary file\n"
        continue
      }
      const lines = data.toString("utf8").split("\n")
      text += "diff --git a/" + files[index] + " b/" + files[index] + "\nnew file mode 100644\n--- /dev/null\n+++ b/" + files[index] + "\n@@ -0,0 +1," + lines.length + " @@\n" + lines.map(function (line) { return "+" + line }).join("\n") + "\n"
    } catch (problem) {}
  }
  return { text: text, files: files }
}

// Everything uncommitted in the folder's repository, for a review.
async function fullDiff(folder) {
  const base = checkRoot(folder)
  const top = await git(base, ["rev-parse", "--show-toplevel"])
  if (!top.ok) return { ok: false, text: "", reason: "This folder is not a git repository." }
  const repo = top.out.trim()
  const shown = await git(repo, ["diff", "--no-color", "HEAD"])
  const names = await git(repo, ["diff", "--name-status", "HEAD"])
  const added = await untrackedDiff(repo)
  const files = names.out.split("\n").filter(Boolean).concat(added.files.map(function (file) { return "A\t" + file }))
  return { ok: true, text: shown.out + added.text, files: files, repo: repo }
}

module.exports = {
  fullDiff,
  untrackedDiff, list, read, write, create, rename, remove, files, search, replaceAll, original, branch, revert, createWatcher, inside, home }
