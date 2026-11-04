const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("forkwiseDesktop", {
  isDesktop: true,
  status: function () {
    return ipcRenderer.invoke("fwd:status")
  },
  link: function (info) {
    return ipcRenderer.invoke("fwd:link", info)
  },
  pickFolder: function () {
    return ipcRenderer.invoke("fwd:pick")
  },
  recentFolders: function () {
    return ipcRenderer.invoke("fwd:recent")
  },
  openActivity: function () {
    return ipcRenderer.invoke("fwd:activity")
  },
  onOpenFolder: function (callback) {
    function listener() {
      callback()
    }
    ipcRenderer.on("fwd:open-folder", listener)
    return function () {
      ipcRenderer.removeListener("fwd:open-folder", listener)
    }
  }
})
