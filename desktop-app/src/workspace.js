const fs = require("fs")
const path = require("path")

const SKIP_DIRS = ["node_modules", ".git", "__pycache__", ".venv", "venv", ".next", "dist", "build", ".cache", ".forkwise", "target", ".gradle", ".idea", ".pytest_cache", ".turbo", "coverage"]
const IMAGE_TYPES = { ".png": "png", ".jpg": "jpeg", ".jpeg": "jpeg", ".gif": "gif", ".webp": "webp" }
const MAX_READ = 300000
const MAX_FULL = 3000000
const MAX_IMAGE = 4 * 1024 * 1024
const MAX_OLD = 1000000
const MAX_SEARCH_FILE = 2 * 1024 * 1024
const MAX_WALK = 20000

function fail(text) {
  return { ok: false, text: text }
}

function inside(base, full) {
  const rel = path.relative(base, full)
  if (rel === "") return true
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false
  return true
}

function nearestReal(full) {
  let current = full
  while (true) {
    try {
      return fs.realpathSync(current)
    } catch (problem) {
      const parent = path.dirname(current)
      if (parent === current) return current
      current = parent
    }
  }
}

function resolveIn(root, wanted) {
  const base = path.resolve(root)
  const full = path.resolve(base, String(wanted || "."))
  if (!inside(base, full)) throw new Error("This path is outside the project folder: " + wanted)
  let realBase = base
  try {
    realBase = fs.realpathSync(base)
  } catch (problem) {
    throw new Error("The project folder does not exist on this computer: " + base)
  }
  if (!inside(realBase, nearestReal(full))) throw new Error("This path leaves the project folder through a link: " + wanted)
  return { base: base, full: full, rel: path.relative(base, full).split(path.sep).join("/") || "." }
}

function guardWrite(where) {
  const first = where.rel.split("/")[0]
  if (first === ".git") throw new Error("Writing inside .git is not allowed. Use git commands instead.")
}

function normalize(text) {
  let clean = text
  if (clean.charCodeAt(0) === 0xfeff) clean = clean.slice(1)
  return clean.indexOf("\r\n") >= 0 ? clean.replace(/\r\n/g, "\n") : clean
}

function read(root, wanted, full) {
  const where = resolveIn(root, wanted)
  let info
  try {
    info = fs.statSync(where.full)
  } catch (problem) {
    return fail("File not found: " + where.rel)
  }
  if (info.isDirectory()) return fail(where.rel + " is a folder. Use list_dir.")
  const kind = IMAGE_TYPES[path.extname(where.full).toLowerCase()]
  if (kind) {
    if (info.size > MAX_IMAGE) return fail("Image " + where.rel + " is larger than 4 MB.")
    return { ok: true, text: "Image " + where.rel, image: fs.readFileSync(where.full).toString("base64"), data: { rel: where.rel, size: info.size, kind: kind } }
  }
  const limit = full ? MAX_FULL : MAX_READ
  if (full && info.size > MAX_FULL) return fail(where.rel + " is larger than 3 MB, so it cannot be edited as text.")
  const fd = fs.openSync(where.full, "r")
  const buffer = Buffer.alloc(Math.min(info.size, limit + 1))
  fs.readSync(fd, buffer, 0, buffer.length, 0)
  fs.closeSync(fd)
  if (buffer.slice(0, 4000).includes(0)) return fail(where.rel + " is a binary file of " + info.size + " bytes.")
  let text = buffer.slice(0, limit).toString("utf8")
  text = normalize(text)
  if (buffer.length > limit) text = text + "\n[cut at " + limit + " bytes]"
  return { ok: true, text: text, data: { rel: where.rel, size: info.size } }
}

function write(root, wanted, content) {
  const where = resolveIn(root, wanted)
  guardWrite(where)
  if (where.rel === ".") return fail("path is missing.")
  let existed = false
  let old = ""
  let crlf = false
  let bom = false
  try {
    const info = fs.statSync(where.full)
    if (info.isDirectory()) return fail(where.rel + " is a folder.")
    existed = true
    if (info.size <= MAX_OLD) {
      const raw = fs.readFileSync(where.full, "utf8")
      bom = raw.charCodeAt(0) === 0xfeff
      crlf = raw.indexOf("\r\n") >= 0
      old = normalize(raw)
    }
  } catch (problem) {}
  let text = String(content || "")
  if (crlf && text.indexOf("\r\n") === -1) text = text.replace(/\n/g, "\r\n")
  if (bom && text.charCodeAt(0) !== 0xfeff) text = "﻿" + text
  const data = Buffer.from(text, "utf8")
  if (data.length > 5000000) return fail("The content is larger than 5 MB.")
  fs.mkdirSync(path.dirname(where.full), { recursive: true })
  fs.writeFileSync(where.full, data)
  return { ok: true, text: "Wrote " + data.length + " bytes to " + where.rel, data: { rel: where.rel, existed: existed, old: old } }
}

function sortNames(a, b) {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}

function treeLines(folder, level, depth, lines) {
  if (level >= depth || lines.length > 1500) return
  let entries
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true })
  } catch (problem) {
    return
  }
  entries.sort(sortNames)
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const pad = "  ".repeat(level)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.indexOf(entry.name) >= 0) {
        lines.push(pad + entry.name + "/ (skipped)")
      } else {
        lines.push(pad + entry.name + "/")
        treeLines(path.join(folder, entry.name), level + 1, depth, lines)
      }
    } else {
      lines.push(pad + entry.name)
    }
  }
}

function list(root, wanted, depth) {
  const where = resolveIn(root, wanted)
  let info
  try {
    info = fs.statSync(where.full)
  } catch (problem) {
    return fail("Folder not found.")
  }
  if (!info.isDirectory()) return fail(where.rel + " is a file.")
  const lines = []
  let levels = parseInt(depth, 10)
  if (isNaN(levels) || levels < 1) levels = 3
  treeLines(where.full, 0, Math.min(levels, 8), lines)
  if (lines.length === 0) return { ok: true, text: "The folder is empty." }
  return { ok: true, text: lines.slice(0, 1500).join("\n") }
}

function walk(start, base) {
  const found = []
  let info
  try {
    info = fs.statSync(start)
  } catch (problem) {
    return found
  }
  if (info.isFile()) {
    found.push(start)
    return found
  }
  const stack = [start]
  while (stack.length > 0 && found.length <= MAX_WALK) {
    const folder = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(folder, { withFileTypes: true })
    } catch (problem) {
      continue
    }
    entries.sort(sortNames)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.isDirectory()) {
        if (SKIP_DIRS.indexOf(entry.name) === -1) stack.push(path.join(folder, entry.name))
      } else if (entry.isFile()) {
        found.push(path.join(folder, entry.name))
      }
    }
  }
  return found
}

function braces(pattern) {
  const open = pattern.indexOf("{")
  const close = pattern.indexOf("}", open)
  if (open === -1 || close === -1) return [pattern]
  const head = pattern.slice(0, open)
  const tail = pattern.slice(close + 1)
  const options = pattern.slice(open + 1, close).split(",")
  let out = []
  for (let i = 0; i < options.length; i++) {
    out = out.concat(braces(head + options[i] + tail))
  }
  return out
}

function oneGlob(pattern) {
  let text = ""
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === "*" && pattern[i + 1] === "*") {
      if (pattern[i + 2] === "/") {
        text = text + "(?:.*/)?"
        i = i + 3
      } else {
        text = text + ".*"
        i = i + 2
      }
    } else if (c === "*") {
      text = text + "[^/]*"
      i = i + 1
    } else if (c === "?") {
      text = text + "[^/]"
      i = i + 1
    } else {
      text = text + c.replace(/[.+^${}()|[\]\\]/g, "\\$&")
      i = i + 1
    }
  }
  return text
}

function globRegex(pattern) {
  const parts = braces(pattern).map(oneGlob)
  return new RegExp("^(?:" + parts.join("|") + ")$", process.platform === "win32" ? "i" : "")
}

function glob(root, wanted, pattern) {
  const where = resolveIn(root, wanted)
  const text = String(pattern || "*")
  const matcher = globRegex(text)
  const withSlash = text.indexOf("/") >= 0
  const matches = []
  const files = walk(where.full, where.base)
  for (let i = 0; i < files.length; i++) {
    const rel = path.relative(where.base, files[i]).split(path.sep).join("/")
    const name = path.basename(files[i])
    if (matcher.test(rel) || (!withSlash && matcher.test(name))) matches.push(rel)
  }
  if (matches.length === 0) return { ok: true, text: "No files match " + text }
  matches.sort()
  let out = matches.slice(0, 500).join("\n")
  if (matches.length > 500) out = out + "\n[" + (matches.length - 500) + " more]"
  return { ok: true, text: out }
}

function grep(root, wanted, options) {
  const where = resolveIn(root, wanted)
  let regex
  try {
    regex = new RegExp(String(options.pattern || ""), options.ignore_case ? "i" : "")
  } catch (problem) {
    return fail("Bad regular expression: " + problem.message)
  }
  const include = options.include ? globRegex(String(options.include)) : null
  const context = Math.min(parseInt(options.context, 10) || 0, 5)
  const out = []
  const files = walk(where.full, where.base)
  for (let f = 0; f < files.length && out.length <= 400; f++) {
    const file = files[f]
    if (include && !include.test(path.basename(file))) continue
    let raw
    try {
      if (fs.statSync(file).size > MAX_SEARCH_FILE) continue
      raw = fs.readFileSync(file)
    } catch (problem) {
      continue
    }
    if (raw.slice(0, 2000).includes(0)) continue
    const lines = raw.toString("utf8").split("\n")
    const rel = path.relative(where.base, file).split(path.sep).join("/")
    for (let i = 0; i < lines.length; i++) {
      if (!regex.test(lines[i])) continue
      const low = Math.max(0, i - context)
      const high = Math.min(lines.length, i + context + 1)
      for (let spot = low; spot < high; spot++) {
        const mark = spot === i ? ":" : "-"
        out.push(rel + mark + (spot + 1) + mark + " " + lines[spot].replace(/\r$/, "").slice(0, 400))
      }
      if (context) out.push("--")
      if (out.length > 400) break
    }
    if (out.length > 400) out.push("[too many matches, narrow the search]")
  }
  if (out.length === 0) return { ok: true, text: "No matches." }
  return { ok: true, text: out.join("\n") }
}

module.exports = { resolveIn, read, write, list, glob, grep, inside }
