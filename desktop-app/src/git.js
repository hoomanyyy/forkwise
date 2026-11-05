/* Git knowledge for the Changes panel, using the git the user already has. */
const fs = require("fs")
const path = require("path")
const { execFile } = require("child_process")

function run(cwd, args, timeout) {
  return new Promise(function (resolve) {
    execFile("git", ["-C", cwd].concat(args), { timeout: timeout || 8000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, function (problem, stdout, stderr) {
      if (problem) {
        resolve({ ok: false, text: String(stderr || problem.message || "git failed").trim() })
        return
      }
      resolve({ ok: true, text: String(stdout) })
    })
  })
}

function findRoot(folder) {
  if (!folder) return Promise.resolve("")
  return run(folder, ["rev-parse", "--show-toplevel"], 4000).then(function (answer) {
    return answer.ok ? answer.text.trim() : ""
  })
}

async function status(folder) {
  const root = await findRoot(folder)
  if (!root) return { repo: false, files: [], branch: "", root: "" }
  const branch = await run(root, ["rev-parse", "--abbrev-ref", "HEAD"], 4000)
  const porcelain = await run(root, ["status", "--porcelain=v1", "-uall"], 8000)
  const files = []
  if (porcelain.ok) {
    porcelain.text.split("\n").forEach(function (line) {
      if (!line.trim()) return
      const code = line.slice(0, 2).trim() || "M"
      const rel = line.slice(3).trim()
      if (rel.indexOf(" -> ") >= 0) {
        const parts = rel.split(" -> ")
        files.push({ path: parts[1], code: code, from: parts[0] })
        return
      }
      files.push({ path: rel, code: code })
    })
  }
  const numstat = await run(root, ["diff", "--numstat", "HEAD"], 12000)
  if (numstat.ok) {
    const counts = {}
    numstat.text.split("\n").forEach(function (line) {
      const parts = line.split("\t")
      if (parts.length < 3) return
      counts[parts[2]] = { add: Number(parts[0]) || 0, del: Number(parts[1]) || 0 }
    })
    files.forEach(function (file) {
      const found = counts[file.path]
      if (found) {
        file.add = found.add
        file.del = found.del
      }
    })
  }
  return { repo: true, root: root, branch: branch.ok ? branch.text.trim() : "", files: files.slice(0, 400) }
}

async function diff(folder, rel, staged) {
  const root = await findRoot(folder)
  if (!root) return { ok: false, text: "This folder is not a git repository." }
  const args = ["diff"]
  if (staged) args.push("--cached")
  args.push("--no-color", "--unified=3", "HEAD", "--", rel || ".")
  let answer = await run(root, args, 12000)
  if (answer.ok && !answer.text.trim()) {
    const target = path.join(root, rel || ".")
    try {
      const stat = fs.statSync(target)
      if (stat.isFile()) {
        const content = fs.readFileSync(target, "utf8").slice(0, 200000)
        const lines = content.split("\n")
        const body = lines.map(function (line) {
          return "+" + line
        })
        return { ok: true, text: "--- a/" + rel + "\n+++ b/" + rel + "\n@@ new file @@\n" + body.join("\n"), untracked: true }
      }
    } catch (problem) {
      return { ok: false, text: "Cannot read this file: " + problem.message }
    }
  }
  return answer
}

module.exports = { status: status, diff: diff, findRoot: findRoot }
