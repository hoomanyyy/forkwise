const path = require("path")
const os = require("os")
const fs = require("fs")
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  globalShortcut,
  shell,
  clipboard,
  screen,
  desktopCapturer,
  Notification,
  session,
  nativeTheme
} = require("electron")

const utilLib = require("./src/util")
const configLib = require("./src/config")
const { Agent } = require("./src/agent")
const { BuiltinDriver } = require("./src/builtinBrowser")
const { ChromeDriver } = require("./src/chromeDriver")
const apiLib = require("./src/api")
const appsLib = require("./src/apps")
const termLib = require("./src/terminal")
const gitLib = require("./src/git")

if (process.env.FW_USERDATA) app.setPath("userData", process.env.FW_USERDATA)

const VERSION = app.getVersion()
const PARTITION = "persist:forkwise"
const DEFAULT_SITE = "https://forkwiseai.com"
const HOTKEY = "CommandOrControl+Alt+Shift+X"
const READ_ONLY_ACTIONS = ["info", "screenshot", "wait", "ui_elements", "windows", "processes", "fs_read", "fs_list", "fs_glob", "fs_grep", "job_output", "tabs", "read", "html", "elements"]

let win = null
let loginWin = null
let tray = null
let agent = null
let config = null
let prefs = null
let api = null
let ses = null
let quitting = false
let deviceState = { state: "off", name: "", note: "" }
let feed = []
let activeStream = null
let activeRunId = ""
let terminal = null
let pendingAsks = new Map()
let askCounter = 0

const builtin = new BuiltinDriver()
const chrome = new ChromeDriver()

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

/* ---------------------------------------------------------------- helpers */

function site() {
  return String(config.get("web") || DEFAULT_SITE).replace(/\/+$/, "")
}

function serverBase() {
  return String(config.get("server") || "https://api.forkwiseai.com").replace(/\/+$/, "")
}

function iconImage() {
  const file = path.join(__dirname, "build", "icon.png")
  try {
    const image = nativeImage.createFromPath(file)
    if (!image.isEmpty()) return image
  } catch (problem) {}
  return nativeImage.createEmpty()
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}

function themeNow() {
  const wanted = prefs.get("theme") || "system"
  if (wanted === "light" || wanted === "dark") return wanted
  return nativeTheme.shouldUseDarkColors ? "dark" : "light"
}

function applyThemeSource() {
  const wanted = prefs.get("theme") || "system"
  nativeTheme.themeSource = wanted === "light" || wanted === "dark" ? wanted : "system"
  if (win && !win.isDestroyed()) win.setBackgroundColor(themeNow() === "dark" ? "#151413" : "#f7f7f7")
}

function roots() {
  const list = config.get("roots") || []
  return list.filter(function (item) {
    return typeof item === "string" && item.length > 0
  })
}

function addRoot(folder) {
  if (!folder) return
  const clean = path.resolve(folder)
  const list = roots().filter(function (item) {
    return path.resolve(item) !== clean
  })
  list.unshift(clean)
  config.set("roots", list.slice(0, 40))
}

function isTrustedRoot(folder) {
  if (!folder) return true
  const clean = path.resolve(String(folder))
  return roots().some(function (item) {
    return path.resolve(item) === clean
  })
}

/* ------------------------------------------------------------- device host */

const host = {
  version: VERSION,
  openExternal: function (target) {
    const value = String(target || "")
    if (/^(https?:|mailto:|ms-settings:|x-apple\.systempreferences|file:)/i.test(value)) shell.openExternal(value)
    else shell.openPath(value)
  },
  openPath: function (target) {
    return shell.openPath(String(target || ""))
  },
  clipboardRead: function () {
    return clipboard.readText()
  },
  clipboardWrite: function (text) {
    clipboard.writeText(String(text == null ? "" : text))
  },
  notify: function (title, text) {
    try {
      new Notification({ title: String(title || "Forkwise"), body: String(text || ""), icon: iconImage() }).show()
    } catch (problem) {}
  },
  displays: function () {
    return screen.getAllDisplays().map(function (display) {
      return { id: display.id, bounds: display.bounds, scale: display.scaleFactor, primary: display.id === screen.getPrimaryDisplay().id }
    })
  },
  inputBounds: function () {
    const display = screen.getPrimaryDisplay()
    if (process.platform === "darwin") {
      return { left: display.bounds.x, top: display.bounds.y, width: display.bounds.width, height: display.bounds.height }
    }
    return {
      left: Math.round(display.bounds.x * display.scaleFactor),
      top: Math.round(display.bounds.y * display.scaleFactor),
      width: Math.round(display.bounds.width * display.scaleFactor),
      height: Math.round(display.bounds.height * display.scaleFactor)
    }
  },
  capture: async function (maxWidth) {
    const display = screen.getPrimaryDisplay()
    const full = { width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor) }
    const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: full })
    let picked = sources[0]
    for (let index = 0; index < sources.length; index++) {
      if (sources[index].display_id === String(display.id)) picked = sources[index]
    }
    if (!picked || picked.thumbnail.isEmpty()) {
      throw new Error("Screen capture is not allowed. Allow screen recording for Forkwise in the system settings.")
    }
    let image = picked.thumbnail
    const size = image.getSize()
    if (size.width > maxWidth) image = image.resize({ width: maxWidth, quality: "best" })
    const finalSize = image.getSize()
    return { base64: image.toPNG().toString("base64"), width: finalSize.width, height: finalSize.height }
  },
  driver: function (name) {
    return name === "chrome" ? chrome : builtin
  },
  isTrustedRoot: isTrustedRoot,
  ask: askUser
}

function safeCapture(format) {
  return host.capture(1440).then(function (shot) {
    return { ok: true, data: (format === "raw" ? "" : "data:image/png;base64,") + shot.base64, width: shot.width, height: shot.height }
  })
}

/* Approvals that come from the device itself (the app level guard). */
function askUser(text, canAlways) {
  const id = "ask_" + ++askCounter
  send("fw:device:ask", { id: id, text: text, canAlways: !!canAlways })
  return new Promise(function (resolve) {
    const timer = setTimeout(function () {
      if (!pendingAsks.has(id)) return
      pendingAsks.delete(id)
      resolve("deny")
    }, 10 * 60 * 1000)
    pendingAsks.set(id, function (value) {
      clearTimeout(timer)
      pendingAsks.delete(id)
      resolve(value)
    })
    if (!win || win.isDestroyed() || !win.isVisible()) {
      const buttons = canAlways ? ["Allow", "Always allow", "Deny"] : ["Allow", "Deny"]
      dialog
        .showMessageBox({
          type: "question",
          buttons: buttons,
          defaultId: 0,
          cancelId: buttons.length - 1,
          title: "Forkwise wants to use this computer",
          message: "Your Forkwise agent wants to:",
          detail: String(text || "").slice(0, 600)
        })
        .then(function (answer) {
          const pick = answer.response === 0 ? "allow" : canAlways && answer.response === 1 ? "always" : "deny"
          const resolveAsk = pendingAsks.get(id)
          if (resolveAsk) resolveAsk(pick)
        })
    }
  })
}

function deviceActivity(event) {
  const copy = Object.assign({ time: Date.now() }, event)
  feed.push(copy)
  while (feed.length > 120) feed.shift()
  send("fw:device:activity", copy)
}

/* ------------------------------------------------------------------- auth */

function authLost() {
  send("fw:auth:lost", {})
}

function buildApi() {
  api = apiLib.create({
    session: ses,
    base: serverBase(),
    onUnauthorized: function () {
      authLost()
    }
  })
  return api
}

async function currentUser() {
  try {
    const data = await api.call("/api/auth/me")
    return data && data.user ? data : null
  } catch (problem) {
    if (problem.status === 401) return null
    throw problem
  }
}

function openLogin() {
  if (loginWin && !loginWin.isDestroyed()) {
    loginWin.focus()
    return
  }
  loginWin = new BrowserWindow({
    width: 520,
    height: 760,
    minWidth: 420,
    minHeight: 600,
    parent: win && !win.isDestroyed() ? win : undefined,
    modal: false,
    title: "Sign in to Forkwise",
    backgroundColor: themeNow() === "dark" ? "#151413" : "#f7f7f7",
    autoHideMenuBar: true,
    webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false }
  })
  loginWin.setMenu(null)
  loginWin.loadURL(site() + "/login")
  const started = Date.now()
  const timer = setInterval(async function () {
    if (!loginWin || loginWin.isDestroyed()) {
      clearInterval(timer)
      return
    }
    if (Date.now() - started > 8 * 60 * 1000) {
      clearInterval(timer)
      return
    }
    try {
      const data = await api.call("/api/auth/me")
      if (data && data.user) {
        clearInterval(timer)
        loginWin.close()
        const boot = await bootPayload()
        send("fw:auth:ready", boot)
        await ensureDevice().catch(function () {})
      }
    } catch (problem) {}
  }, 1500)
  loginWin.on("closed", function () {
    clearInterval(timer)
    loginWin = null
  })
}

/* ------------------------------------------------------------ device link */

async function ensureDevice() {
  if (!config.get("token") || !config.get("deviceId")) await pairDevice()
  else {
    try {
      const list = await api.call("/api/desktop")
      const found = (list.devices || []).some(function (item) {
        return item.id === config.get("deviceId")
      })
      if (!found) await pairDevice()
    } catch (problem) {}
  }
  if (agent) {
    agent.connect()
  }
}

async function pairDevice() {
  const name = os.hostname() || "My computer"
  const data = await api.call("/api/desktop/pair", { method: "POST", body: { name: name } })
  config.set("token", data.token)
  config.set("deviceId", data.device ? data.device.id : data.id)
  return data
}

/* ------------------------------------------------------------------ agent */

function buildAgent() {
  agent = new Agent({
    host: host,
    config: {
      get: function (key) {
        if (key === "token") return config.get("token")
        if (key === "server") return serverBase()
        return config.get(key)
      }
    },
    ask: askUser,
    onActivity: deviceActivity,
    onStatus: function (state) {
      deviceState = state
      send("fw:device:status", state)
    }
  })
}

/* ------------------------------------------------------------------- runs */

// One live stream at a time. Each new stream gets a number, and events from an
// older stream that is still closing are dropped, so nothing shows twice. A
// dropped connection picks up where it left off instead of starting over.
let streamNumber = 0

function watchRun(runId) {
  if (!runId) return
  streamNumber += 1
  const number = streamNumber
  if (activeStream) {
    try {
      activeStream.close()
    } catch (problem) {}
    activeStream = null
  }
  activeRunId = runId
  let seen = 0
  let tries = 0
  let finished = false
  let waiting = false

  function open() {
    api
      .stream(
        "/api/runs/" + encodeURIComponent(runId) + "/events?after=" + seen,
        function (event) {
          if (number !== streamNumber) return
          seen += 1
          tries = 0
          send("fw:run:event", Object.assign({ run_id: runId }, event))
          if (event.type === "done") {
            finished = true
            activeRunId = ""
          }
        },
        {
          onError: function (problem) {
            if (number !== streamNumber || finished) return
            retry(problem)
          },
          onClose: function () {
            // the server ends the stream when the run is over; an early end is a drop
            if (number !== streamNumber || finished) return
            retry(new Error("The live connection closed early"))
          }
        }
      )
      .then(function (handle) {
        if (number === streamNumber && !finished) activeStream = handle
        else handle.close()
      })
      .catch(function (problem) {
        if (number !== streamNumber) return
        if (problem && problem.status === 404) {
          // the run is already over on the server
          finished = true
          activeRunId = ""
          send("fw:run:event", { run_id: runId, type: "done", status: "gone" })
          return
        }
        if (problem && problem.status === 401) {
          activeRunId = ""
          send("fw:run:error", { run_id: runId, message: "Signed out. Sign in again to keep watching the agent." })
          return
        }
        retry(problem)
      })
  }

  function retry(problem) {
    if (waiting) return
    activeStream = null
    tries += 1
    if (tries > 6) {
      activeRunId = ""
      send("fw:run:error", { run_id: runId, message: (problem && problem.message) || "The live connection dropped" })
      return
    }
    waiting = true
    setTimeout(function () {
      waiting = false
      if (number === streamNumber && !finished) open()
    }, Math.min(8000, 700 * tries))
  }

  open()
}

function stopStream() {
  streamNumber += 1
  activeRunId = ""
  if (!activeStream) return
  try {
    activeStream.close()
  } catch (problem) {}
  activeStream = null
}

/* ----------------------------------------------------------------- window */

function createWindow() {
  const isMac = process.platform === "darwin"
  const bounds = prefs.get("bounds") || { width: 1220, height: 820 }
  win = new BrowserWindow({
    width: Math.max(820, bounds.width || 1220),
    height: Math.max(560, bounds.height || 820),
    x: bounds.x,
    y: bounds.y,
    minWidth: 820,
    minHeight: 560,
    show: false,
    frame: isMac,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    backgroundColor: themeNow() === "dark" ? "#151413" : "#f7f7f7",
    title: "Forkwise",
    icon: iconImage(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
      backgroundThrottling: false
    }
  })
  win.loadFile(path.join(__dirname, "renderer", "index.html"))
  win.once("ready-to-show", function () {
    win.show()
    win.focus()
  })
  win.on("resize", saveBounds)
  win.on("move", saveBounds)
  win.on("maximize", function () {
    send("fw:window:state", { maximized: true })
  })
  win.on("unmaximize", function () {
    send("fw:window:state", { maximized: false })
  })
  win.on("close", function (event) {
    if (!quitting && prefs.get("background")) {
      event.preventDefault()
      win.hide()
      return
    }
    quitting = true
  })
  win.on("closed", function () {
    win = null
  })
  win.webContents.setWindowOpenHandler(function (details) {
    if (/^https?:/i.test(details.url)) shell.openExternal(details.url)
    return { action: "deny" }
  })
  win.webContents.on("will-navigate", function (event, url) {
    if (url.indexOf("file://") !== 0) {
      event.preventDefault()
      if (/^https?:/i.test(url)) shell.openExternal(url)
    }
  })
  win.webContents.on("before-input-event", function (event, input) {
    if (input.type !== "keyDown") return
    if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
      win.webContents.toggleDevTools()
    }
  })
}

let boundsTimer = null
function saveBounds() {
  if (!win || win.isDestroyed() || win.isMaximized() || win.isMinimized()) return
  clearTimeout(boundsTimer)
  boundsTimer = setTimeout(function () {
    if (!win || win.isDestroyed()) return
    prefs.set("bounds", win.getBounds())
  }, 500)
}

function showWindow() {
  if (!win || win.isDestroyed()) {
    createWindow()
    return
  }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function emergencyStop() {
  if (agent) agent.panic()
  send("fw:device:panic", {})
}

function buildMenu() {
  const template = []
  if (process.platform === "darwin") {
    template.push({
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { label: "Settings…", accelerator: "Cmd+,", click: function () { send("fw:menu", { action: "settings" }) } },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    })
  }
  template.push({
    label: "File",
    submenu: [
      { label: "New chat", accelerator: "CmdOrCtrl+N", click: function () { send("fw:menu", { action: "new-chat" }) } },
      { label: "Open folder…", accelerator: "CmdOrCtrl+O", click: function () { send("fw:menu", { action: "open-folder" }) } },
      { type: "separator" },
      { label: "Settings", accelerator: "CmdOrCtrl+,", click: function () { send("fw:menu", { action: "settings" }) } },
      { type: "separator" },
      { role: "quit" }
    ]
  })
  template.push({
    label: "Edit",
    submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }]
  })
  template.push({
    label: "View",
    submenu: [
      { label: "Toggle sidebar", accelerator: "CmdOrCtrl+B", click: function () { send("fw:menu", { action: "sidebar" }) } },
      { label: "Toggle panel", accelerator: "CmdOrCtrl+J", click: function () { send("fw:menu", { action: "panel" }) } },
      { type: "separator" },
      { role: "reload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" }
    ]
  })
  template.push({
    label: "Computer",
    submenu: [
      { label: "Stop everything", accelerator: HOTKEY, click: emergencyStop },
      { label: "Reconnect this computer", click: function () { if (agent) agent.connect() } },
      { label: "Open Forkwise on the web", click: function () { shell.openExternal(site()) } }
    ]
  })
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/* ------------------------------------------------------------------- boot */

async function bootPayload() {
  let me = null
  let problem = ""
  try {
    me = await currentUser()
  } catch (error) {
    problem = error.message
  }
  return {
    version: VERSION,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    user: me ? me.user : null,
    models: me ? me.models || [] : [],
    plan: me ? me.plan || null : null,
    usage: me ? me.usage || null : null,
    prefs: prefs.all(),
    theme: themeNow(),
    device: deviceState,
    feed: feed.slice(-40),
    site: site(),
    api: serverBase(),
    online: !problem,
    problem: problem,
    folder: prefs.get("folder") || "",
    login: !me
  }
}

/* -------------------------------------------------------------------- ipc */

function wire() {
  ipcMain.handle("fw:boot", function () {
    return bootPayload()
  })

  ipcMain.handle("fw:auth:start", function () {
    openLogin()
    return { ok: true }
  })

  ipcMain.handle("fw:auth:logout", async function () {
    try {
      await api.call("/api/auth/logout", { method: "POST", body: {} })
    } catch (problem) {}
    stopStream()
    if (agent) agent.disconnect()
    config.set("token", "")
    config.set("deviceId", "")
    return { ok: true }
  })

  ipcMain.handle("fw:auth:open-site", function (event, where) {
    shell.openExternal(site() + (where || "/app"))
    return { ok: true }
  })

  /* Generic, whitelisted API passthrough for simple reads. */
  ipcMain.handle("fw:api", async function (event, request) {
    const settings = request || {}
    const route = String(settings.path || "")
    if (route.indexOf("/api/") !== 0) throw new Error("Blocked path")
    return api.call(route, { method: settings.method || "GET", body: settings.body })
  })

  ipcMain.handle("fw:chats:list", function (event, query) {
    return api.call("/api/chats" + (query && query.project_id ? "?project_id=" + encodeURIComponent(query.project_id) : ""))
  })

  ipcMain.handle("fw:chats:get", async function (event, chatId) {
    const data = await api.call("/api/chats/" + encodeURIComponent(chatId))
    if (data && data.run && data.run.active && data.run.id) watchRun(data.run.id)
    return data
  })

  ipcMain.handle("fw:chats:create", function (event, body) {
    return api.call("/api/chats", { method: "POST", body: body || {} })
  })

  ipcMain.handle("fw:chats:patch", function (event, payload) {
    return api.call("/api/chats/" + encodeURIComponent(payload.id), { method: "PATCH", body: payload.body || {} })
  })

  ipcMain.handle("fw:chats:delete", function (event, chatId) {
    return api.call("/api/chats/" + encodeURIComponent(chatId), { method: "DELETE" })
  })

  ipcMain.handle("fw:projects:list", function () {
    return api.call("/api/projects")
  })

  ipcMain.handle("fw:chat:send", async function (event, payload) {
    const body = {
      content: payload.content || "",
      attachments: payload.attachments || [],
      model: payload.model || "",
      mode: payload.mode || "",
      effort: payload.effort || "",
      skills: payload.skills || []
    }
    const data = await api.call("/api/chats/" + encodeURIComponent(payload.chatId) + "/messages", { method: "POST", body: body })
    // a queued message belongs to the run that is already being watched
    if (data && data.run_id && !data.queued) watchRun(data.run_id)
    return data
  })

  ipcMain.handle("fw:run:stop", async function (event, runId) {
    const id = runId || activeRunId
    if (!id) return { ok: false }
    const data = await api.call("/api/runs/" + encodeURIComponent(id) + "/stop", { method: "POST", body: {} })
    return data
  })

  ipcMain.handle("fw:run:respond", function (event, payload) {
    return api.call("/api/runs/" + encodeURIComponent(payload.runId) + "/respond", { method: "POST", body: { id: payload.id, value: payload.value } })
  })

  ipcMain.handle("fw:run:detach", function () {
    stopStream()
    return { ok: true }
  })

  async function uploadFiles(chatId, files) {
    if (!files.length) return { files: [] }
    const chat = await api.call("/api/chats/" + encodeURIComponent(chatId))
    const workspace = chat.chat.workspace_id
    const form = new FormData()
    files.slice(0, 10).forEach(function (file) {
      form.append("files", new Blob([file.buffer]), file.name)
    })
    return api.call("/api/ws/" + encodeURIComponent(workspace) + "/upload", { method: "POST", body: form })
  }

  const ATTACH_LIMIT = 25 * 1024 * 1024

  function readForUpload(paths) {
    const files = []
    const skipped = []
    ;(paths || []).slice(0, 10).forEach(function (file) {
      try {
        const info = fs.statSync(file)
        if (!info.isFile() || info.size > ATTACH_LIMIT) {
          skipped.push(path.basename(file))
          return
        }
        files.push({ name: path.basename(file), buffer: fs.readFileSync(file) })
      } catch (problem) {
        skipped.push(path.basename(file))
      }
    })
    return { files: files, skipped: skipped }
  }

  ipcMain.handle("fw:attach:pick", async function (event, chatId) {
    const result = await dialog.showOpenDialog(win, {
      title: "Attach files",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "All files", extensions: ["*"] }, { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }, { name: "Documents", extensions: ["pdf", "txt", "md", "csv", "json", "log"] }]
    })
    if (result.canceled || result.filePaths.length === 0) return { files: [] }
    const read = readForUpload(result.filePaths)
    const data = await uploadFiles(chatId, read.files)
    data.skipped = read.skipped
    return data
  })

  // Files dropped on the window arrive as paths.
  ipcMain.handle("fw:attach:paths", async function (event, payload) {
    const read = readForUpload((payload && payload.paths) || [])
    const data = await uploadFiles(payload.chatId, read.files)
    data.skipped = read.skipped
    return data
  })

  // Pasted screenshots have no path, so the bytes come across.
  ipcMain.handle("fw:attach:data", async function (event, payload) {
    const bytes = Buffer.from(payload && payload.bytes ? payload.bytes : [])
    if (!bytes.length || bytes.length > ATTACH_LIMIT) return { files: [], skipped: [payload && payload.name] }
    const name = String((payload && payload.name) || "pasted.png").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80)
    return uploadFiles(payload.chatId, [{ name: name, buffer: bytes }])
  })

  ipcMain.handle("fw:folder:pick", async function () {
    const result = await dialog.showOpenDialog(win, { title: "Choose a project folder", properties: ["openDirectory", "createDirectory"] })
    if (result.canceled || !result.filePaths[0]) return { folder: "" }
    const folder = result.filePaths[0]
    addRoot(folder)
    prefs.set("folder", folder)
    return { folder: folder }
  })

  ipcMain.handle("fw:prefs:set", function (event, values) {
    Object.keys(values || {}).forEach(function (key) {
      prefs.set(key, values[key])
    })
    if (values && values.theme) {
      applyThemeSource()
      send("fw:theme", { theme: themeNow() })
    }
    if (values && "background" in values) {
      app.setLoginItemSettings({ openAtLogin: !!values.background, openAsHidden: true })
    }
    return prefs.all()
  })

  ipcMain.handle("fw:prefs:get", function () {
    return prefs.all()
  })

  ipcMain.handle("fw:theme:get", function () {
    return { theme: themeNow() }
  })

  ipcMain.handle("fw:window:control", function (event, action) {
    if (!win) return { ok: false }
    if (action === "minimize") win.minimize()
    if (action === "maximize") win.isMaximized() ? win.unmaximize() : win.maximize()
    if (action === "close") win.close()
    if (action === "focus") {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
    return { ok: true, maximized: win.isMaximized() }
  })

  ipcMain.handle("fw:open:external", function (event, target) {
    const value = String(target || "")
    if (/^https?:/i.test(value)) shell.openExternal(value)
    else if (/^file:/i.test(value)) shell.openExternal(value)
    return { ok: true }
  })

  ipcMain.handle("fw:open:path", function (event, target) {
    return shell.openPath(String(target || ""))
  })

  /* device */
  ipcMain.handle("fw:device:state", function () {
    return { state: deviceState, feed: feed.slice(-40), token: !!config.get("token"), id: config.get("deviceId") || "" }
  })

  ipcMain.handle("fw:device:connect", async function () {
    await ensureDevice()
    return { state: deviceState }
  })

  ipcMain.handle("fw:device:pair", async function () {
    const data = await pairDevice()
    if (agent) agent.connect()
    return { ok: true, id: config.get("deviceId") }
  })

  ipcMain.handle("fw:device:pause", function (event, value) {
    if (agent) agent.setPaused(!!value)
    return { paused: !!value }
  })

  ipcMain.handle("fw:device:panic", function () {
    emergencyStop()
    return { ok: true }
  })

  ipcMain.handle("fw:device:answer", function (event, payload) {
    const resolveAsk = pendingAsks.get(payload.id)
    if (resolveAsk) resolveAsk(payload.value || "deny")
    return { ok: true }
  })

  ipcMain.handle("fw:device:apps", async function (event, force) {
    const items = await appsLib.list(!!force)
    return { apps: items.slice(0, 400) }
  })

  ipcMain.handle("fw:device:open-app", async function (event, name) {
    const items = await appsLib.list(false)
    const found = appsLib.find(name, items)
    if (!found) return { ok: false, text: "No app called " + name + " was found." }
    if (found.source === "start-menu") {
      shell.openPath(found.target)
      return { ok: true, text: "Opened " + found.name }
    }
    if (found.source === "applications") {
      shell.openPath(found.target)
      return { ok: true, text: "Opened " + found.name }
    }
    if (found.source === "desktop-file") {
      shell.openPath("/usr/share/applications/" + found.target)
      return { ok: true, text: "Opened " + found.name }
    }
    shell.openPath(found.target)
    return { ok: true, text: "Opened " + found.name }
  })

  ipcMain.handle("fw:device:screenshot", async function () {
    return safeCapture("data")
  })

  ipcMain.handle("fw:device:settings", function (event, pane) {
    const key = String(pane || "display")
    if (process.platform === "win32") {
      const map = { display: "ms-settings:display", wallpaper: "ms-settings:personalization-background", appearance: "ms-settings:personalization", sound: "ms-settings:sound", bluetooth: "ms-settings:bluetooth", wifi: "ms-settings:network-wifi", apps: "ms-settings:appsfeatures", privacy: "ms-settings:privacy", keyboard: "ms-settings:easeofaccess-keyboard", about: "ms-settings:about" }
      shell.openExternal(map[key] || "ms-settings:")
      return { ok: true }
    }
    if (process.platform === "darwin") {
      const map = { display: "x-apple.systempreferences:com.apple.Displays-Settings.extension", wallpaper: "x-apple.systempreferences:com.apple.Wallpaper-Settings.extension", sound: "x-apple.systempreferences:com.apple.Sound-Settings.extension", privacy: "x-apple.systempreferences:com.apple.preference.security", network: "x-apple.systempreferences:com.apple.Network-Settings.extension", battery: "x-apple.systempreferences:com.apple.Battery-Settings.extension" }
      shell.openExternal(map[key] || "x-apple.systempreferences:")
      return { ok: true }
    }
    const map = { display: "gnome-control-center display", wallpaper: "gnome-control-center background", sound: "gnome-control-center sound", network: "gnome-control-center network", privacy: "gnome-control-center privacy", appearance: "gnome-control-center appearance" }
    const { spawn } = require("child_process")
    const child = spawn("bash", ["-lc", map[key] || "gnome-control-center"], { detached: true, stdio: "ignore" })
    child.on("error", function () {})
    child.unref()
    return { ok: true }
  })

  ipcMain.handle("fw:device:info", function () {
    return {
      platform: process.platform,
      version: VERSION,
      hostname: os.hostname(),
      user: utilLib.userName(),
      home: os.homedir(),
      total: os.totalmem(),
      free: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      displays: host.displays(),
      token: !!config.get("token"),
      id: config.get("deviceId") || ""
    }
  })

  /* terminal */
  ipcMain.handle("fw:term:start", function (event, folder) {
    if (!terminal) {
      terminal = termLib.create({
        cwd: prefs.get("folder") || os.homedir(),
        onData: function (text) {
          send("fw:term:data", { text: text })
        },
        onExit: function (code) {
          send("fw:term:exit", { code: code })
        }
      })
    }
    const info = terminal.start(folder || prefs.get("folder") || os.homedir())
    return info
  })

  ipcMain.handle("fw:term:write", function (event, text) {
    if (terminal) terminal.write(text)
    return { ok: true }
  })

  ipcMain.handle("fw:term:interrupt", function () {
    return { ok: !!(terminal && terminal.interrupt()) }
  })

  ipcMain.handle("fw:term:stop", function () {
    if (terminal) terminal.stop()
    return { ok: true }
  })

  /* git */
  ipcMain.handle("fw:git:status", function (event, folder) {
    return gitLib.status(folder || prefs.get("folder") || os.homedir())
  })

  ipcMain.handle("fw:git:diff", function (event, payload) {
    return gitLib.diff(payload.folder, payload.path)
  })

  ipcMain.handle("fw:fs:read", async function (event, target) {
    const full = String(target || "")
    const stat = await fs.promises.stat(full)
    if (stat.size > 2 * 1024 * 1024) return { ok: false, text: "This file is too big to show." }
    const body = await fs.promises.readFile(full, "utf8")
    return { ok: true, text: body }
  })

  ipcMain.handle("fw:log", function (event, payload) {
    return { ok: true }
  })
}

/* ------------------------------------------------------------------- tray */

function buildTray() {
  try {
    tray = new Tray(iconImage().resize({ width: 18, height: 18 }))
    tray.setToolTip("Forkwise")
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open Forkwise", click: showWindow },
        { label: "New chat", click: function () { showWindow(); send("fw:menu", { action: "new-chat" }) } },
        { type: "separator" },
        { label: "Stop everything", click: emergencyStop },
        { label: "Open on the web", click: function () { shell.openExternal(site()) } },
        { type: "separator" },
        { label: "Quit", click: function () { quitting = true; app.quit() } }
      ])
    )
    tray.on("click", showWindow)
  } catch (problem) {}
}

/* ------------------------------------------------------------------- life */

app.on("second-instance", function () {
  showWindow()
})

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", function () {
  showWindow()
})

app.on("before-quit", function () {
  quitting = true
  stopStream()
  if (terminal) terminal.stop()
  if (agent) agent.disconnect()
  try {
    builtin.dispose()
  } catch (problem) {}
  try {
    chrome.dispose()
  } catch (problem) {}
})

app.whenReady().then(async function () {
  app.setAppUserModelId("com.forkwiseai.desktop")
  config = configLib.create(app.getPath("userData"))
  prefs = configLib.create(path.join(app.getPath("userData"), "prefs"))
  ses = session.fromPartition(PARTITION)
  buildApi()
  applyThemeSource()
  nativeTheme.on("updated", function () {
    send("fw:theme", { theme: themeNow() })
  })
  buildAgent()
  wire()
  buildMenu()
  buildTray()
  createWindow()
  globalShortcut.register(HOTKEY, emergencyStop)

  const user = await currentUser().catch(function () {
    return null
  })
  if (user) {
    await ensureDevice().catch(function (problem) {
      deviceActivity({ type: "error", text: problem.message })
    })
  }

  // Optional screenshot hook used by the automated UI checks.
  if (process.env.FW_SHOT) {
    const target = process.env.FW_SHOT
    win.webContents.once("did-finish-load", function () {
      setTimeout(async function () {
        try {
          const image = await win.webContents.capturePage()
          fs.writeFileSync(target, image.toPNG())
        } catch (problem) {
          fs.writeFileSync(target + ".error.txt", problem.message)
        }
        app.exit(0)
      }, Number(process.env.FW_SHOT_WAIT || 2200))
    })
  }
})
