const path = require("path")
const os = require("os")
const fs = require("fs")
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, globalShortcut, shell, clipboard, screen, desktopCapturer, Notification } = require("electron")
const configLib = require("./src/config")
const { Agent } = require("./src/agent")
const { BuiltinDriver } = require("./src/builtinBrowser")
const { ChromeDriver } = require("./src/chromeDriver")

if (process.env.FW_USERDATA) app.setPath("userData", process.env.FW_USERDATA)

const HOTKEY = "CommandOrControl+Alt+Shift+X"
const SITE = "https://forkwiseai.com"
const WEB = (process.env.FORKWISE_WEB || SITE).replace(/\/+$/, "")

let appWin = null
let background = false
let win = null
let tray = null
let agent = null
let config = null
let quitting = false
const builtin = new BuiltinDriver()
const chrome = new ChromeDriver()
const feed = []

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

function iconImage() {
  return nativeImage.createFromPath(path.join(__dirname, "build", "icon.png"))
}

function sameFolder(a, b) {
  const one = path.resolve(a)
  const two = path.resolve(b)
  if (process.platform === "win32" || process.platform === "darwin") return one.toLowerCase() === two.toLowerCase()
  return one === two
}

function trustedFolders() {
  return (config.get("roots") || []).filter(function (item) {
    return typeof item === "string" && item !== ""
  })
}

function allowedOrigins() {
  const list = []
  try {
    list.push(new URL(WEB).origin)
    const url = new URL(WEB)
    if (url.hostname === "forkwiseai.com") list.push("https://www.forkwiseai.com")
  } catch (problem) {}
  return list
}

function fromApp(event) {
  try {
    const frame = event.senderFrame
    return !!frame && allowedOrigins().indexOf(new URL(frame.url).origin) >= 0
  } catch (problem) {
    return false
  }
}

const host = {
  version: app.getVersion(),
  isTrustedRoot: function (root) {
    const list = trustedFolders()
    for (let i = 0; i < list.length; i++) {
      if (sameFolder(list[i], String(root || ""))) return true
    }
    return false
  },
  openExternal: function (url) {
    return shell.openExternal(url)
  },
  openPath: function (target) {
    return shell.openPath(target)
  },
  clipboardRead: function () {
    return clipboard.readText()
  },
  clipboardWrite: function (text) {
    clipboard.writeText(text)
  },
  notify: function (title, body) {
    if (Notification.isSupported()) new Notification({ title: title, body: body }).show()
  },
  displays: function () {
    const main = screen.getPrimaryDisplay()
    return screen.getAllDisplays().map(function (d) {
      return { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor), scale: d.scaleFactor, primary: d.id === main.id }
    })
  },
  inputBounds: function () {
    const d = screen.getPrimaryDisplay()
    if (process.platform === "darwin") return { left: d.bounds.x, top: d.bounds.y, width: d.bounds.width, height: d.bounds.height }
    return { left: Math.round(d.bounds.x * d.scaleFactor), top: Math.round(d.bounds.y * d.scaleFactor), width: Math.round(d.bounds.width * d.scaleFactor), height: Math.round(d.bounds.height * d.scaleFactor) }
  },
  capture: async function (maxWidth) {
    const d = screen.getPrimaryDisplay()
    const full = { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) }
    const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: full })
    let picked = sources[0]
    for (let i = 0; i < sources.length; i++) {
      if (sources[i].display_id === String(d.id)) picked = sources[i]
    }
    if (!picked || picked.thumbnail.isEmpty()) {
      throw new Error("Screen capture is not allowed. On macOS open System Settings, Privacy and Security, Screen Recording, and allow Forkwise. On Linux use an X11 session.")
    }
    let image = picked.thumbnail
    const size = image.getSize()
    if (size.width > maxWidth) image = image.resize({ width: maxWidth, quality: "best" })
    const finalSize = image.getSize()
    return { base64: image.toPNG().toString("base64"), width: finalSize.width, height: finalSize.height }
  },
  driver: function (name) {
    return name === "chrome" ? chrome : builtin
  }
}

function snapshot() {
  const status = agent ? agent.state : { state: "off", name: "", note: "" }
  return {
    status: status,
    paused: agent ? agent.paused : false,
    confirm: !!config.get("confirm"),
    autoStart: !!config.get("autoStart"),
    server: config.get("server"),
    hasToken: !!config.get("token"),
    version: app.getVersion(),
    hotkey: HOTKEY.replace("CommandOrControl", process.platform === "darwin" ? "Cmd" : "Ctrl")
  }
}

function sendState() {
  if (win && !win.isDestroyed()) win.webContents.send("fw:state", snapshot())
  updateTray()
}

function sendActivity(entry) {
  if (entry.type === "shell-data") return
  const copy = Object.assign({}, entry)
  let found = false
  for (let i = 0; i < feed.length; i++) {
    if (feed[i].id === copy.id) {
      feed[i] = copy
      found = true
    }
  }
  if (!found) feed.push(copy)
  while (feed.length > 150) feed.shift()
  if (win && !win.isDestroyed()) win.webContents.send("fw:activity", copy)
}

async function askUser(text, canAlways) {
  showWindow()
  const buttons = canAlways ? ["Allow", "Always allow this kind", "Deny"] : ["Allow", "Deny"]
  const parent = appWin && !appWin.isDestroyed() && appWin.isVisible() ? appWin : win
  const answer = await dialog.showMessageBox(parent, {
    type: "question",
    buttons: buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    title: "Forkwise agent wants to",
    message: "Your Forkwise agent wants to:",
    detail: text.slice(0, 600)
  })
  if (answer.response === 0) return "allow"
  if (canAlways && answer.response === 1) return "always"
  return "deny"
}

function createWindow(hidden) {
  win = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 460,
    minHeight: 520,
    title: "Forkwise",
    backgroundColor: "#11110f",
    show: !hidden,
    autoHideMenuBar: true,
    icon: iconImage(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.removeMenu()
  win.loadFile(path.join(__dirname, "renderer", "index.html"))
  win.on("close", function (event) {
    if (!quitting) {
      event.preventDefault()
      win.hide()
    }
  })
}

function createAppWindow() {
  appWin = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    title: "Forkwise",
    backgroundColor: "#f5f2ec",
    icon: iconImage(),
    webPreferences: {
      preload: path.join(__dirname, "preload-app.js"),
      partition: "persist:forkwise-app",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  const view = appWin.webContents
  view.setUserAgent(view.getUserAgent() + " ForkwiseDesktop/" + app.getVersion())
  view.setWindowOpenHandler(function (details) {
    if (/^https?:/i.test(details.url)) shell.openExternal(details.url)
    return { action: "deny" }
  })
  view.on("did-fail-load", function (event, code, text, url, isMain) {
    if (!isMain || code === -3) return
    appWin.loadFile(path.join(__dirname, "renderer", "offline.html"), { query: { to: WEB + "/app", why: String(text || "") } })
  })
  appWin.on("closed", function () {
    appWin = null
    if (!background && !quitting) {
      quitting = true
      app.quit()
    }
  })
  appWin.loadURL(WEB + "/app")
}

function showApp() {
  if (!appWin || appWin.isDestroyed()) createAppWindow()
  if (appWin.isMinimized()) appWin.restore()
  appWin.show()
  appWin.focus()
}

function openFolderMenu() {
  showApp()
  appWin.webContents.send("fwd:open-folder")
}

function buildMenu() {
  const mac = process.platform === "darwin"
  const template = []
  if (mac) template.push({ role: "appMenu" })
  template.push({
    label: "File",
    submenu: [
      { label: "New chat", accelerator: "CommandOrControl+N", click: function () {
        showApp()
        appWin.loadURL(WEB + "/app")
      } },
      { label: "Open folder...", accelerator: "CommandOrControl+O", click: openFolderMenu },
      { type: "separator" },
      { label: "Computer activity and settings", click: showWindow },
      { type: "separator" },
      mac ? { role: "close" } : { role: "quit" }
    ]
  })
  template.push({ role: "editMenu" })
  template.push({
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  })
  template.push({ role: "windowMenu" })
  template.push({
    role: "help",
    submenu: [
      { label: "Forkwise website", click: function () {
        shell.openExternal(SITE)
      } },
      { label: "Documentation", click: function () {
        shell.openExternal(SITE + "/docs")
      } },
      { label: "Emergency stop (" + snapshot().hotkey + ")", click: emergencyStop }
    ]
  })
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function showWindow() {
  if (!win || win.isDestroyed()) createWindow(false)
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function updateTray() {
  if (!tray) return
  const paused = agent ? agent.paused : false
  const status = agent ? agent.state.state : "off"
  const label = status === "online" ? (paused ? "Paused" : "Connected") : status === "connecting" ? "Connecting..." : "Not connected"
  const menu = Menu.buildFromTemplate([
    { label: "Forkwise Desktop: " + label, enabled: false },
    { type: "separator" },
    { label: "Open Forkwise", click: showApp },
    { label: "Computer activity", click: showWindow },
    { label: paused ? "Resume agent" : "Pause agent", click: function () {
      agent.setPaused(!paused)
    } },
    { label: "Open Forkwise browser", click: function () {
      builtin.show()
      builtin.ensure()
    } },
    { label: "Emergency stop", click: emergencyStop },
    { type: "separator" },
    { label: "Quit", click: function () {
      quitting = true
      app.quit()
    } }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip("Forkwise Desktop: " + label)
}

function emergencyStop() {
  const killed = agent.panic()
  host.notify("Forkwise stopped", "The agent is paused" + (killed ? " and " + killed + " running command(s) were stopped." : "."))
  sendState()
}

function applyLink(argv) {
  let link = ""
  for (let i = 0; i < argv.length; i++) {
    if (typeof argv[i] === "string" && argv[i].startsWith("forkwise://")) link = argv[i]
  }
  if (!link) return
  let url
  try {
    url = new URL(link)
  } catch (problem) {
    return
  }
  const token = url.searchParams.get("token") || ""
  const server = (url.searchParams.get("server") || "").replace(/\/+$/, "")
  const okServer = server.startsWith("https://") || server.startsWith("http://localhost") || server.startsWith("http://127.0.0.1")
  if (url.hostname !== "pair" || !token.startsWith("fwd_") || !okServer) return
  showWindow()
  dialog.showMessageBox(win, {
    type: "question",
    buttons: ["Link this computer", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    title: "Link to Forkwise",
    message: "Link this computer to your Forkwise account?",
    detail: "Server: " + server + "\nAfter linking, your Forkwise agent can use this computer when you ask it to. You can pause it or press " + snapshot().hotkey + " to stop it at any time."
  }).then(function (answer) {
    if (answer.response !== 0) return
    config.set("token", token)
    config.set("server", server)
    agent.connect()
    sendState()
  })
}

function deviceStatus() {
  const state = agent ? agent.state : { state: "off" }
  return {
    linked: !!config.get("token"),
    deviceId: config.get("deviceId") || "",
    server: config.get("server"),
    online: state.state === "online",
    paused: agent ? agent.paused : false,
    hostname: os.hostname(),
    platform: process.platform,
    version: app.getVersion()
  }
}

function rememberFolder(folder) {
  const list = trustedFolders().filter(function (item) {
    return !sameFolder(item, folder)
  })
  list.unshift(folder)
  config.set("roots", list.slice(0, 40))
}

function wireBridge() {
  ipcMain.handle("fwd:status", function (event) {
    if (!fromApp(event)) return null
    return deviceStatus()
  })
  ipcMain.handle("fwd:link", function (event, info) {
    if (!fromApp(event)) return { ok: false, text: "Not allowed here." }
    const token = String((info && info.token) || "")
    const server = String((info && info.server) || "").replace(/\/+$/, "")
    const okServer = server.startsWith("https://") || server.startsWith("http://localhost") || server.startsWith("http://127.0.0.1")
    if (!token.startsWith("fwd_") || !okServer) return { ok: false, text: "Bad link data." }
    config.set("token", token)
    config.set("server", server)
    config.set("deviceId", String((info && info.id) || ""))
    agent.connect()
    sendState()
    return { ok: true }
  })
  ipcMain.handle("fwd:pick", async function (event) {
    if (!fromApp(event)) return null
    const answer = await dialog.showOpenDialog(appWin, { title: "Choose the project folder", properties: ["openDirectory", "createDirectory"] })
    if (answer.canceled || answer.filePaths.length === 0) return null
    const folder = answer.filePaths[0]
    rememberFolder(folder)
    return { path: folder, name: path.basename(folder) || folder }
  })
  ipcMain.handle("fwd:recent", function (event) {
    if (!fromApp(event)) return []
    return trustedFolders().filter(function (item) {
      return fs.existsSync(item)
    }).slice(0, 8).map(function (item) {
      return { path: item, name: path.basename(item) || item }
    })
  })
  ipcMain.handle("fwd:activity", function (event) {
    if (!fromApp(event)) return false
    showWindow()
    return true
  })
}

function wireIpc() {
  ipcMain.handle("fw:state", function () {
    return { state: snapshot(), feed: feed }
  })
  ipcMain.handle("fw:connect", function (event, token, server) {
    const clean = String(token || "").trim()
    if (!clean) return { ok: false, text: "Paste the device token first." }
    config.set("token", clean)
    const base = String(server || "").trim().replace(/\/+$/, "")
    if (base) config.set("server", base)
    agent.connect()
    sendState()
    return { ok: true }
  })
  ipcMain.handle("fw:forget", function () {
    agent.disconnect()
    config.set("token", "")
    sendState()
    return { ok: true }
  })
  ipcMain.handle("fw:pause", function (event, value) {
    agent.setPaused(!!value)
    sendState()
  })
  ipcMain.handle("fw:confirm", function (event, value) {
    config.set("confirm", !!value)
    if (!value) config.set("always", [])
    sendState()
  })
  ipcMain.handle("fw:autostart", function (event, value) {
    config.set("autoStart", !!value)
    app.setLoginItemSettings({ openAtLogin: !!value, args: ["--hidden"] })
    sendState()
  })
  ipcMain.handle("fw:browser", function () {
    builtin.ensure().then(function () {
      builtin.show()
    })
  })
  ipcMain.handle("fw:panic", function () {
    emergencyStop()
  })
  ipcMain.handle("fw:site", function (event, where) {
    shell.openExternal(SITE + (where || ""))
  })
}

function startUpdater() {
  if (!app.isPackaged) return
  try {
    const updater = require("electron-updater").autoUpdater
    updater.on("error", function () {})
    updater.checkForUpdatesAndNotify().catch(function () {})
  } catch (problem) {}
}

app.on("second-instance", function (event, argv) {
  showApp()
  applyLink(argv)
})

app.on("activate", function () {
  showApp()
})

app.on("open-url", function (event, url) {
  event.preventDefault()
  if (agent) applyLink([url])
})

app.on("before-quit", function () {
  quitting = true
})

app.on("window-all-closed", function () {})

app.on("will-quit", function () {
  globalShortcut.unregisterAll()
  if (agent) agent.disconnect()
})

app.whenReady().then(function () {
  config = configLib.create(app.getPath("userData"))
  agent = new Agent({
    host: host,
    config: config,
    ask: askUser,
    onActivity: sendActivity,
    onStatus: sendState
  })
  app.setAsDefaultProtocolClient("forkwise")
  wireIpc()
  wireBridge()
  buildMenu()
  const hidden = process.argv.indexOf("--hidden") >= 0 && !!config.get("token")
  background = hidden
  createWindow(true)
  if (!hidden) showApp()
  try {
    tray = new Tray(iconImage().resize({ width: 18, height: 18 }))
    tray.on("click", showWindow)
  } catch (problem) {}
  globalShortcut.register(HOTKEY, emergencyStop)
  updateTray()
  agent.connect()
  applyLink(process.argv)
  startUpdater()
})
