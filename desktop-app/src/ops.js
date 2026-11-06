const shell = require("./shell")
const files = require("./files")
const system = require("./system")
const screenLib = require("./screen")
const browserLib = require("./browserOps")
const util = require("./util")
const workspace = require("./workspace")

const READ_ONLY = ["info", "screenshot", "wait", "ui_elements", "windows", "processes", "fs_read", "fs_list", "fs_glob", "fs_grep", "job_output"]
const FOLDER_ACTIONS = ["fs_read", "fs_write", "fs_list", "fs_glob", "fs_grep", "job_start", "job_output", "job_kill", "shell"]
const READ_ONLY_BROWSER = ["tabs", "read", "html", "elements", "screenshot", "wait"]

function isReadOnly(message) {
  if (READ_ONLY.indexOf(message.action) >= 0) return true
  if (message.action === "chrome" && READ_ONLY_BROWSER.indexOf(message.op) >= 0) return true
  return false
}

function describe(message) {
  const a = message.action
  if (a === "shell") return "run a command: " + String(message.command || "").slice(0, 300)
  if (a === "open") return "open: " + message.target
  if (a === "type") return "type " + String(message.text || "").length + " characters"
  if (a === "key") return "press keys: " + message.keys
  if (a === "read_file" || a === "write_file" || a === "list_dir") return a.replace("_", " ") + ": " + message.path
  if (a === "fs_read" || a === "fs_write" || a === "fs_list" || a === "fs_glob" || a === "fs_grep") return a.replace("fs_", "") + ": " + (message.path || message.pattern || ".")
  if (a === "job_start") return "start in the background: " + String(message.command || "").slice(0, 300)
  if (a === "job_output" || a === "job_kill") return a.replace("_", " ") + " " + message.job
  if (a === "download") return "download " + message.url + " to " + (message.path || "Downloads")
  if (a === "wallpaper") return "change the wallpaper to " + (message.source || message.path)
  if (a === "focus") return "switch to the window: " + message.target
  if (a === "kill") return "stop the process " + message.target
  if (a === "notify") return "show a notification"
  if (a === "chrome") return (message.browser === "mine" ? "your Chrome " : message.browser === "chrome" ? "Chrome " : "browser ") + message.op + (message.url ? ": " + message.url : "")
  if (a === "ui_elements") return "read the buttons and fields of the window in front"
  if (a === "click" || a === "move" || a === "drag" || a === "scroll") return a + " at " + message.x + "," + message.y
  return String(a)
}

function usesFolder(message) {
  return !!message.root && FOLDER_ACTIONS.indexOf(message.action) >= 0
}

function create(host, hooks) {
  const screen = screenLib.create(host)
  const browser = browserLib.create(host.driver)
  const events = hooks || {}

  async function handle(message) {
    const a = message.action
    if (a === "info") return system.info(host, screen)
    if (a === "shell") return shell.runShell(message.command || "", message.root || message.cwd, message.timeout, events.onShellData)
    if (a === "fs_read") return workspace.read(message.root, message.path, !!message.full)
    if (a === "fs_write") return workspace.write(message.root, message.path, message.content)
    if (a === "fs_list") return workspace.list(message.root, message.path, message.depth)
    if (a === "fs_glob") return workspace.glob(message.root, message.path, message.pattern)
    if (a === "fs_grep") return workspace.grep(message.root, message.path, message)
    if (a === "job_start") return { ok: true, text: "Started.", data: { id: shell.startJob(message.command || "", message.root) } }
    if (a === "job_output") return shell.jobOutput(message.job)
    if (a === "job_kill") return shell.killJob(message.job)
    if (a === "open") return system.openTarget(host, message.target, message.args)
    if (a === "screenshot") return screen.screenshot()
    if (a === "click" || a === "move") {
      if (a === "move") await screen.move(message.x, message.y)
      else await screen.click(message.x, message.y, message.button, message.double)
      return { ok: true, text: a + " at " + message.x + "," + message.y + ". Take a screenshot to check the result." }
    }
    if (a === "drag") {
      await screen.drag(message.x, message.y, message.x2, message.y2, message.button)
      return { ok: true, text: "Dragged. Take a screenshot to check the result." }
    }
    if (a === "type") {
      const text = message.text || ""
      await screen.typeText(text)
      return { ok: true, text: "Typed " + text.length + " characters." }
    }
    if (a === "key") {
      const pressed = await screen.pressKeys(message.keys || "enter")
      return { ok: true, text: "Pressed " + pressed }
    }
    if (a === "scroll") {
      await screen.scroll(message.x, message.y, message.amount)
      return { ok: true, text: "Scrolled." }
    }
    if (a === "wait") {
      const seconds = util.clamp(util.toInt(message.amount, 1), 0, 30)
      await util.sleep(seconds * 1000)
      return { ok: true, text: "Waited " + seconds + " seconds." }
    }
    if (a === "windows") return system.windowList()
    if (a === "focus") return system.focusWindow(message.target)
    if (a === "clipboard_get") return { ok: true, text: host.clipboardRead().slice(0, 20000) }
    if (a === "clipboard_set") {
      host.clipboardWrite(message.text || "")
      return { ok: true, text: "Copied to the clipboard." }
    }
    if (a === "list_dir") return files.listDir(message.path)
    if (a === "read_file") return files.readFile(message.path)
    if (a === "write_file") return files.writeFile(message.path, message.content)
    if (a === "download") return files.download(message.url, message.path)
    if (a === "wallpaper") return system.setWallpaper(message.source || message.path)
    if (a === "chrome") return browser.run(message)
    if (a === "ui_elements") return system.uiElements(screen, message.target)
    if (a === "processes") return system.processList(message.target)
    if (a === "kill") return system.killProcess(message.target)
    if (a === "notify") {
      host.notify(message.title || "Forkwise", message.text || "")
      return { ok: true, text: "Notification shown." }
    }
    return { ok: false, text: "Unknown action " + a }
  }

  async function safeHandle(message) {
    try {
      return await handle(message)
    } catch (problem) {
      return { ok: false, text: String((problem && problem.message) || problem).slice(0, 1000) }
    }
  }

  return { handle: safeHandle, screen }
}

module.exports = { create, describe, isReadOnly, usesFolder }
