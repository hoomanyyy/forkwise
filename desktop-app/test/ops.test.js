const http = require("http")
const os = require("os")
const path = require("path")
const fs = require("fs")
const { WebSocketServer } = require("ws")
const { Agent } = require("../src/agent")
const configLib = require("../src/config")
const { ChromeDriver } = require("../src/chromeDriver")

process.env.FORKWISE_CHROME = process.env.FORKWISE_CHROME || "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"
process.env.FORKWISE_HEADLESS = "1"
process.env.FORKWISE_NO_SANDBOX = "1"
process.env.FORKWISE_CHROME_PORT = "9444"

let clip = "before"
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
const chrome = new ChromeDriver()
const host = {
  version: "test",
  openExternal: async function () {},
  openPath: async function () {
    return ""
  },
  clipboardRead: function () {
    return clip
  },
  clipboardWrite: function (text) {
    clip = text
  },
  displays: function () {
    return [{ width: 1920, height: 1080, scale: 1, primary: true }]
  },
  notify: function () {},
  capture: async function () {
    return { base64: png, width: 1366, height: 768 }
  },
  inputBounds: function () {
    return { left: 0, top: 0, width: 1920, height: 1080 }
  },
  driver: function () {
    return chrome
  }
}

let failed = 0
function check(name, ok, detail) {
  if (ok) console.log("PASS " + name)
  else {
    failed = failed + 1
    console.log("FAIL " + name + " " + (detail || ""))
  }
}

async function main() {
  const page = http.createServer(function (request, reply) {
    reply.setHeader("Content-Type", "text/html")
    reply.end("<html><head><title>Test page</title></head><body><h1>Hello Forkwise</h1><input id=a placeholder='Your name'><button onclick=\"document.title='clicked '+document.getElementById('a').value\">Go</button></body></html>")
  })
  await new Promise(function (resolve) {
    page.listen(8799, resolve)
  })
  const wss = new WebSocketServer({ port: 8798, path: "/api/ws/desktop" })
  const replies = {}
  let socket = null
  let counter = 0
  wss.on("connection", function (ws, request) {
    socket = ws
    check("auth header sent", request.headers.authorization === "Bearer fwd_test")
    ws.on("message", function (raw) {
      const data = JSON.parse(raw.toString())
      if (data.type === "hello") {
        ws.send(JSON.stringify({ type: "welcome", name: "Test PC" }))
        return
      }
      if (replies[data.id]) replies[data.id](data)
    })
  })
  function call(action, fields) {
    counter = counter + 1
    const message = Object.assign({ id: counter, action: action }, fields || {})
    return new Promise(function (resolve) {
      replies[counter] = resolve
      socket.send(JSON.stringify(message))
    })
  }

  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "fwcfg-"))
  const config = configLib.create(folder)
  config.set("token", "fwd_test")
  config.set("server", "http://127.0.0.1:8798")
  const activity = []
  const agent = new Agent({
    host: host,
    config: config,
    ask: async function () {
      return "allow"
    },
    onActivity: function (entry) {
      activity.push(entry)
    },
    onStatus: function () {}
  })
  agent.connect()
  for (let i = 0; i < 50 && !socket; i++) await new Promise(function (r) { setTimeout(r, 100) })
  check("connected", !!socket)
  await new Promise(function (r) { setTimeout(r, 300) })
  check("welcome seen", agent.state.state === "online" && agent.state.name === "Test PC")

  let r = await call("info")
  check("info", r.ok && r.text.indexOf("Machine:") >= 0, r.text)
  r = await call("shell", { command: "echo hello && echo oops 1>&2" })
  check("shell output", r.ok && r.text.indexOf("hello") >= 0 && r.text.indexOf("oops") >= 0 && r.text.indexOf("exit code 0") >= 0, r.text)
  r = await call("shell", { command: "exit 3" })
  check("shell exit code", !r.ok && r.text.indexOf("exit code 3") >= 0, r.text)
  r = await call("shell", { command: "sleep 5", timeout: 1 })
  check("shell timeout", !r.ok && r.text.indexOf("timed out") >= 0, r.text)
  const file = path.join(folder, "sub", "a.txt")
  r = await call("write_file", { path: file, content: "line one\nسلام" })
  check("write_file", r.ok, r.text)
  r = await call("read_file", { path: file })
  check("read_file unicode", r.ok && r.text.indexOf("سلام") >= 0, r.text)
  r = await call("list_dir", { path: path.join(folder, "sub") })
  check("list_dir", r.ok && r.text.indexOf("a.txt") >= 0, r.text)
  r = await call("clipboard_set", { text: "copied" })
  r = await call("clipboard_get")
  check("clipboard", r.ok && r.text === "copied", r.text)
  r = await call("screenshot")
  check("screenshot", r.ok && r.image === png, r.text)
  r = await call("processes")
  check("processes", r.ok && r.text.length > 20, r.text)
  r = await call("nope")
  check("unknown action", !r.ok)

  r = await call("chrome", { op: "new_tab", url: "http://127.0.0.1:8799/", browser: "chrome" })
  check("browser new_tab", r.ok && r.text.indexOf("Test page") >= 0, r.text)
  r = await call("chrome", { op: "read", browser: "chrome" })
  check("browser read", r.ok && r.text.indexOf("Hello Forkwise") >= 0, r.text)
  r = await call("chrome", { op: "elements", browser: "chrome" })
  check("browser elements", r.ok && r.text.indexOf("1 [input") >= 0 && r.text.indexOf("[button:submit] Go") >= 0, r.text)
  r = await call("chrome", { op: "type", ref: 1, text: "Siavash", browser: "chrome" })
  check("browser type", r.ok, r.text)
  r = await call("chrome", { op: "click", ref: 2, browser: "chrome" })
  check("browser click changes title", r.ok && r.text.indexOf("clicked Siavash") >= 0, r.text)
  r = await call("chrome", { op: "eval", expression: "1+2", browser: "chrome" })
  check("browser eval", r.ok && r.text === "3", r.text)
  r = await call("chrome", { op: "new_tab", url: "http://127.0.0.1:8799/?two", browser: "chrome" })
  r = await call("chrome", { op: "tabs", browser: "chrome" })
  check("browser two tabs", r.ok && r.text.split("\n").length >= 3, r.text)
  r = await call("chrome", { op: "switch_tab", tab: "0", browser: "chrome" })
  check("browser switch_tab", r.ok && r.text.indexOf("clicked Siavash") >= 0, r.text)
  r = await call("chrome", { op: "screenshot", browser: "chrome" })
  check("browser screenshot", r.ok && r.image && r.image.length > 100, r.text)
  r = await call("chrome", { op: "wait", text: "Hello Forkwise", amount: 3, browser: "chrome" })
  check("browser wait", r.ok, r.text)
  r = await call("chrome", { op: "close_tab", tab: "1", browser: "chrome" })
  check("browser close_tab", r.ok, r.text)

  config.set("confirm", true)
  agent.ask = async function () {
    return "deny"
  }
  r = await call("shell", { command: "echo should-not-run" })
  check("confirm deny blocks", !r.ok && r.text.indexOf("refused") >= 0, r.text)
  r = await call("info")
  check("read only skips confirm", r.ok, r.text)
  agent.ask = async function () {
    return "always"
  }
  r = await call("list_dir", { path: folder })
  check("always allows", r.ok && config.get("always").indexOf("list_dir") >= 0, r.text)
  agent.ask = async function () {
    throw new Error("must not ask again")
  }
  r = await call("list_dir", { path: folder })
  check("always remembered", r.ok, r.text)
  config.set("confirm", false)

  agent.setPaused(true)
  r = await call("info")
  check("paused refuses", !r.ok && r.text.indexOf("paused") >= 0, r.text)
  agent.setPaused(false)
  const slow = call("shell", { command: "sleep 20", timeout: 30 })
  await new Promise(function (r2) { setTimeout(r2, 500) })
  agent.panic()
  r = await slow
  check("panic kills running shell", !r.ok, r.text)
  r = await call("info")
  check("panic leaves app paused", !r.ok && r.text.indexOf("paused") >= 0, r.text)

  agent.disconnect()
  wss.close()
  page.close()
  const list = await chrome.tabs().catch(function () { return [] })
  for (let i = 0; i < list.length; i++) await chrome.close(list[i].id).catch(function () {})
  if (chrome.process && chrome.process.pid) {
    try {
      process.kill(-chrome.process.pid, "SIGKILL")
    } catch (problem) {
      try {
        process.kill(chrome.process.pid, "SIGKILL")
      } catch (second) {}
    }
  }
  console.log(failed === 0 ? "ALL PASSED" : failed + " FAILED")
  process.exit(failed === 0 ? 0 : 1)
}

main()
