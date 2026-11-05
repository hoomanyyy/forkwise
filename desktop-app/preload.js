const { contextBridge, ipcRenderer } = require("electron")

function listen(channel, handler) {
  const wrapped = function (event, payload) {
    handler(payload)
  }
  ipcRenderer.on(channel, wrapped)
  return function () {
    ipcRenderer.removeListener(channel, wrapped)
  }
}

contextBridge.exposeInMainWorld("fw", {
  version: process.versions.electron,
  boot: function () {
    return ipcRenderer.invoke("fw:boot")
  },
  auth: {
    start: function () {
      return ipcRenderer.invoke("fw:auth:start")
    },
    logout: function () {
      return ipcRenderer.invoke("fw:auth:logout")
    },
    openSite: function (where) {
      return ipcRenderer.invoke("fw:auth:open-site", where)
    },
    onReady: function (handler) {
      return listen("fw:auth:ready", handler)
    },
    onLost: function (handler) {
      return listen("fw:auth:lost", handler)
    }
  },
  api: function (path, method, body) {
    return ipcRenderer.invoke("fw:api", { path: path, method: method, body: body })
  },
  chats: {
    list: function (query) {
      return ipcRenderer.invoke("fw:chats:list", query)
    },
    get: function (id) {
      return ipcRenderer.invoke("fw:chats:get", id)
    },
    create: function (body) {
      return ipcRenderer.invoke("fw:chats:create", body)
    },
    patch: function (id, body) {
      return ipcRenderer.invoke("fw:chats:patch", { id: id, body: body })
    },
    remove: function (id) {
      return ipcRenderer.invoke("fw:chats:delete", id)
    }
  },
  projects: {
    list: function () {
      return ipcRenderer.invoke("fw:projects:list")
    }
  },
  send: function (payload) {
    return ipcRenderer.invoke("fw:chat:send", payload)
  },
  stopRun: function (runId) {
    return ipcRenderer.invoke("fw:run:stop", runId)
  },
  respond: function (runId, id, value) {
    return ipcRenderer.invoke("fw:run:respond", { runId: runId, id: id, value: value })
  },
  detachRun: function () {
    return ipcRenderer.invoke("fw:run:detach")
  },
  onRunEvent: function (handler) {
    return listen("fw:run:event", handler)
  },
  onRunError: function (handler) {
    return listen("fw:run:error", handler)
  },
  attachFiles: function (chatId) {
    return ipcRenderer.invoke("fw:attach:pick", chatId)
  },
  pickFolder: function () {
    return ipcRenderer.invoke("fw:folder:pick")
  },
  prefs: {
    all: function () {
      return ipcRenderer.invoke("fw:prefs:get")
    },
    set: function (values) {
      return ipcRenderer.invoke("fw:prefs:set", values)
    }
  },
  theme: {
    get: function () {
      return ipcRenderer.invoke("fw:theme:get")
    },
    on: function (handler) {
      return listen("fw:theme", handler)
    }
  },
  win: {
    control: function (action) {
      return ipcRenderer.invoke("fw:window:control", action)
    },
    onState: function (handler) {
      return listen("fw:window:state", handler)
    }
  },
  openExternal: function (target) {
    return ipcRenderer.invoke("fw:open:external", target)
  },
  openPath: function (target) {
    return ipcRenderer.invoke("fw:open:path", target)
  },
  device: {
    state: function () {
      return ipcRenderer.invoke("fw:device:state")
    },
    connect: function () {
      return ipcRenderer.invoke("fw:device:connect")
    },
    pair: function () {
      return ipcRenderer.invoke("fw:device:pair")
    },
    pause: function (value) {
      return ipcRenderer.invoke("fw:device:pause", value)
    },
    panic: function () {
      return ipcRenderer.invoke("fw:device:panic")
    },
    answer: function (id, value) {
      return ipcRenderer.invoke("fw:device:answer", { id: id, value: value })
    },
    apps: function (force) {
      return ipcRenderer.invoke("fw:device:apps", force)
    },
    openApp: function (name) {
      return ipcRenderer.invoke("fw:device:open-app", name)
    },
    screenshot: function () {
      return ipcRenderer.invoke("fw:device:screenshot")
    },
    settings: function (pane) {
      return ipcRenderer.invoke("fw:device:settings", pane)
    },
    info: function () {
      return ipcRenderer.invoke("fw:device:info")
    },
    onStatus: function (handler) {
      return listen("fw:device:status", handler)
    },
    onActivity: function (handler) {
      return listen("fw:device:activity", handler)
    },
    onAsk: function (handler) {
      return listen("fw:device:ask", handler)
    },
    onPanic: function (handler) {
      return listen("fw:device:panic", handler)
    }
  },
  term: {
    start: function (folder) {
      return ipcRenderer.invoke("fw:term:start", folder)
    },
    write: function (text) {
      return ipcRenderer.invoke("fw:term:write", text)
    },
    stop: function () {
      return ipcRenderer.invoke("fw:term:stop")
    },
    onData: function (handler) {
      return listen("fw:term:data", handler)
    },
    onExit: function (handler) {
      return listen("fw:term:exit", handler)
    }
  },
  git: {
    status: function (folder) {
      return ipcRenderer.invoke("fw:git:status", folder)
    },
    diff: function (folder, file) {
      return ipcRenderer.invoke("fw:git:diff", { folder: folder, path: file })
    }
  },
  fs: {
    read: function (target) {
      return ipcRenderer.invoke("fw:fs:read", target)
    }
  },
  onMenu: function (handler) {
    return listen("fw:menu", handler)
  }
})
