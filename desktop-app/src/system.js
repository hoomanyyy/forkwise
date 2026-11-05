const fs = require("fs")
const os = require("os")
const path = require("path")
const { spawn } = require("child_process")
const shell = require("./shell")
const files = require("./files")
const util = require("./util")

const ALIASES = {
  "vscode": "code",
  "vs code": "code",
  "visual studio code": "code",
  "terminal": { win32: "wt", darwin: "Terminal", linux: "x-terminal-emulator" },
  "settings": { win32: "ms-settings:", darwin: "System Settings", linux: "gnome-control-center" },
  "explorer": { win32: "explorer", darwin: "Finder", linux: "xdg-open ." }
}

function detach(file, args) {
  const child = spawn(file, args, { detached: true, stdio: "ignore", windowsHide: false })
  child.on("error", function () {})
  child.unref()
}

function which(name) {
  const dirs = (process.env.PATH || "").split(path.delimiter)
  const endings = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""]
  for (let i = 0; i < dirs.length; i++) {
    for (let j = 0; j < endings.length; j++) {
      const full = path.join(dirs[i], name + endings[j])
      try {
        if (fs.statSync(full).isFile()) return full
      } catch (problem) {}
    }
  }
  return ""
}

async function openTarget(host, target, extra) {
  let wanted = (target || "").trim()
  const alias = ALIASES[wanted.toLowerCase()]
  if (alias) wanted = typeof alias === "string" ? alias : alias[process.platform] || wanted
  if (!wanted) return { ok: false, text: "target is missing." }
  const args = extra || []
  if (wanted.toLowerCase().startsWith("http://") || wanted.toLowerCase().startsWith("https://")) {
    await host.openExternal(wanted)
    return { ok: true, text: "Opened " + wanted + " in the default browser." }
  }
  const expanded = util.expand(wanted)
  if (fs.existsSync(expanded) && args.length === 0) {
    const problem = await host.openPath(expanded)
    if (problem) return { ok: false, text: problem }
    return { ok: true, text: "Opened " + expanded }
  }
  if (process.platform === "win32") {
    if (wanted.indexOf(":") > 1 && !fs.existsSync(expanded)) {
      await host.openExternal(wanted)
      return { ok: true, text: "Opened " + wanted }
    }
    const found = which(wanted)
    if (found) {
      detach(found, args)
      return { ok: true, text: "Started " + found }
    }
    detach("cmd.exe", ["/c", "start", "", wanted].concat(args))
    return { ok: true, text: "Asked Windows to start " + wanted }
  }
  if (process.platform === "darwin") {
    const found = which(wanted.split(" ")[0])
    if (found && wanted.indexOf(" ") === -1) {
      detach(found, args)
      return { ok: true, text: "Started " + found }
    }
    detach("open", ["-a", wanted].concat(args.length ? ["--args"].concat(args) : []))
    return { ok: true, text: "Opened the app " + wanted }
  }
  const parts = wanted.split(" ")
  const found = which(parts[0])
  if (found) {
    detach(found, parts.slice(1).concat(args))
    return { ok: true, text: "Started " + wanted }
  }
  detach("xdg-open", [expanded])
  return { ok: true, text: "Opened " + wanted }
}

function windowList() {
  if (process.platform === "win32") return shell.runShell("Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object Id, ProcessName, MainWindowTitle | Format-Table -AutoSize | Out-String -Width 200", "", 30)
  if (process.platform === "darwin") return shell.runShell("osascript -e 'tell application \"System Events\" to get name of (processes where background only is false)'", "", 30)
  return shell.runShell("wmctrl -l 2>/dev/null || ps -eo pid,comm --sort=-%cpu | head -40", "", 30)
}

async function focusWindow(title) {
  const wanted = (title || "").trim()
  if (!wanted) return { ok: false, text: "target is missing: give part of the window title." }
  if (process.platform === "win32") {
    const quoted = "'" + wanted.replace(/'/g, "''") + "'"
    const done = await shell.runShell("$w = New-Object -ComObject WScript.Shell; if ($w.AppActivate(" + quoted + ")) { 'Focused' } else { 'No window found' }", "", 20)
    return { ok: done.text.indexOf("Focused") >= 0, text: done.text.trim() }
  }
  if (process.platform === "darwin") return shell.runShell("osascript -e 'tell application \"" + wanted.replace(/["']/g, "") + "\" to activate'", "", 20)
  return shell.runShell("wmctrl -a '" + wanted.replace(/'/g, "") + "'", "", 20)
}

async function setWallpaper(source) {
  let wanted = (source || "").trim()
  if (!wanted) return { ok: false, text: "source is missing." }
  let full = util.expand(wanted)
  if (wanted.toLowerCase().startsWith("http")) {
    const ending = (wanted.split("?")[0].match(/\.(jpg|jpeg|png|bmp|webp)$/i) || [".png"])[0]
    const saved = path.join(os.homedir(), ".forkwise", "wallpaper" + ending)
    const got = await files.download(wanted, saved)
    if (!got.ok) return got
    full = saved
  }
  if (!fs.existsSync(full)) return { ok: false, text: "Image not found: " + full }
  full = path.resolve(full)
  if (process.platform === "win32") {
    const code = "Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class Wp { [DllImport(\"user32.dll\", CharSet=CharSet.Unicode)] public static extern int SystemParametersInfo(int a, int b, string c, int d); }'; [Wp]::SystemParametersInfo(20, 0, '" + full.replace(/'/g, "''") + "', 3)"
    const done = await shell.runShell(code, "", 30)
    return { ok: done.ok, text: done.ok ? "Wallpaper changed to " + full : done.text }
  }
  if (process.platform === "darwin") return shell.runShell("osascript -e 'tell application \"System Events\" to tell every desktop to set picture to POSIX file \"" + full.replace(/"/g, "") + "\"'", "", 30)
  await shell.runShell("gsettings set org.gnome.desktop.background picture-uri-dark 'file://" + full + "'", "", 20)
  return shell.runShell("gsettings set org.gnome.desktop.background picture-uri 'file://" + full + "'", "", 20)
}

const UI_SCRIPT = [
  "Add-Type -AssemblyName UIAutomationClient",
  "Add-Type -AssemblyName UIAutomationTypes",
  "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class FwWin { [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); }'",
  "$handle = [FwWin]::GetForegroundWindow()",
  "$root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)",
  "Write-Output (\"WINDOW`t\" + $root.Current.Name)",
  "$wanted = @('Button','Edit','MenuItem','TabItem','ListItem','CheckBox','RadioButton','ComboBox','Hyperlink','TreeItem','SplitButton','Document')",
  "$conditions = @()",
  "foreach ($name in $wanted) { $type = [System.Windows.Automation.ControlType]::($name); $conditions += New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, $type) }",
  "$any = New-Object System.Windows.Automation.OrCondition($conditions)",
  "$found = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $any)",
  "$count = 0",
  "foreach ($item in $found) {",
  "  if ($count -ge 300) { break }",
  "  try {",
  "    if ($item.Current.IsOffscreen) { continue }",
  "    $rect = $item.Current.BoundingRectangle",
  "    if ($rect.Width -lt 4 -or $rect.Height -lt 4) { continue }",
  "    $label = $item.Current.Name",
  "    if ([string]::IsNullOrWhiteSpace($label)) { $label = $item.Current.AutomationId }",
  "    if ([string]::IsNullOrWhiteSpace($label)) { continue }",
  "    $type = $item.Current.ControlType.ProgrammaticName.Replace('ControlType.', '')",
  "    $x = [int]($rect.X + $rect.Width / 2)",
  "    $y = [int]($rect.Y + $rect.Height / 2)",
  "    Write-Output (\"ITEM`t\" + $type + \"`t\" + $label.Replace(\"`t\", ' ').Replace(\"`n\", ' ') + \"`t\" + $x + \"`t\" + $y)",
  "    $count++",
  "  } catch { }",
  "}"
].join("\n")

async function uiElements(screen, filter) {
  if (process.platform !== "win32") return { ok: false, text: "Listing buttons and fields of other apps works on Windows. On this system use screenshot and click." }
  await screen.refresh()
  const encoded = Buffer.from(UI_SCRIPT, "utf16le").toString("base64")
  const done = await shell.runShell("powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand " + encoded, "", 90)
  const lines = []
  let title = ""
  const wanted = (filter || "").toLowerCase().trim()
  const rows = done.text.split(/\r?\n/)
  for (let i = 0; i < rows.length; i++) {
    const parts = rows[i].split("\t")
    if (parts[0] === "WINDOW" && parts.length > 1) title = parts[1]
    if (parts[0] === "ITEM" && parts.length >= 5) {
      if (wanted && parts[2].toLowerCase().indexOf(wanted) === -1) continue
      const point = screen.toImage(parseInt(parts[3], 10), parseInt(parts[4], 10))
      lines.push(parts[1] + ' "' + parts[2].slice(0, 70) + '" at ' + point.x + "," + point.y)
    }
  }
  if (lines.length === 0) return { ok: false, text: "No buttons or fields were found in the window in front" + (title ? " (" + title + ")" : "") + ". Use screenshot and click." }
  return { ok: true, text: "Window in front: " + title + "\nClick positions are in screenshot pixels:\n" + lines.slice(0, 200).join("\n") }
}

async function processList(filter) {
  let command
  if (process.platform === "win32") command = "Get-Process | Sort-Object WS -Descending | Select-Object -First 40 Id, ProcessName, @{n='MemMB';e={[int]($_.WS/1MB)}}, MainWindowTitle | Format-Table -AutoSize | Out-String -Width 200"
  else command = "ps -eo pid,pcpu,pmem,comm --sort=-pmem | head -41"
  const done = await shell.runShell(command, "", 30)
  let text = done.text
  if (filter) {
    const lines = text.split("\n")
    text = lines.filter(function (line, index) {
      return index === 0 || line.toLowerCase().indexOf(filter.toLowerCase()) >= 0
    }).join("\n")
  }
  return { ok: done.ok, text: text }
}

async function killProcess(pid) {
  const number = util.toInt(pid, 0)
  if (number <= 4) return { ok: false, text: "A valid process id is needed." }
  if (number === process.pid) return { ok: false, text: "That is Forkwise Desktop itself." }
  try {
    process.kill(number, "SIGTERM")
    return { ok: true, text: "Asked process " + number + " to stop." }
  } catch (problem) {
    return { ok: false, text: problem.message }
  }
}

function info(host, screen) {
  const displays = host.displays()
  const lines = [
    "OS: " + os.type() + " " + os.release() + " (" + os.arch() + ")",
    "Machine: " + os.hostname(),
    "User: " + util.userName(),
    "Home: " + os.homedir(),
    "Screens: " + displays.map(function (d) {
      return d.width + "x" + d.height + (d.scale !== 1 ? " at " + d.scale + "x" : "") + (d.primary ? " (main)" : "")
    }).join(", "),
    "Memory: " + Math.round(os.totalmem() / 1048576) + " MB total, " + Math.round(os.freemem() / 1048576) + " MB free",
    "CPU: " + os.cpus().length + " cores, " + (os.cpus()[0] ? os.cpus()[0].model : "unknown"),
    "Shell: " + (process.platform === "win32" ? "PowerShell" : process.env.SHELL || "/bin/sh"),
    "Forkwise Desktop: " + host.version
  ]
  return { ok: true, text: lines.join("\n") }
}

module.exports = { openTarget, windowList, focusWindow, setWallpaper, uiElements, processList, killProcess, info }
