/* A small local terminal for the panel: one shell per app window, line based,
   with output streamed to the renderer. Not a full pty, so full screen TUIs
   (vim, htop) are better opened with the computer tool. */
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

function create(options) {
  const onData = options.onData || function () {}
  const onExit = options.onExit || function () {}
  let child = null
  let cwd = options.cwd || os.homedir()

  function start(folder) {
    stop()
    if (folder) cwd = folder
    const command = shellCommand()
    child = spawn(command, shellArgs(command), {
      cwd: cwd,
      env: Object.assign({}, process.env, { TERM: "xterm-256color", FORCE_COLOR: "1", CLICOLOR_FORCE: "1" }),
      windowsHide: true,
      detached: process.platform !== "win32"
    })
    child.stdout.on("data", function (chunk) {
      onData(chunk.toString())
    })
    child.stderr.on("data", function (chunk) {
      onData(chunk.toString())
    })
    child.on("error", function (problem) {
      onData("\r\n" + problem.message + "\r\n")
    })
    child.on("exit", function (code) {
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

  function stop() {
    if (!child) return
    const victim = child
    child = null
    try {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(victim.pid), "/T", "/F"], { windowsHide: true })
      else process.kill(-victim.pid, "SIGTERM")
    } catch (problem) {
      try {
        victim.kill()
      } catch (error) {}
    }
  }

  function info() {
    return { cwd: cwd, running: !!child }
  }

  return { start: start, write: write, stop: stop, resize: resize, info: info }
}

module.exports = { create: create }
