const path = require("path")
const { BrowserWindow, WebContentsView, session, ipcMain } = require("electron")

const TOOLBAR = 86
const PARTITION = "persist:forkwise-browser"

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () {
      reject(new Error("The browser did not answer in time."))
    }, ms)
    promise.then(function (value) {
      clearTimeout(timer)
      resolve(value)
    }, function (problem) {
      clearTimeout(timer)
      reject(problem)
    })
  })
}

class BuiltinDriver {
  constructor() {
    this.name = "builtin"
    this.win = null
    this.items = []
    this.active = ""
    this.counter = 0
    this.wired = false
  }

  wire() {
    if (this.wired) return
    this.wired = true
    const self = this
    ipcMain.on("browser:new", function () {
      self.openTab("about:blank")
    })
    ipcMain.on("browser:switch", function (event, id) {
      self.activate(id)
    })
    ipcMain.on("browser:close", function (event, id) {
      self.closeTab(id)
    })
    ipcMain.on("browser:go", function (event, text) {
      self.navigateActive(text)
    })
    ipcMain.on("browser:back", function () {
      const tab = self.find(self.active)
      if (tab && tab.view.webContents.navigationHistory.canGoBack()) tab.view.webContents.navigationHistory.goBack()
    })
    ipcMain.on("browser:forward", function () {
      const tab = self.find(self.active)
      if (tab && tab.view.webContents.navigationHistory.canGoForward()) tab.view.webContents.navigationHistory.goForward()
    })
    ipcMain.on("browser:reload", function () {
      const tab = self.find(self.active)
      if (tab) tab.view.webContents.reload()
    })
    ipcMain.on("browser:ready", function () {
      self.push()
    })
  }

  find(id) {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].id === id) return this.items[i]
    }
    return null
  }

  show() {
    this.makeWindow()
    if (this.win.isMinimized()) this.win.restore()
    this.win.show()
    this.win.focus()
  }

  makeWindow() {
    if (this.win && !this.win.isDestroyed()) return
    this.wire()
    const ses = session.fromPartition(PARTITION)
    ses.setUserAgent(ses.getUserAgent().replace(/\sElectron\/\S+/, "").replace(/\sForkwise\/\S+/i, ""))
    const self = this
    this.win = new BrowserWindow({
      width: 1180,
      height: 780,
      minWidth: 640,
      minHeight: 420,
      title: "Forkwise browser",
      backgroundColor: "#11110f",
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "..", "preload-browser.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    this.win.removeMenu()
    this.win.loadFile(path.join(__dirname, "..", "renderer", "browser.html"))
    this.win.on("resize", function () {
      self.layout()
    })
    this.win.on("closed", function () {
      self.items = []
      self.active = ""
      self.win = null
    })
  }

  layout() {
    if (!this.win || this.win.isDestroyed()) return
    const size = this.win.getContentBounds()
    for (let i = 0; i < this.items.length; i++) {
      const view = this.items[i].view
      view.setBounds({ x: 0, y: TOOLBAR, width: size.width, height: Math.max(size.height - TOOLBAR, 10) })
      view.setVisible(this.items[i].id === this.active)
    }
  }

  push() {
    if (!this.win || this.win.isDestroyed()) return
    this.win.webContents.send("browser:tabs", { active: this.active, tabs: this.list() })
  }

  list() {
    const result = []
    for (let i = 0; i < this.items.length; i++) {
      const wc = this.items[i].view.webContents
      result.push({ id: this.items[i].id, title: wc.getTitle() || "", url: wc.getURL() || "", loading: wc.isLoading() })
    }
    return result
  }

  async ensure() {
    const created = !this.win || this.win.isDestroyed()
    this.makeWindow()
    if (created) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 300)
      })
      this.win.show()
      await this.openTab("about:blank")
    } else if (!this.win.isVisible()) {
      this.win.show()
    }
    return { ok: true, text: "The Forkwise browser window is open." }
  }

  async tabs() {
    return this.list()
  }

  async newTab(url) {
    if (this.items.length === 1 && url && url !== "about:blank") {
      const only = this.items[0].view.webContents
      if (only.getURL() === "about:blank" || only.getURL() === "") {
        this.active = this.items[0].id
        only.loadURL(url).catch(function () {})
        this.layout()
        this.push()
        return this.items[0].id
      }
    }
    return this.openTab(url)
  }

  async openTab(url) {
    this.makeWindow()
    this.counter = this.counter + 1
    const id = "tab" + this.counter + "-" + Math.random().toString(16).slice(2, 8)
    const view = new WebContentsView({
      webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true }
    })
    const wc = view.webContents
    const self = this
    wc.setWindowOpenHandler(function (details) {
      self.openTab(details.url)
      return { action: "deny" }
    })
    const events = ["page-title-updated", "did-navigate", "did-navigate-in-page", "did-start-loading", "did-stop-loading"]
    for (let i = 0; i < events.length; i++) {
      wc.on(events[i], function () {
        self.push()
      })
    }
    try {
      wc.debugger.attach("1.3")
    } catch (problem) {}
    this.win.contentView.addChildView(view)
    this.items.push({ id: id, view: view })
    this.active = id
    this.layout()
    if (url && url !== "about:blank") {
      wc.loadURL(url).catch(function () {})
    } else {
      wc.loadURL("about:blank").catch(function () {})
    }
    this.push()
    return id
  }

  navigateActive(text) {
    const tab = this.find(this.active)
    if (!tab) return
    let value = String(text || "").trim()
    if (!value) return
    if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      if (value.indexOf(" ") === -1 && value.indexOf(".") > 0) value = "https://" + value
      else value = "https://www.google.com/search?q=" + encodeURIComponent(value)
    }
    tab.view.webContents.loadURL(value).catch(function () {})
  }

  async activate(id) {
    if (!this.find(id)) return
    this.active = id
    this.layout()
    this.push()
  }

  async close(id) {
    this.closeTab(id)
  }

  closeTab(id) {
    const tab = this.find(id)
    if (!tab) return
    this.items = this.items.filter(function (item) {
      return item.id !== id
    })
    try {
      this.win.contentView.removeChildView(tab.view)
    } catch (problem) {}
    try {
      tab.view.webContents.debugger.detach()
    } catch (problem) {}
    tab.view.webContents.close()
    if (this.active === id) this.active = this.items.length ? this.items[this.items.length - 1].id : ""
    this.layout()
    this.push()
  }

  async send(id, method, params, timeoutMs) {
    const tab = this.find(id)
    if (!tab) throw new Error("No such tab.")
    const wc = tab.view.webContents
    if (!wc.debugger.isAttached()) wc.debugger.attach("1.3")
    if (method === "Page.captureScreenshot") {
      const image = await withTimeout(wc.capturePage(), timeoutMs || 25000)
      return { data: image.toPNG().toString("base64") }
    }
    return withTimeout(wc.debugger.sendCommand(method, params || {}), timeoutMs || 25000)
  }
}

module.exports = { BuiltinDriver }
