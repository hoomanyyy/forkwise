/* Your own Chrome, Edge or Brave through the Forkwise for Chrome extension.
   The extension connects to this small local server; only the Forkwise
   extension id may connect, so web pages cannot use it. */
const http = require("http")
const { WebSocketServer } = require("ws")

const PORTS = [47321, 47322, 47323, 47324]
const EXTENSION_ID = "ifdnipndnhjfgjgjaljleajebhjpnogn"
const ASK_WAIT_MS = 190000

function allowedIds() {
  const list = [EXTENSION_ID]
  const extra = (process.env.FORKWISE_EXTENSION_IDS || "").split(",")
  for (let i = 0; i < extra.length; i++) {
    if (extra[i].trim()) list.push(extra[i].trim())
  }
  return list
}

class ExtensionDriver {
  constructor(onChange) {
    this.name = "mine"
    this.onChange = onChange || function () {}
    this.socket = null
    this.browser = ""
    this.version = ""
    this.next = 1
    this.pending = {}
    this.port = 0
    this.server = null
  }

  start() {
    this.listen(0)
  }

  listen(index) {
    if (index >= PORTS.length) return
    const self = this
    const server = http.createServer(function (request, reply) {
      reply.writeHead(404)
      reply.end()
    })
    const wss = new WebSocketServer({
      server: server,
      path: "/forkwise-chrome",
      maxPayload: 64 * 1024 * 1024,
      verifyClient: function (info) {
        const origin = String(info.origin || info.req.headers.origin || "")
        const ids = allowedIds()
        for (let i = 0; i < ids.length; i++) {
          if (origin === "chrome-extension://" + ids[i]) return true
        }
        return false
      }
    })
    wss.on("connection", function (ws) {
      self.attach(ws)
    })
    server.on("error", function () {
      self.listen(index + 1)
    })
    server.listen(PORTS[index], "127.0.0.1", function () {
      self.port = PORTS[index]
      self.server = server
    })
  }

  attach(ws) {
    const self = this
    if (this.socket && this.socket !== ws) {
      try {
        this.socket.close()
      } catch (problem) {}
    }
    this.socket = ws
    ws.on("message", function (raw) {
      let message = null
      try {
        message = JSON.parse(raw.toString())
      } catch (problem) {
        return
      }
      if (message.type === "hello") {
        self.browser = String(message.browser || "Chrome").slice(0, 60)
        self.version = String(message.version || "").slice(0, 20)
        self.onChange(self.state())
        return
      }
      if (message.type === "ping") return
      const waiting = self.pending[message.id]
      if (!waiting) return
      if (message.asking) {
        waiting.extend(message.site || "")
        return
      }
      delete self.pending[message.id]
      if (message.ok) waiting.resolve(message.result)
      else waiting.reject(new Error(message.error || "Your browser refused."))
    })
    ws.on("close", function () {
      if (self.socket !== ws) return
      self.socket = null
      const ids = Object.keys(self.pending)
      for (let i = 0; i < ids.length; i++) self.pending[ids[i]].reject(new Error("Your browser disconnected from Forkwise."))
      self.pending = {}
      self.onChange(self.state())
    })
    ws.on("error", function () {})
  }

  connected() {
    return !!(this.socket && this.socket.readyState === 1)
  }

  state() {
    return { connected: this.connected(), browser: this.connected() ? this.browser : "", version: this.version, port: this.port, id: EXTENSION_ID }
  }

  call(cmd, fields, timeoutMs) {
    const self = this
    if (!this.connected()) return Promise.reject(new Error("Your own browser is not connected."))
    const id = this.next++
    const message = { id: id, cmd: cmd }
    const keys = Object.keys(fields || {})
    for (let i = 0; i < keys.length; i++) message[keys[i]] = fields[keys[i]]
    return new Promise(function (resolve, reject) {
      let timer = null
      function arm(ms) {
        clearTimeout(timer)
        timer = setTimeout(function () {
          delete self.pending[id]
          reject(new Error("Your browser did not answer in time."))
        }, ms)
      }
      self.pending[id] = {
        resolve: function (value) {
          clearTimeout(timer)
          resolve(value)
        },
        reject: function (problem) {
          clearTimeout(timer)
          reject(problem)
        },
        extend: function (site) {
          arm(ASK_WAIT_MS)
          self.onChange(Object.assign(self.state(), { asking: site }))
        }
      }
      arm(timeoutMs || 25000)
      self.socket.send(JSON.stringify(message))
    })
  }

  async ensure() {
    if (this.connected()) return { ok: true, text: "Your own " + (this.browser || "browser") + " is connected." }
    return { ok: false, text: "The user's own browser is not connected. Ask them to add Forkwise for Chrome: in the Forkwise app open Settings, Computer, Your own Chrome, and follow the three steps. Until then use browser builtin." }
  }

  async tabs() {
    const list = await this.call("tabs", {}, 10000)
    return list || []
  }

  async newTab(url) {
    const answer = await this.call("newTab", { url: url || "about:blank" }, 20000)
    return answer.id
  }

  async activate(id) {
    await this.call("activate", { tab: id }, 10000)
  }

  async close(id) {
    await this.call("close", { tab: id }, 10000)
  }

  async send(id, method, params, timeoutMs) {
    return this.call("cdp", { tab: id, method: method, params: params || {} }, timeoutMs || 25000)
  }

  release() {
    if (this.connected()) this.call("release", {}, 5000).catch(function () {})
  }
}

module.exports = { ExtensionDriver, EXTENSION_ID }
