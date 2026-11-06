/* Real terminals for the panel: each one is a pseudo terminal (like the
   terminal in VS Code), so colours, prompts and full screen programs such as
   vim, htop or a dev server with live output all work. */
const fs = require("fs")
const os = require("os")
const path = require("path")

let ptyLib = null
let loadError = ""
try {
  ptyLib = require("@lydell/node-pty")
} catch (problem) {
  loadError = problem.message
}

function defaultShell() {
  if (process.platform === "win32") {
    const pwsh = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    return fs.existsSync(pwsh) ? pwsh : process.env.ComSpec || "cmd.exe"
  }
  return process.env.SHELL || (fs.existsSync("/bin/zsh") && process.platform === "darwin" ? "/bin/zsh" : "/bin/bash")
}

function realFolder(folder) {
  let value = String(folder || "").trim()
  if (value === "~") value = os.homedir()
  try {
    if (value && fs.statSync(value).isDirectory()) return value
  } catch (problem) {}
  return os.homedir()
}

function create(options) {
  const onData = options.onData
  const onExit = options.onExit
  const terms = {}

  function available() {
    return { ok: !!ptyLib, reason: loadError }
  }

  function start(id, settings) {
    if (!ptyLib) throw new Error("Real terminals are not available on this computer: " + loadError)
    kill(id)
    const shell = settings.shell || defaultShell()
    const args = settings.args || (process.platform === "win32" ? [] : ["-l"])
    const cwd = realFolder(settings.cwd)
    const env = Object.assign({}, process.env, { TERM: "xterm-256color", COLORTERM: "truecolor", TERM_PROGRAM: "Forkwise" })
    const term = ptyLib.spawn(shell, args, {
      name: "xterm-256color",
      cols: Math.max(20, settings.cols || 80),
      rows: Math.max(5, settings.rows || 24),
      cwd: cwd,
      env: env,
      useConpty: true
    })
    terms[id] = term
    term.onData(function (data) {
      onData(id, data)
    })
    term.onExit(function (info) {
      if (terms[id] === term) delete terms[id]
      onExit(id, info ? info.exitCode : 0)
    })
    return { ok: true, id: id, cwd: cwd, shell: path.basename(shell), pid: term.pid }
  }

  function write(id, data) {
    const term = terms[id]
    if (term) term.write(String(data))
    return { ok: !!term }
  }

  function resize(id, cols, rows) {
    const term = terms[id]
    if (!term) return { ok: false }
    try {
      term.resize(Math.max(20, cols | 0), Math.max(5, rows | 0))
    } catch (problem) {}
    return { ok: true }
  }

  function kill(id) {
    const term = terms[id]
    if (!term) return { ok: false }
    delete terms[id]
    try {
      term.kill()
    } catch (problem) {}
    return { ok: true }
  }

  function killAll() {
    Object.keys(terms).forEach(kill)
  }

  return { available: available, start: start, write: write, resize: resize, kill: kill, killAll: killAll }
}

module.exports = { create: create }
