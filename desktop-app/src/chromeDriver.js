const http = require("http")
const os = require("os")
const path = require("path")
const fs = require("fs")
const { spawn } = require("child_process")
const { WebSocket } = require("ws")
const util = require("./util")

const PORT = parseInt(process.env.FORKWISE_CHROME_PORT || "9333", 10)
const PROFILE = path.join(os.homedir(), ".forkwise", "chrome-profile")

function getJson(pathname, method) {
  return new Promise(function (resolve, reject) {
    const request = http.request({ host: "127.0.0.1", port: PORT, path: pathname, method: method || "GET", timeout: 5000 }, function (reply) {
      let raw = ""
      reply.on("data", function (chunk) {
        raw = raw + chunk
      })
      reply.on("end", function () {
        try {
          resolve(JSON.parse(raw))
        } catch (problem) {
          resolve(raw)
        }
      })
    })
    request.on("timeout", function () {
      request.destroy(new Error("timeout"))
    })
    request.on("error", reject)
    request.end()
  })
}

function findChrome() {
  const wanted = process.env.FORKWISE_CHROME
  if (wanted && fs.existsSync(wanted)) return wanted
  const list = []
  if (process.platform === "win32") {
    const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
    const rel = ["Google\\Chrome\\Application\\chrome.exe", "Microsoft\\Edge\\Application\\msedge.exe", "BraveSoftware\\Brave-Browser\\Application\\brave.exe"]
    for (let i = 0; i < roots.length; i++) {
      for (let j = 0; j < rel.length; j++) {
        if (roots[i]) list.push(path.join(roots[i], rel[j]))
      }
    }
  } else if (process.platform === "darwin") {
    list.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/Applications/Chromium.app/Contents/MacOS/Chromium")
  } else {
    const names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"]
    const dirs = (process.env.PATH || "").split(path.delimiter)
    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < dirs.length; j++) list.push(path.join(dirs[j], names[i]))
    }
  }
  for (let i = 0; i < list.length; i++) {
    if (fs.existsSync(list[i])) return list[i]
  }
  return ""
}

class Cdp {
  constructor(url) {
    this.url = url
    this.next = 1
    this.pending = {}
    this.ws = null
  }

  open() {
    const self = this
    return new Promise(function (resolve, reject) {
      self.ws = new WebSocket(self.url, { maxPayload: 64 * 1024 * 1024, perMessageDeflate: false })
      self.ws.on("open", resolve)
      self.ws.on("error", reject)
      self.ws.on("message", function (raw) {
        const message = JSON.parse(raw.toString())
        const waiting = self.pending[message.id]
        if (!waiting) return
        delete self.pending[message.id]
        if (message.error) waiting.reject(new Error(message.error.message || "browser error"))
        else waiting.resolve(message.result || {})
      })
      self.ws.on("close", function () {
        const ids = Object.keys(self.pending)
        for (let i = 0; i < ids.length; i++) self.pending[ids[i]].reject(new Error("The tab closed."))
        self.pending = {}
      })
    })
  }

  send(method, params, timeoutMs) {
    const self = this
    const id = this.next++
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        delete self.pending[id]
        reject(new Error("The browser did not answer in time."))
      }, timeoutMs || 25000)
      self.pending[id] = {
        resolve: function (value) {
          clearTimeout(timer)
          resolve(value)
        },
        reject: function (problem) {
          clearTimeout(timer)
          reject(problem)
        }
      }
      self.ws.send(JSON.stringify({ id: id, method: method, params: params || {} }))
    })
  }

  close() {
    try {
      this.ws.close()
    } catch (problem) {}
  }
}

class ChromeDriver {
  constructor() {
    this.name = "chrome"
    this.order = []
    this.links = {}
    this.process = null
  }

  async alive() {
    try {
      await getJson("/json/version")
      return true
    } catch (problem) {
      return false
    }
  }

  async ensure(url) {
    if (await this.alive()) return { ok: true, text: "Your Chrome (Forkwise profile) is already running." }
    const exe = findChrome()
    if (!exe) return { ok: false, text: "Chrome, Edge or Brave was not found. Install Google Chrome, or set FORKWISE_CHROME to the browser program path." }
    fs.mkdirSync(PROFILE, { recursive: true })
    const args = ["--remote-debugging-port=" + PORT, "--remote-allow-origins=*", "--user-data-dir=" + PROFILE, "--no-first-run", "--no-default-browser-check", "--disable-features=Translate"]
    if (process.env.FORKWISE_HEADLESS === "1") args.push("--headless=new")
    if (process.env.FORKWISE_NO_SANDBOX === "1") args.push("--no-sandbox")
    args.push(url || "about:blank")
    this.process = spawn(exe, args, { stdio: "ignore", detached: true })
    this.process.on("error", function () {})
    this.process.unref()
    for (let i = 0; i < 60; i++) {
      if (await this.alive()) return { ok: true, text: "Started a separate Chrome window for Forkwise. Sign in to sites there once and it remembers you." }
      await util.sleep(250)
    }
    return { ok: false, text: "The browser did not start in time." }
  }

  async tabs() {
    const items = await getJson("/json/list")
    const found = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === "page") found[items[i].id] = items[i]
    }
    this.order = this.order.filter(function (id) {
      return found[id]
    })
    const ids = Object.keys(found)
    for (let i = 0; i < ids.length; i++) {
      if (this.order.indexOf(ids[i]) === -1) this.order.push(ids[i])
    }
    const result = []
    for (let i = 0; i < this.order.length; i++) {
      const item = found[this.order[i]]
      result.push({ id: item.id, title: item.title || "", url: item.url || "", socket: item.webSocketDebuggerUrl })
    }
    return result
  }

  async newTab(url) {
    const target = url || "about:blank"
    const item = await getJson("/json/new?" + encodeURI(target), "PUT")
    return item.id
  }

  async activate(id) {
    await getJson("/json/activate/" + id)
  }

  async close(id) {
    if (this.links[id]) {
      this.links[id].close()
      delete this.links[id]
    }
    await getJson("/json/close/" + id)
  }

  async send(id, method, params, timeoutMs) {
    let link = this.links[id]
    if (!link || link.ws.readyState !== 1) {
      const all = await this.tabs()
      let socket = ""
      for (let i = 0; i < all.length; i++) {
        if (all[i].id === id) socket = all[i].socket
      }
      if (!socket) throw new Error("No such tab.")
      link = new Cdp(socket)
      await link.open()
      this.links[id] = link
    }
    return link.send(method, params, timeoutMs)
  }
}

module.exports = { ChromeDriver, findChrome }
