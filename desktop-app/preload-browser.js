const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("fwBrowser", {
  onTabs: function (callback) {
    ipcRenderer.on("browser:tabs", function (event, data) {
      callback(data)
    })
    ipcRenderer.send("browser:ready")
  },
  newTab: function () {
    ipcRenderer.send("browser:new")
  },
  switchTab: function (id) {
    ipcRenderer.send("browser:switch", id)
  },
  closeTab: function (id) {
    ipcRenderer.send("browser:close", id)
  },
  go: function (text) {
    ipcRenderer.send("browser:go", text)
  },
  back: function () {
    ipcRenderer.send("browser:back")
  },
  forward: function () {
    ipcRenderer.send("browser:forward")
  },
  reload: function () {
    ipcRenderer.send("browser:reload")
  }
})
