const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("fw", {
  load: function () {
    return ipcRenderer.invoke("fw:state")
  },
  onState: function (callback) {
    ipcRenderer.on("fw:state", function (event, data) {
      callback(data)
    })
  },
  onActivity: function (callback) {
    ipcRenderer.on("fw:activity", function (event, data) {
      callback(data)
    })
  },
  connect: function (token, server) {
    return ipcRenderer.invoke("fw:connect", token, server)
  },
  forget: function () {
    return ipcRenderer.invoke("fw:forget")
  },
  pause: function (value) {
    return ipcRenderer.invoke("fw:pause", value)
  },
  confirm: function (value) {
    return ipcRenderer.invoke("fw:confirm", value)
  },
  autostart: function (value) {
    return ipcRenderer.invoke("fw:autostart", value)
  },
  browser: function () {
    return ipcRenderer.invoke("fw:browser")
  },
  panic: function () {
    return ipcRenderer.invoke("fw:panic")
  },
  site: function (where) {
    return ipcRenderer.invoke("fw:site", where)
  }
})
