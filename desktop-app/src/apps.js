/* Finds the apps installed on this computer so the app (and the agent) can open
   them by name. Windows reads the Start Menu, macOS reads /Applications,
   Linux reads the freedesktop .desktop entries. */
const fs = require("fs")
const os = require("os")
const path = require("path")
const { execFile } = require("child_process")

let cache = null
let cachedAt = 0

function exists(target) {
  try {
    fs.accessSync(target)
    return true
  } catch (problem) {
    return false
  }
}

function fromWindowsStartMenu() {
  const roots = [
    path.join(process.env.ProgramData || "C:\\ProgramData", "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs")
  ]
  const found = []
  const walk = function (folder, depth) {
    if (depth > 3) return
    let items = []
    try {
      items = fs.readdirSync(folder, { withFileTypes: true })
    } catch (problem) {
      return
    }
    items.forEach(function (item) {
      const full = path.join(folder, item.name)
      if (item.isDirectory()) walk(full, depth + 1)
      else if (/\.lnk$/i.test(item.name)) found.push({ name: item.name.replace(/\.lnk$/i, ""), target: full, source: "start-menu" })
    })
  }
  roots.forEach(function (root) {
    walk(root, 0)
  })
  return found
}

function fromMacApplications() {
  const roots = ["/Applications", "/System/Applications", path.join(os.homedir(), "Applications")]
  const found = []
  roots.forEach(function (root) {
    let items = []
    try {
      items = fs.readdirSync(root, { withFileTypes: true })
    } catch (problem) {
      return
    }
    items.forEach(function (item) {
      if (!/\.app$/i.test(item.name)) return
      found.push({ name: item.name.replace(/\.app$/i, ""), target: path.join(root, item.name), source: "applications" })
    })
  })
  return found
}

function desktopDirs() {
  return [
    "/usr/share/applications",
    "/usr/local/share/applications",
    path.join(os.homedir(), ".local", "share", "applications"),
    "/var/lib/flatpak/exports/share/applications",
    path.join(os.homedir(), ".local", "share", "flatpak", "exports", "share", "applications")
  ]
}

function fromDesktopFiles() {
  const found = []
  desktopDirs().forEach(function (folder) {
    let items = []
    try {
      items = fs.readdirSync(folder)
    } catch (problem) {
      return
    }
    items.forEach(function (name) {
      if (!/\.desktop$/i.test(name)) return
      const full = path.join(folder, name)
      let title = name.replace(/\.desktop$/i, "")
      let command = ""
      let hidden = false
      try {
        const body = fs.readFileSync(full, "utf8")
        const entry = body.split(/\[Desktop Entry\]/)[1] || body
        entry.split("\n").forEach(function (line) {
          if (line.indexOf("Name=") === 0) title = line.slice(5).trim()
          if (line.indexOf("Exec=") === 0) command = line.slice(5).trim()
          if (line.indexOf("NoDisplay=true") === 0) hidden = true
          if (line.indexOf("Hidden=true") === 0) hidden = true
        })
      } catch (problem) {}
      if (hidden) return
      const exec = command.split(" ")[0]
      if (!exec || !exists(exec)) return
      found.push({ name: title, target: name, exec: exec, source: "desktop-file" })
    })
  })
  return found
}

function dedupe(items) {
  const seen = {}
  return items.filter(function (item) {
    const key = item.name.toLowerCase()
    if (seen[key]) return false
    seen[key] = true
    return !!item.name
  })
}

function list(force) {
  const now = Date.now()
  if (!force && cache && now - cachedAt < 60000) return Promise.resolve(cache)
  let items = []
  if (process.platform === "win32") items = fromWindowsStartMenu()
  else if (process.platform === "darwin") items = fromMacApplications()
  else items = fromDesktopFiles()
  cache = dedupe(items).sort(function (a, b) {
    return a.name.localeCompare(b.name)
  })
  cachedAt = now
  return Promise.resolve(cache)
}

function find(name, items) {
  const wanted = String(name || "").toLowerCase().trim()
  if (!wanted) return null
  const exact = items.find(function (item) {
    return item.name.toLowerCase() === wanted
  })
  if (exact) return exact
  const partial = items.find(function (item) {
    return item.name.toLowerCase().indexOf(wanted) >= 0 || wanted.indexOf(item.name.toLowerCase()) >= 0
  })
  return partial || null
}

module.exports = { list: list, find: find }
