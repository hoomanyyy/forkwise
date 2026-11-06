/* A small local terminal for the panel: one shell per app window, line based,
   with output streamed to the renderer. Not a full pty, so full screen TUIs
   (vim, htop) are better opened with the computer tool. */
const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawn } = require("child_process")

function shellCommand() {
  if (process.platform === "win32") return process.env.ComSpec || "cmd.exe"
  return process.env.SHELL || "/bin/bash"
}

function shellArgs(command) {
  if (process.platform === "win32") return []
  if (/fish$/.test(command)) return ["-i", "-c", "status is-interactive; and true"]
  return ["-i"]
}

// "~" is a shell idea, so spawn needs it spelled out. A folder that is gone
// falls back to the home folder instead of failing with ENOENT.
function realFolder(folder) {
  let value = String(folder || "").trim()
  if (value === "~") value = os.homedir()
  else if (value.indexOf("~/") === 0 || value.indexOf("~\\") === 0) value = path.join(os.homedir(), value.slice(2))
  try {
    if (value && fs.statSync(value).isDirectory()) return value
  } catch (problem) {}
  return ""
}

function create(options) {
  const onData = options.onData || function () {}
  const onExit = options.onExit || function () {}
  let child = null
  let cwd = realFolder(options.cwd) || os.homedir()

  function start(folder) {
    stop()
    const wanted = realFolder(folder)
    if (wanted) cwd = wanted
    if (!realFolder(cwd)) cwd = os.homedir()
    const command = shellCommand()
    // On macOS and Linux the shell runs through sh so its error output is
    // joined to the normal output; two pipes would mix up the order of a
    // prompt and the command's output.
    const program = process.platform === "win32" ? command : "/bin/sh"
    const programArgs = process.platform === "win32" ? shellArgs(command) : ["-c", 'exec "$0" "$@" 2>&1', command].concat(shellArgs(command))
    const current = spawn(program, programArgs, {
      cwd: cwd,
      env: Object.assign({}, process.env, { TERM: "xterm-256color", FORCE_COLOR: "1", CLICOLOR_FORCE: "1" }),
      windowsHide: true,
      detached: process.platform !== "win32"
    })
    child = current
    current.stdout.on("data", function (chunk) {
      onData(chunk.toString())
    })
    current.stderr.on("data", function (chunk) {
      onData(chunk.toString())
    })
    current.on("error", function (problem) {
      onData("\r\n" + problem.message + "\r\n")
    })
    current.on("exit", function (code) {
      // a shell we stopped on purpose does not report an exit
      if (child !== current) return
      child = null
      onExit(code)
    })
    onData("")
    return { cwd: cwd, shell: path.basename(command) }
  }

  function write(data) {
    if (!child) start()
    if (child && child.stdin.writable) child.stdin.write(data)
  }

  function resize() {}

  // Ctrl+C: the running command gets SIGINT, the shell itself ignores it.
  function interrupt() {
    if (!child) return false
    if (process.platform === "win32") {
      const folder = cwd
      stop()
      start(folder)
      return true
    }
    try {
      process.kill(-child.pid, "SIGINT")
      return true
    } catch (problem) {
      return false
    }
  }

  function stop() {
    if (!child) return
    const victim = child
    child = null
    try {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(victim.pid), "/T", "/F"], { windowsHide: true })
      else {
        // an interactive shell ignores SIGTERM, so hang it up and make sure
        process.kill(-victim.pid, "SIGHUP")
        setTimeout(function () {
          try {
            process.kill(-victim.pid, "SIGKILL")
          } catch (problem) {}
        }, 400)
      }
    } catch (problem) {
      try {
        victim.kill()
      } catch (error) {}
    }
  }

  function info() {
    return { cwd: cwd, running: !!child }
  }

  return { start: start, write: write, stop: stop, interrupt: interrupt, resize: resize, info: info }
}

module.exports = { create: create }
