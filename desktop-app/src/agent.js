const opsLib = require("./ops")
const shell = require("./shell")
const { Connection } = require("./connection")

const NEVER_ALWAYS = ["shell", "write_file", "kill", "download"]

class Agent {
  constructor(options) {
    this.host = options.host
    this.config = options.config
    this.ask = options.ask
    this.emit = options.onActivity
    this.status = options.onStatus
    this.paused = false
    this.generation = 0
    this.counter = 0
    this.chains = { shell: Promise.resolve(), gui: Promise.resolve(), files: Promise.resolve() }
    const self = this
    this.ops = opsLib.create(options.host, {
      onShellData: function (text) {
        self.emit({ type: "shell-data", text: text })
      }
    })
    this.connection = new Connection({
      version: options.host.version,
      onStatus: function (state) {
        self.state = state
        self.status(state)
      },
      onMessage: function (message) {
        self.receive(message)
      }
    })
    this.state = { state: "off", name: "", note: "" }
  }

  connect() {
    const token = this.config.get("token")
    if (!token) {
      this.connection.stop()
      return
    }
    this.connection.start(this.config.get("server"), token)
  }

  disconnect() {
    this.connection.stop()
  }

  setPaused(value) {
    this.paused = value
    this.status(this.state)
  }

  panic() {
    this.generation = this.generation + 1
    this.paused = true
    const killed = shell.stopAll()
    shell.stopJobs()
    this.status(this.state)
    return killed
  }

  keyOf(message) {
    return message.action
  }

  async receive(message) {
    this.counter = this.counter + 1
    const entry = { type: "activity", id: this.counter, time: Date.now(), action: message.action, text: opsLib.describe(message), status: "running", result: "", image: "" }
    this.emit(entry)
    const self = this
    function finish(ok, text, image) {
      entry.status = ok ? "ok" : "fail"
      entry.result = String(text || "").slice(0, 4000)
      entry.image = image || ""
      self.emit(entry)
    }
    if (this.paused) {
      const text = "The user paused Forkwise Desktop. Ask them to press Resume."
      finish(false, text)
      this.connection.reply({ id: message.id, ok: false, text: text })
      return
    }
    const folder = opsLib.usesFolder(message)
    const folderAction = String(message.action).startsWith("fs_") || String(message.action).startsWith("job_")
    if (folderAction && !message.root) {
      const text = "A project folder is required for this action."
      finish(false, text)
      this.connection.reply({ id: message.id, ok: false, text: text })
      return
    }
    if (folder && !this.host.isTrustedRoot(message.root)) {
      const text = "This folder was not opened from the Forkwise app on this computer. Choose it again with Work in folder."
      finish(false, text)
      this.connection.reply({ id: message.id, ok: false, text: text })
      return
    }
    const key = this.keyOf(message)
    if (!folder && this.config.get("confirm") && !opsLib.isReadOnly(message) && this.config.get("always").indexOf(key) === -1) {
      const canAlways = NEVER_ALWAYS.indexOf(message.action) === -1
      entry.status = "asking"
      this.emit(entry)
      const answer = await this.ask(entry.text, canAlways)
      if (answer === "always") this.config.set("always", this.config.get("always").concat([key]))
      if (answer === "deny") {
        const text = "The user refused this on their computer."
        finish(false, text)
        this.connection.reply({ id: message.id, ok: false, text: text })
        return
      }
      entry.status = "running"
      this.emit(entry)
    }
    let lane = "gui"
    if (message.action === "shell") lane = "shell"
    if (folderAction) lane = "files"
    const generation = this.generation
    const job = this.chains[lane].then(async function () {
      if (generation !== self.generation) {
        return { ok: false, text: "Stopped by the user (emergency stop)." }
      }
      return self.ops.handle(message)
    })
    this.chains[lane] = job.catch(function () {})
    const reply = await job
    let shown = reply.text
    if (folderAction) shown = String(reply.text || "").slice(0, 400)
    finish(reply.ok, shown, folderAction ? "" : reply.image)
    const out = { id: message.id, ok: reply.ok, text: reply.text }
    if (reply.image) out.image = reply.image
    if (reply.data) out.data = reply.data
    this.connection.reply(out)
  }
}

module.exports = { Agent }
