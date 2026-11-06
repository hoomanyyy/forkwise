const os = require("os")
const { WebSocket } = require("ws")
const util = require("./util")

function socketUrl(base) {
  const clean = base.replace(/\/+$/, "")
  if (clean.startsWith("https://")) return "wss://" + clean.slice(8) + "/api/ws/desktop"
  if (clean.startsWith("http://")) return "ws://" + clean.slice(7) + "/api/ws/desktop"
  return "wss://" + clean + "/api/ws/desktop"
}

class Connection {
  constructor(options) {
    this.version = options.version
    this.onMessage = options.onMessage
    this.onStatus = options.onStatus
    this.ws = null
    this.stopped = true
    this.delay = 2
    this.timer = null
    this.server = ""
    this.token = ""
    this.name = ""
    this.extra = {}
  }

  setExtra(data) {
    this.extra = Object.assign({}, this.extra, data)
    this.sendStatus()
  }

  sendStatus() {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(Object.assign({ type: "status" }, this.extra)))
  }

  start(server, token) {
    this.stop()
    this.server = server
    this.token = token
    this.stopped = false
    this.delay = 2
    this.connect()
  }

  stop() {
    this.stopped = true
    clearTimeout(this.timer)
    if (this.ws) {
      try {
        this.ws.close()
      } catch (problem) {}
    }
    this.ws = null
    this.onStatus({ state: "off", name: "", note: "" })
  }

  connect() {
    if (this.stopped) return
    const self = this
    this.onStatus({ state: "connecting", name: "", note: "" })
    const ws = new WebSocket(socketUrl(this.server), { headers: { Authorization: "Bearer " + this.token }, maxPayload: 32 * 1024 * 1024 })
    this.ws = ws
    ws.on("open", function () {
      ws.send(JSON.stringify({ type: "hello", version: self.version, platform: os.type() + " " + os.release(), hostname: os.hostname(), user: util.userName() }))
    })
    ws.on("message", function (raw) {
      let message
      try {
        message = JSON.parse(raw.toString())
      } catch (problem) {
        return
      }
      if (message.type === "welcome") {
        self.delay = 2
        self.name = message.name || ""
        self.onStatus({ state: "online", name: self.name, note: "" })
        self.sendStatus()
        return
      }
      if (message.id === undefined) return
      self.onMessage(message)
    })
    ws.on("unexpected-response", function (request, reply) {
      if (reply.statusCode === 403 || reply.statusCode === 401) {
        self.stopped = true
        self.onStatus({ state: "refused", name: "", note: "The token was refused. Create a new one in Forkwise, Settings, Computer." })
      }
    })
    ws.on("close", function (code) {
      if (self.ws !== ws) return
      if (code === 4401) {
        self.stopped = true
        self.onStatus({ state: "refused", name: "", note: "The token was refused. Create a new one in Forkwise, Settings, Computer." })
        return
      }
      if (code === 4409) {
        self.stopped = true
        self.onStatus({ state: "replaced", name: "", note: "Another copy of Forkwise Desktop connected with the same token." })
        return
      }
      self.retry("Connection lost")
    })
    ws.on("error", function () {})
  }

  retry(note) {
    if (this.stopped) return
    const self = this
    this.onStatus({ state: "connecting", name: "", note: note + ". Retrying in " + this.delay + "s" })
    clearTimeout(this.timer)
    this.timer = setTimeout(function () {
      self.connect()
    }, this.delay * 1000)
    this.delay = Math.min(this.delay * 2, 60)
  }

  reply(data) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(data))
  }
}

module.exports = { Connection }
