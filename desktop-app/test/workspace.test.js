const fs = require("fs")
const os = require("os")
const path = require("path")
const assert = require("assert")
const workspace = require("../src/workspace")
const shell = require("../src/shell")
const util = require("../src/util")

const root = fs.mkdtempSync(path.join(os.tmpdir(), "fw-ws-"))
fs.mkdirSync(path.join(root, "src", "deep"), { recursive: true })
fs.mkdirSync(path.join(root, "node_modules", "pkg"), { recursive: true })
fs.mkdirSync(path.join(root, ".git"), { recursive: true })
fs.writeFileSync(path.join(root, "src", "a.js"), "const one = 1\nconst two = 2\n")
fs.writeFileSync(path.join(root, "src", "deep", "b.test.js"), "test('x')\r\nconst two = 3\r\n")
fs.writeFileSync(path.join(root, "README.md"), "# Title\n")
fs.writeFileSync(path.join(root, "node_modules", "pkg", "x.js"), "const two = 9\n")
fs.writeFileSync(path.join(root, "bin.dat"), Buffer.from([1, 2, 0, 3]))

function safe(fn) {
  try {
    return fn()
  } catch (problem) {
    return { ok: false, text: problem.message }
  }
}

function ok(result, name) {
  assert.strictEqual(result.ok, true, name + ": " + result.text)
  console.log("OK  " + name)
}

function bad(result, name, part) {
  assert.strictEqual(result.ok, false, name + " should fail")
  assert.ok(result.text.indexOf(part) >= 0, name + ": " + result.text)
  console.log("OK  " + name)
}

async function main() {
  let r = workspace.read(root, "src/a.js", false)
  ok(r, "read")
  assert.strictEqual(r.text, "const one = 1\nconst two = 2\n")
  assert.strictEqual(r.data.rel, "src/a.js")

  r = workspace.read(root, "src/deep/b.test.js", true)
  ok(r, "read crlf file")
  assert.strictEqual(r.text.indexOf("\r"), -1)

  r = workspace.write(root, "src/deep/b.test.js", "test('y')\nconst two = 4\n")
  ok(r, "write keeps CRLF")
  assert.strictEqual(fs.readFileSync(path.join(root, "src", "deep", "b.test.js"), "utf8"), "test('y')\r\nconst two = 4\r\n")
  assert.strictEqual(r.data.existed, true)
  assert.strictEqual(r.data.old, "test('x')\nconst two = 3\n")

  r = workspace.write(root, "new/dir/file.txt", "hello")
  ok(r, "write new file in new folders")
  assert.strictEqual(r.data.existed, false)

  bad(safe(function () {
    return workspace.read(root, "../outside.txt", false)
  }), "read outside", "outside the project folder")
  bad(safe(function () {
    return workspace.read(root, "/etc/passwd", false)
  }), "read absolute outside", "outside the project folder")
  bad(safe(function () {
    return workspace.write(root, ".git/config", "x")
  }), "write in .git", ".git")
  bad(safe(function () {
    return workspace.read(root, "missing.txt", false)
  }), "read missing", "not found")
  bad(safe(function () {
    return workspace.read(root, "bin.dat", false)
  }), "read binary", "binary")
  bad(safe(function () {
    return workspace.read(root, "src", false)
  }), "read folder", "folder")

  const link = path.join(root, "escape")
  try {
    fs.symlinkSync(os.tmpdir(), link)
    bad(safe(function () {
    return workspace.read(root, "escape/anything", false)
  }), "symlink escape", "link")
  } catch (problem) {
    console.log("skip symlink test: " + problem.message)
  }

  r = workspace.list(root, ".", 3)
  ok(r, "list")
  assert.ok(r.text.indexOf("node_modules/ (skipped)") >= 0)
  assert.ok(r.text.indexOf("  a.js") >= 0)

  r = workspace.glob(root, ".", "**/*.js")
  ok(r, "glob **/*.js")
  assert.ok(r.text.indexOf("src/a.js") >= 0 && r.text.indexOf("node_modules") === -1)
  r = workspace.glob(root, ".", "*.md")
  assert.strictEqual(r.text, "README.md")
  r = workspace.glob(root, ".", "src/**/*.test.js")
  assert.strictEqual(r.text, "src/deep/b.test.js")
  r = workspace.glob(root, ".", "**/*.{md,txt}")
  assert.ok(r.text.indexOf("README.md") >= 0 && r.text.indexOf("new/dir/file.txt") >= 0)
  console.log("OK  glob patterns")

  r = workspace.grep(root, ".", { pattern: "const two", include: "*.js" })
  ok(r, "grep")
  assert.ok(r.text.indexOf("src/a.js:2: const two = 2") >= 0, r.text)
  assert.ok(r.text.indexOf("node_modules") === -1)
  r = workspace.grep(root, ".", { pattern: "CONST ONE", ignore_case: true, context: 1 })
  assert.ok(r.text.indexOf("src/a.js:1:") >= 0 && r.text.indexOf("src/a.js-2-") >= 0, r.text)
  bad(safe(function () {
    return workspace.grep(root, ".", { pattern: "(" })
  }), "grep bad regex", "Bad regular expression")
  console.log("OK  grep options")

  const command = process.platform === "win32" ? "Write-Output hi; Start-Sleep 30" : "echo hi; sleep 30"
  const id = shell.startJob(command, root)
  await util.sleep(700)
  let job = shell.jobOutput(id)
  ok(job, "job output")
  assert.strictEqual(job.data.alive, true)
  assert.ok(job.text.indexOf("hi") >= 0)
  ok(shell.killJob(id), "job kill")
  await util.sleep(500)
  job = shell.jobOutput(id)
  assert.strictEqual(job.data.alive, false)
  bad(shell.jobOutput("nope"), "unknown job", "No job")

  const done = await shell.runShell(process.platform === "win32" ? "Get-Location | Select-Object -ExpandProperty Path" : "pwd", root, 10)
  assert.ok(done.ok && done.text.indexOf(path.basename(root)) >= 0, done.text)
  console.log("OK  shell runs in the folder")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("ALL WORKSPACE TESTS PASSED")
}

main().catch(function (problem) {
  console.error(problem)
  process.exit(1)
})
