/* Workbench frame: the open folder, the command list, menu bar, activity
   bar, status bar, command palette and quick open. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  const commands = {}
  let fileCache = { root: "", files: [], at: 0 }
  let branchInfo = { branch: "", changes: 0 }

  /* ---------------------------------------------------------- the folder */

  function root() {
    return S.root || ""
  }

  function baseName(folder) {
    const clean = String(folder || "").replace(/[\\/]+$/, "")
    const parts = clean.split(/[\\/]/)
    return parts[parts.length - 1] || clean
  }

  // The folder the explorer, search and editor work in. A chat with its own
  // folder brings it along; File > Open Folder picks one by hand.
  function setRoot(folder, options) {
    const settings = options || {}
    const next = folder || ""
    if (next === S.root && !settings.force) return
    S.root = next
    fileCache = { root: "", files: [], at: 0 }
    if (next) {
      window.fw.wb.watch(next).catch(function () {})
      window.fw.wb.remember(next).catch(function () {})
      if (settings.forChats) {
        S.folder = next
        FW.store.savePrefs({ folder: next })
        if (FW.composer) FW.composer.renderChips()
      }
    }
    FW.store.savePrefs({ root: next })
    FW.store.emit("root", next)
    refreshBranch()
    status()
  }

  async function openFolder() {
    const result = await window.fw.wb.openFolder()
    if (!result.folder) return
    setRoot(result.folder, { forChats: true, force: true })
    setView("explorer")
    U.toast("Opened " + baseName(result.folder))
  }

  // Files picked with File > Open File open in the editor; the first one's
  // folder becomes the open folder when none is open.
  async function openFiles() {
    const result = await window.fw.wb.openFile()
    if (!result.files || !result.files.length) return
    result.files.forEach(function (file) {
      const folder = file.replace(/[\\/][^\\/]+$/, "")
      const current = root()
      if (current && isInside(current, file)) {
        FW.editor.open(relative(current, file))
      } else {
        if (!current) setRoot(folder, { force: true })
        FW.editor.open(relative(folder, file), { root: folder })
      }
    })
  }

  function norm(value) {
    return String(value || "").replace(/\\/g, "/").replace(/\/+$/, "")
  }

  function isInside(folder, file) {
    const a = norm(folder).toLowerCase()
    const b = norm(file).toLowerCase()
    return b.indexOf(a + "/") === 0
  }

  function relative(folder, file) {
    return norm(file).slice(norm(folder).length + 1)
  }

  // A path from the agent (absolute or relative) as a path in the open folder.
  function toRel(value) {
    const current = root()
    if (!current || !value) return ""
    const text = String(value)
    if (/^([a-zA-Z]:[\\/]|\/)/.test(text)) return isInside(current, text) ? relative(current, text) : ""
    return text.replace(/^\.\//, "")
  }

  async function allFiles(force) {
    const current = root()
    if (!current) return []
    if (!force && fileCache.root === current && Date.now() - fileCache.at < 15000) return fileCache.files
    try {
      const data = await window.fw.wb.files(current)
      fileCache = { root: current, files: data.files || [], at: Date.now() }
    } catch (problem) {
      fileCache = { root: current, files: [], at: Date.now() }
    }
    return fileCache.files
  }

  async function refreshBranch() {
    const current = root()
    if (!current) {
      branchInfo = { branch: "", changes: 0 }
      status()
      return
    }
    try {
      branchInfo = await window.fw.wb.branch(current)
    } catch (problem) {
      branchInfo = { branch: "", changes: 0 }
    }
    status()
    activity()
  }

  /* ------------------------------------------------------------ commands */

  function register(id, label, run, extra) {
    commands[id] = Object.assign({ id: id, label: label, run: run }, extra || {})
  }

  function run(id) {
    const command = commands[id]
    if (!command) return
    try {
      const result = command.run()
      if (result && result.catch) {
        result.catch(function (problem) {
          U.toast(problem.message || "That did not work", "bad")
        })
      }
    } catch (problem) {
      U.toast(problem.message || "That did not work", "bad")
    }
  }

  function key(id) {
    const command = commands[id]
    return command && command.key ? U.key(command.key) : ""
  }

  function registerAll() {
    register("chat.new", "New chat", function () { FW.app.newChat() }, { key: "Mod+N", group: "Agent", icon: "plus" })
    register("folder.open", "Open folder…", openFolder, { key: "Mod+Alt+O", group: "File", icon: "folder" })
    register("file.open", "Open file…", openFiles, { key: "Mod+O", group: "File", icon: "file" })
    register("file.new", "New file", function () { FW.explorer.newItem(false) }, { group: "File", icon: "filePlus" })
    register("folder.new", "New folder", function () { FW.explorer.newItem(true) }, { group: "File", icon: "folderPlus" })
    register("file.save", "Save", function () { FW.editor.save() }, { key: "Mod+S", group: "File", icon: "save" })
    register("file.saveAll", "Save all", function () { FW.editor.saveAll() }, { key: "Mod+Alt+S", group: "File" })
    register("file.saveAs", "Save as…", function () { FW.editor.saveAs() }, { key: "Mod+Shift+S", group: "File" })
    register("file.close", "Close editor", function () { FW.editor.closeActive() }, { key: "Mod+W", group: "File" })
    register("file.closeAll", "Close all editors", function () { FW.editor.closeAll() }, { group: "File" })
    register("file.reveal", "Reveal in file manager", function () { FW.editor.revealActive() }, { group: "File" })
    register("settings.open", "Settings", function () { FW.settings.open("general") }, { key: "Mod+,", group: "File", icon: "settings" })
    register("app.quit", "Exit", function () { window.fw.win.control("close") }, { group: "File" })

    register("edit.undo", "Undo", function () { editorAction("undo") }, { key: "Mod+Z", group: "Edit" })
    register("edit.redo", "Redo", function () { editorAction("redo") }, { key: "Mod+Shift+Z", group: "Edit" })
    register("edit.find", "Find", function () { editorAction("actions.find") }, { key: "Mod+F", group: "Edit" })
    register("edit.replace", "Replace", function () { editorAction("editor.action.startFindReplaceAction") }, { key: "Mod+H", group: "Edit" })
    register("edit.findInFiles", "Find in files", function () { setView("search") }, { key: "Mod+Shift+F", group: "Edit", icon: "search" })
    register("edit.format", "Format document", function () { editorAction("editor.action.formatDocument") }, { key: "Shift+Alt+F", group: "Edit" })
    register("edit.comment", "Toggle line comment", function () { editorAction("editor.action.commentLine") }, { key: "Mod+/", group: "Edit" })
    register("edit.inline", "Edit with the agent (selection)", function () { FW.editor.inlineAsk() }, { key: "Mod+K", group: "Edit", icon: "wand" })
    register("edit.toChat", "Add selection to chat", function () { FW.editor.selectionToChat() }, { key: "Mod+Shift+L", group: "Edit", icon: "chat" })

    register("view.palette", "Command palette", function () { palette(">") }, { key: "Mod+Shift+P", group: "View", icon: "command" })
    register("view.chats", "Show chats", function () { setView("chats") }, { key: "Mod+Shift+C", group: "View", icon: "chat" })
    register("view.explorer", "Show explorer", function () { setView("explorer") }, { key: "Mod+Shift+E", group: "View", icon: "files" })
    register("view.search", "Show search", function () { setView("search") }, { group: "View", icon: "search" })
    register("view.git", "Show source control", function () { setView("git") }, { key: "Mod+Shift+G", group: "View", icon: "branch" })
    register("view.sidebar", "Toggle sidebar", function () { FW.app.toggleSidebar() }, { key: "Mod+\\", group: "View", icon: "sidebar" })
    register("view.panel", "Toggle panel", function () { FW.app.togglePanel() }, { key: "Mod+B", group: "View", icon: "panel" })
    register("view.terminal", "Show terminal", function () { FW.app.togglePanel(true); FW.panel.show("terminal") }, { key: "Mod+`", group: "View", icon: "terminal" })
    register("view.browser", "Show browser", function () { FW.app.togglePanel(true); FW.panel.show("browser") }, { group: "View", icon: "globe" })
    register("view.plan", "Show plan", function () { FW.app.togglePanel(true); FW.panel.show("plan") }, { group: "View", icon: "list" })
    register("view.timeline", "Show timeline", function () { FW.app.togglePanel(true); FW.panel.show("timeline") }, { group: "View", icon: "clock" })
    register("view.chatToggle", "Toggle chat beside the editor", toggleChat, { key: "Mod+Alt+B", group: "View", icon: "split" })
    register("view.status", "Toggle status bar", function () {
      const hidden = !document.body.classList.contains("no-status")
      document.body.classList.toggle("no-status", hidden)
      FW.store.savePrefs({ statusBar: !hidden })
    }, { group: "View" })
    register("view.compact", "Toggle compact density", function () {
      const on = !document.body.classList.contains("compact")
      document.body.classList.toggle("compact", on)
      FW.store.savePrefs({ density: on ? "compact" : "comfortable" })
    }, { group: "View" })
    register("view.theme", "Switch light / dark", function () {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"
      FW.store.savePrefs({ theme: next })
      FW.app.applyTheme(next)
      if (FW.editor) FW.editor.applyTheme()
    }, { group: "View", icon: "moon" })
    register("view.zoomIn", "Zoom in", function () { zoom(1) }, { key: "Mod+=", group: "View" })
    register("view.zoomOut", "Zoom out", function () { zoom(-1) }, { key: "Mod+-", group: "View" })
    register("view.zoomReset", "Reset zoom", function () { zoom(0) }, { key: "Mod+0", group: "View" })

    register("go.file", "Go to file…", function () { palette("") }, { key: "Mod+P", group: "Go", icon: "file" })
    register("go.line", "Go to line…", function () { palette(":") }, { key: "Mod+G", group: "Go" })
    register("go.next", "Next editor", function () { FW.editor.cycle(1) }, { key: "Mod+Tab", group: "Go" })
    register("go.prev", "Previous editor", function () { FW.editor.cycle(-1) }, { key: "Mod+Shift+Tab", group: "Go" })
    register("go.chat", "Focus the message box", function () { FW.composer.focus() }, { key: "Mod+L", group: "Go" })

    register("agent.stop", "Stop the agent", function () { FW.composer.stopNow() }, { key: "Esc", group: "Agent", icon: "square" })
    register("agent.mode", "Choose the mode…", function () { const b = document.getElementById("modePick"); if (b) b.click() }, { key: "Mod+.", group: "Agent", icon: "zap" })
    register("agent.model", "Choose the model…", function () { const b = document.getElementById("modelPick"); if (b) b.click() }, { key: "Mod+/", group: "Agent", icon: "cpu" })
    register("agent.follow", "Follow the agent", function () { FW.panel.toggleFollow() }, { group: "Agent", icon: "eye" })
    register("agent.compact", "Compact the context", compactChat, { group: "Agent" })
    register("agent.rules", "Edit project rules (FORKWISE.md)", function () { FW.app.togglePanel(true); FW.panel.show("rules") }, { group: "Agent", icon: "book" })
    register("agent.board", "Agent command center", function () { FW.agents.toggle() }, { key: "Mod+Shift+A", group: "Agent", icon: "app" })
    register("agent.new", "New background agent…", function () { FW.agents.newAgent() }, { key: "Mod+Shift+N", group: "Agent", icon: "plus" })
    register("agent.review", "Review the changes with an agent", function () { FW.agents.review(null) }, { key: "Mod+Shift+R", group: "Agent", icon: "eye" })
    register("agent.claude", "Run Claude Code in a terminal", function () { FW.terminals.runAgent("claude") }, { group: "Agent", icon: "spark" })
    register("agent.codex", "Run Codex in a terminal", function () { FW.terminals.runAgent("codex") }, { group: "Agent", icon: "spark" })
    register("agent.opencode", "Run OpenCode in a terminal", function () { FW.terminals.runAgent("opencode") }, { group: "Agent", icon: "spark" })
    register("view.spaces", "Show spaces", function () { setView("spaces") }, { group: "View", icon: "layout" })
    register("terminal.new", "New terminal", function () { FW.terminals.open({}) }, { key: "Mod+Shift+`", group: "View", icon: "terminal" })
    register("agent.commit", "Ask the agent to commit", function () { FW.composer.fill("Look at the current changes, then commit them with a clear message.") }, { group: "Agent" })
    register("agent.explain", "Explain this file", function () { FW.editor.explainActive() }, { group: "Agent" })

    register("help.keys", "Keyboard shortcuts", function () { FW.settings.open("keys") }, { group: "Help", icon: "keyboard" })
    register("help.docs", "Documentation", function () { window.fw.openExternal("https://forkwiseai.com/docs") }, { group: "Help", icon: "external" })
    register("help.site", "Open forkwiseai.com", function () { window.fw.openExternal("https://forkwiseai.com") }, { group: "Help" })
    register("help.devtools", "Toggle developer tools", function () { window.fw.win.control("devtools") }, { group: "Help" })
    register("help.about", "About Forkwise", function () { FW.settings.open("account") }, { group: "Help", icon: "help" })
  }

  function editorAction(id) {
    if (FW.editor && FW.editor.action(id)) return
    if (id === "undo") document.execCommand("undo")
    if (id === "redo") document.execCommand("redo")
  }

  let zoomLevel = 0
  function zoom(step) {
    zoomLevel = step === 0 ? 0 : Math.max(-3, Math.min(4, zoomLevel + step))
    document.body.style.zoom = String(1 + zoomLevel * 0.1)
    FW.store.savePrefs({ zoom: zoomLevel })
    if (FW.editor) FW.editor.layout()
  }

  async function compactChat() {
    if (!S.chat) return U.toast("Open a chat first")
    U.toast("Compacting…")
    try {
      await window.fw.api("/api/chats/" + encodeURIComponent(S.chat.id) + "/compact", "POST", {})
      U.toast("Older messages were summarized")
    } catch (problem) {
      U.toast(problem.message || "Could not compact", "bad")
    }
  }

  /* ------------------------------------------------------------ menu bar */

  const MENUS = [
    { label: "File", items: ["chat.new", "-", "file.new", "folder.new", "-", "file.open", "folder.open", "recent", "-", "file.save", "file.saveAs", "file.saveAll", "-", "file.reveal", "file.close", "file.closeAll", "-", "settings.open", "-", "app.quit"] },
    { label: "Edit", items: ["edit.undo", "edit.redo", "-", "edit.find", "edit.replace", "edit.findInFiles", "-", "edit.format", "edit.comment", "-", "edit.inline", "edit.toChat"] },
    { label: "View", items: ["view.palette", "-", "agent.board", "view.chats", "view.explorer", "view.search", "view.git", "view.spaces", "-", "view.sidebar", "view.panel", "view.chatToggle", "view.status", "-", "view.terminal", "terminal.new", "view.browser", "view.plan", "view.timeline", "-", "view.theme", "view.compact", "view.zoomIn", "view.zoomOut", "view.zoomReset"] },
    { label: "Go", items: ["go.file", "go.line", "-", "go.next", "go.prev", "-", "go.chat"] },
    { label: "Agent", items: ["agent.board", "agent.new", "chat.new", "agent.stop", "-", "agent.review", "agent.commit", "agent.explain", "-", "agent.mode", "agent.model", "agent.follow", "agent.rules", "-", "agent.claude", "agent.codex", "agent.opencode", "-", "agent.compact"] },
    { label: "Help", items: ["help.keys", "help.docs", "help.site", "-", "help.devtools", "help.about"] }
  ]

  function menubar() {
    const bar = document.getElementById("menubar")
    if (!bar) return
    bar.innerHTML = ""
    MENUS.forEach(function (menu) {
      const button = h("button", { class: "menubar-item", type: "button", text: menu.label })
      button.addEventListener("click", function () {
        openMenu(menu, button)
      })
      button.addEventListener("mouseenter", function () {
        // moving across the bar while a menu is open switches menus
        const open = bar.querySelector(".menubar-item.open")
        if (open && open !== button) openMenu(menu, button)
      })
      bar.appendChild(button)
    })
  }

  async function openMenu(menu, button) {
    let recent = []
    if (menu.items.indexOf("recent") >= 0) {
      try {
        recent = (await window.fw.wb.recent()).folders || []
      } catch (problem) {}
    }
    const items = []
    menu.items.forEach(function (id) {
      if (id === "-") {
        items.push({ separator: true })
        return
      }
      if (id === "recent") {
        recent.slice(0, 6).forEach(function (folder) {
          items.push({ value: "recent:" + folder, label: "Open recent: " + baseName(folder), title: folder, icon: "clock" })
        })
        return
      }
      const command = commands[id]
      if (!command) return
      items.push({ value: id, label: command.label, key: key(id), icon: command.icon })
    })
    U.menu(button, items, function (value) {
      if (value.indexOf("recent:") === 0) {
        setRoot(value.slice(7), { forChats: true, force: true })
        setView("explorer")
        return
      }
      run(value)
    }, { className: "wide", up: false })
  }

  /* -------------------------------------------------------- activity bar */

  const VIEWS = [
    { id: "board", label: "Agents", icon: "app", command: "agent.board" },
    { id: "chats", label: "Chats", icon: "chat", command: "view.chats" },
    { id: "explorer", label: "Explorer", icon: "files", command: "view.explorer" },
    { id: "search", label: "Search", icon: "search", command: "edit.findInFiles" },
    { id: "git", label: "Source control", icon: "branch", command: "view.git" },
    { id: "spaces", label: "Spaces", icon: "layout", command: "view.spaces" }
  ]

  function activity() {
    const bar = document.getElementById("activity")
    if (!bar) return
    bar.innerHTML = ""
    VIEWS.forEach(function (view) {
      const shortcut = key(view.command)
      const boardOn = FW.agents && FW.agents.visible()
      const on = view.id === "board" ? boardOn : S.sideView === view.id && S.sidebarOpen
      const button = h("button", { class: "act-btn" + (on ? " on" : ""), type: "button", title: view.label + (shortcut ? " (" + shortcut + ")" : ""), html: icon(view.icon, 18) })
      if (view.id === "git" && branchInfo.changes) button.appendChild(h("span", { class: "act-badge", text: branchInfo.changes > 99 ? "99+" : String(branchInfo.changes) }))
      if (view.id === "board") {
        const busy = (S.chats || []).filter(function (chat) { return chat.running }).length
        const needs = (S.chats || []).some(function (chat) { return chat.running && chat.waiting })
        if (busy) button.appendChild(h("span", { class: "act-badge" + (needs ? " warn" : ""), text: String(busy) }))
      }
      button.addEventListener("click", function () {
        if (view.id === "board") {
          FW.agents.toggle()
          return
        }
        if (S.sideView === view.id && S.sidebarOpen) FW.app.toggleSidebar()
        else setView(view.id)
      })
      bar.appendChild(button)
    })
    bar.appendChild(h("div", { class: "act-spacer" }))
    bar.appendChild(h("button", { class: "act-btn", type: "button", title: "Command palette (" + key("view.palette") + ")", html: icon("command", 17), onclick: function () { palette(">") } }))
    bar.appendChild(h("button", { class: "act-btn", type: "button", title: "Settings (" + key("settings.open") + ")", html: icon("settings", 17), onclick: function () { FW.settings.open("general") } }))
  }

  function setView(view) {
    S.sideView = view
    FW.store.savePrefs({ sideView: view })
    if (!S.sidebarOpen) FW.app.toggleSidebar()
    Array.prototype.forEach.call(document.querySelectorAll("#sidebar .side-view"), function (node) {
      node.hidden = node.dataset.view !== view
    })
    activity()
    if (view === "spaces") {
      if (FW.spaces) FW.spaces.render()
      return
    }
    if (view !== "chats" && FW.explorer) FW.explorer.show(view)
  }

  /* ---------------------------------------------------------- status bar */

  function status() {
    const bar = document.getElementById("statusbar")
    if (!bar) return
    bar.innerHTML = ""
    const current = root()
    bar.appendChild(h("button", { class: "sb-item", type: "button", title: current || "Open a folder", onclick: current ? function () { setView("explorer") } : openFolder }, [h("span", { html: icon("folder", 12) }), h("span", { text: current ? baseName(current) : "No folder open" })]))
    if (branchInfo.branch) {
      bar.appendChild(h("button", { class: "sb-item", type: "button", title: "Source control", onclick: function () { setView("git") } }, [h("span", { html: icon("branch", 12) }), h("span", { text: branchInfo.branch + (branchInfo.changes ? " • " + branchInfo.changes : "") })]))
    }
    const device = S.device || {}
    const online = device.state === "online"
    bar.appendChild(h("button", { class: "sb-item", type: "button", title: "This computer", onclick: function () { FW.app.togglePanel(true); FW.panel.show("computer") } }, [h("span", { class: "sb-dot " + (online ? "ok" : device.state === "connecting" ? "busy" : "") }), h("span", { text: online ? "Computer connected" : "Computer " + (device.state || "off") })]))
    if (S.running) bar.appendChild(h("span", { class: "sb-item" }, [h("span", { class: "sb-dot busy" }), h("span", { text: "Agent working…" })]))
    bar.appendChild(h("span", { class: "sb-grow" }))
    const cursor = S.cursor
    if (cursor && cursor.line) {
      bar.appendChild(h("button", { class: "sb-item", type: "button", title: "Go to line", onclick: function () { palette(":") }, text: "Ln " + cursor.line + ", Col " + cursor.col + (cursor.selected ? " (" + cursor.selected + " selected)" : "") }))
      bar.appendChild(h("span", { class: "sb-item", text: "Spaces: " + (S.prefs.tabSize || 2) }))
      bar.appendChild(h("span", { class: "sb-item", text: (cursor.eol || "LF").toUpperCase() }))
      bar.appendChild(h("span", { class: "sb-item", text: cursor.language || "Plain text" }))
    }
    const probs = FW.editor && FW.editor.problems ? FW.editor.problems() : []
    if (probs.length || S.intelFiles) {
      const errors = probs.filter(function (item) { return item.severity === "error" }).length
      const warnings = probs.length - errors
      bar.appendChild(h("button", { class: "sb-item", type: "button", title: (S.intelFiles ? S.intelFiles + " files indexed for code intelligence. " : "") + "Problems", onclick: function () { FW.panel.show("problems") } }, [h("span", { html: icon("alert", 12) }), h("span", { text: errors + "  \u26a0 " + warnings })]))
    }
    if (S.context && S.context.tokens) {
      const used = S.context.limit ? Math.round((S.context.tokens / S.context.limit) * 100) : 0
      bar.appendChild(h("span", { class: "sb-item", title: "Context used", text: "Context " + (used ? used + "%" : Math.round(S.context.tokens / 1000) + "k") }))
    }
    const mode = FW.composer && FW.composer.mode ? FW.composer.mode() : ""
    if (mode) bar.appendChild(h("button", { class: "sb-item", type: "button", title: "Mode", text: mode === "auto" ? "Agent" : mode === "ask" ? "Ask first" : "Plan", onclick: function () { run("agent.mode") } }))
    const model = FW.composer && FW.composer.model ? FW.composer.model() : ""
    const found = (S.models || []).find(function (item) { return item.key === model })
    if (found) bar.appendChild(h("button", { class: "sb-item", type: "button", title: "Model", onclick: function () { run("agent.model") } }, [h("span", { html: icon("cpu", 12) }), h("span", { text: found.label || found.key })]))
    bar.appendChild(h("button", { class: "sb-item", type: "button", title: "Command palette", html: icon("command", 12), onclick: function () { palette(">") } }))
  }

  /* ------------------------------------------------- palette / quick open */

  // Scores how well the typed letters match, in order (higher is better).
  function fuzzy(text, query) {
    if (!query) return { score: 1, marks: [] }
    const lower = text.toLowerCase()
    const needle = query.toLowerCase()
    const direct = lower.indexOf(needle)
    if (direct >= 0) {
      const marks = []
      for (let index = 0; index < needle.length; index += 1) marks.push(direct + index)
      const nameStart = lower.lastIndexOf("/") + 1
      return { score: 1000 - direct + (direct >= nameStart ? 500 : 0) - text.length * 0.1, marks: marks }
    }
    let at = 0
    let score = 0
    const marks = []
    for (let index = 0; index < needle.length; index += 1) {
      const found = lower.indexOf(needle[index], at)
      if (found < 0) return null
      score += found === at ? 6 : 1
      marks.push(found)
      at = found + 1
    }
    return { score: score - text.length * 0.05, marks: marks }
  }

  function marked(text, marks) {
    const node = h("span", { class: "p-label" })
    let index = 0
    const set = {}
    marks.forEach(function (mark) {
      set[mark] = true
    })
    while (index < text.length) {
      let end = index
      const bold = !!set[index]
      while (end < text.length && !!set[end] === bold) end += 1
      const piece = text.slice(index, end)
      node.appendChild(bold ? h("b", { text: piece }) : document.createTextNode(piece))
      index = end
    }
    return node
  }

  function palette(start) {
    const old = document.querySelector(".palette-back")
    if (old) old.remove()
    U.closeMenu()
    const back = h("div", { class: "palette-back modal-back" })
    back.style.background = "rgba(0,0,0,0.18)"
    back.style.alignItems = "flex-start"
    const input = h("input", { type: "text", spellcheck: "false", placeholder: "" })
    const list = h("div", { class: "palette-list" })
    const foot = h("div", { class: "palette-foot" }, [h("span", { text: "↑↓ to move" }), h("span", { text: "Enter to open" }), h("span", { text: "> commands · : line · @ chats" })])
    const box = h("div", { class: "palette" }, [input, list, foot])
    back.appendChild(box)
    document.body.appendChild(back)
    let items = []
    let active = 0
    let token = 0

    function close() {
      document.removeEventListener("keydown", onKey, true)
      back.remove()
    }

    async function update() {
      const value = input.value
      const mine = ++token
      let rows = []
      if (value.charAt(0) === ">") {
        input.placeholder = "Type a command"
        const query = value.slice(1).trim()
        Object.keys(commands).forEach(function (id) {
          const command = commands[id]
          const label = (command.group ? command.group + ": " : "") + command.label
          const match = fuzzy(label, query)
          if (match) rows.push({ score: match.score, label: label, marks: match.marks, hint: "", key: key(id), icon: command.icon || "command", run: function () { run(id) } })
        })
      } else if (value.charAt(0) === ":") {
        const line = parseInt(value.slice(1), 10)
        rows.push({ score: 1, label: line ? "Go to line " + line : "Type a line number", marks: [], hint: "", icon: "arrowRight", run: function () { if (line) FW.editor.goToLine(line) } })
      } else if (value.charAt(0) === "@") {
        const query = value.slice(1).trim()
        ;(S.chats || []).forEach(function (chat) {
          const title = chat.title || "New chat"
          const match = fuzzy(title, query)
          if (match) rows.push({ score: match.score, label: title, marks: match.marks, hint: U.timeAgo(chat.updated_at || chat.created_at), icon: "chat", run: function () { FW.app.openChat(chat.id) } })
        })
      } else {
        input.placeholder = root() ? "Search files by name (type > for commands, @ for chats)" : "Open a folder to search files (type > for commands)"
        const files = await allFiles()
        if (mine !== token) return
        files.forEach(function (file) {
          const match = fuzzy(file, value.trim())
          if (match) {
            const name = file.split("/").pop()
            const nameMarks = []
            const offset = file.length - name.length
            match.marks.forEach(function (mark) {
              if (mark >= offset) nameMarks.push(mark - offset)
            })
            rows.push({ score: match.score, label: name, marks: nameMarks, hint: file.slice(0, offset).replace(/\/$/, ""), iconHtml: FW.explorer.fileIcon(name), run: function () { FW.editor.open(file) } })
          }
        })
        if (!root()) rows.push({ score: 0, label: "Open folder…", marks: [], hint: "", icon: "folder", run: openFolder })
      }
      rows.sort(function (a, b) {
        return b.score - a.score
      })
      items = rows.slice(0, 80)
      active = 0
      draw()
    }

    function draw() {
      list.innerHTML = ""
      if (!items.length) {
        list.appendChild(h("div", { class: "menu-empty", text: "Nothing matches." }))
        return
      }
      items.forEach(function (item, index) {
        const button = h("button", { class: "palette-item" + (index === active ? " active" : ""), type: "button" }, [
          h("span", { class: "p-icon", html: item.iconHtml || icon(item.icon || "dot", 14) }),
          h("span", { class: "p-text" }, [marked(item.label, item.marks), item.hint ? h("span", { class: "p-hint", text: item.hint }) : null]),
          item.key ? h("span", { class: "p-key", text: item.key }) : null
        ])
        button.addEventListener("mousemove", function () {
          if (active === index) return
          active = index
          Array.prototype.forEach.call(list.children, function (child, place) {
            child.classList.toggle("active", place === index)
          })
        })
        button.addEventListener("click", function () {
          close()
          item.run()
        })
        list.appendChild(button)
      })
      const current = list.children[active]
      if (current) current.scrollIntoView({ block: "nearest" })
    }

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopImmediatePropagation()
        close()
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!items.length) return
        active = (active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
        draw()
      } else if (event.key === "Enter") {
        event.preventDefault()
        event.stopImmediatePropagation()
        const item = items[active]
        close()
        if (item) item.run()
      }
    }

    back.addEventListener("mousedown", function (event) {
      if (event.target === back) close()
    })
    input.addEventListener("input", update)
    document.addEventListener("keydown", onKey, true)
    input.value = start || ""
    update()
    setTimeout(function () {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }, 10)
  }

  /* ---------------------------------------------------- editor beside chat */

  function updateSplit() {
    const open = FW.editor && FW.editor.count() > 0
    const was = document.body.classList.contains("split")
    if (open && !was) makeEditorRoom()
    document.body.classList.toggle("split", !!open)
    document.getElementById("editorArea").hidden = !open
    document.getElementById("workResize").hidden = !open
    const head = document.getElementById("stageHead")
    head.hidden = !open
    if (open) drawStageHead()
    else document.body.classList.remove("chat-hidden")
  }

  // The editor and the chat side by side need room: when the window is too
  // narrow, the panel and then the sidebar step aside (not saved).
  function makeEditorRoom() {
    const style = getComputedStyle(document.documentElement)
    const chat = Math.min(parseInt(style.getPropertyValue("--chat-w"), 10) || 440, 440)
    const main = document.getElementById("main").getBoundingClientRect().width
    let room = main - chat
    if (room < 460 && S.panelOpen) {
      room += parseInt(style.getPropertyValue("--panel-w"), 10) || 330
      S.panelOpen = false
      FW.app.applyLayout()
    }
    if (room < 460 && S.sidebarOpen) {
      S.sidebarOpen = false
      FW.app.applyLayout()
    }
  }

  function drawStageHead() {
    const head = document.getElementById("stageHead")
    head.innerHTML = ""
    head.appendChild(h("span", { html: icon("chat", 13) }))
    head.appendChild(h("span", { class: "title", text: (S.chat && S.chat.title) || "New chat" }))
    head.appendChild(h("button", { class: "view-btn", title: "New chat (" + key("chat.new") + ")", html: icon("plus", 13), onclick: function () { FW.app.newChat() } }))
    head.appendChild(h("button", { class: "view-btn", title: "Chat history", html: icon("clock", 13), onclick: function () { palette("@") } }))
    head.appendChild(h("button", { class: "view-btn", title: "Hide the chat (" + key("view.chatToggle") + ")", html: icon("close", 13), onclick: toggleChat }))
  }

  function toggleChat() {
    if (!document.body.classList.contains("split")) {
      FW.composer.focus()
      return
    }
    const hidden = !document.body.classList.contains("chat-hidden")
    document.body.classList.toggle("chat-hidden", hidden)
    if (!hidden) FW.composer.focus()
    if (FW.editor) FW.editor.layout()
  }

  function wireResize() {
    const handle = document.getElementById("workResize")
    let startX = 0
    let startW = 0
    handle.addEventListener("mousedown", function (event) {
      event.preventDefault()
      startX = event.clientX
      startW = document.getElementById("stage").getBoundingClientRect().width
      handle.classList.add("dragging")
      document.body.style.cursor = "col-resize"
      document.addEventListener("mousemove", move)
      document.addEventListener("mouseup", up)
    })
    function move(event) {
      const width = Math.max(320, Math.min(window.innerWidth * 0.7, startW - (event.clientX - startX)))
      document.documentElement.style.setProperty("--chat-w", Math.round(width) + "px")
      if (FW.editor) FW.editor.layout()
    }
    function up() {
      handle.classList.remove("dragging")
      document.body.style.cursor = ""
      document.removeEventListener("mousemove", move)
      document.removeEventListener("mouseup", up)
      const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--chat-w"), 10)
      FW.store.savePrefs({ chatWidth: width })
    }
  }

  /* ---------------------------------------------------------------- keys */

  function inEditor(target) {
    return !!(target && target.closest && target.closest(".monaco-editor"))
  }

  // Shortcuts that belong to the workbench. Returns true when handled.
  function onKey(event) {
    const mod = event.metaKey || event.ctrlKey
    if (!mod) return false
    const lower = event.key.toLowerCase()
    function take(id) {
      event.preventDefault()
      event.stopPropagation()
      run(id)
      return true
    }
    if (event.shiftKey && lower === "p") return take("view.palette")
    if (event.shiftKey && lower === "e") return take("view.explorer")
    if (event.shiftKey && lower === "f") return take("edit.findInFiles")
    if (event.shiftKey && lower === "g") return take("view.git")
    if (event.shiftKey && lower === "c") return take("view.chats")
    if (event.shiftKey && lower === "a") return take("agent.board")
    if (event.shiftKey && lower === "n") return take("agent.new")
    if (event.shiftKey && lower === "r") return take("agent.review")
    if (event.shiftKey && (event.key === "`" || event.key === "~")) return take("terminal.new")
    if (event.shiftKey && lower === "s") return take("file.saveAs")
    if (event.shiftKey && lower === "l") return take("edit.toChat")
    if (event.altKey && lower === "o") return take("folder.open")
    if (event.altKey && lower === "s") return take("file.saveAll")
    if (event.altKey && lower === "b") return take("view.chatToggle")
    if (event.shiftKey || event.altKey) return false
    if (lower === "p") return take("go.file")
    if (lower === "o") return take("file.open")
    if (lower === "s") return take("file.save")
    if (lower === "g" && !inEditor(event.target)) return take("go.line")
    if (lower === "w" && FW.editor && FW.editor.count() > 0) return take("file.close")
    if (event.key === "Tab" && FW.editor && FW.editor.count() > 1) return take("go.next")
    if (lower === "k" && inEditor(event.target)) return take("edit.inline")
    if ((lower === "=" || lower === "+") && !inEditor(event.target)) return take("view.zoomIn")
    if (lower === "-" && !inEditor(event.target)) return take("view.zoomOut")
    if (lower === "0" && !inEditor(event.target)) return take("view.zoomReset")
    return false
  }

  /* ---------------------------------------------------------------- init */

  function init() {
    registerAll()
    menubar()
    S.sideView = S.prefs.sideView || "chats"
    if (S.prefs.chatWidth) document.documentElement.style.setProperty("--chat-w", S.prefs.chatWidth + "px")
    if (S.prefs.statusBar === false) document.body.classList.add("no-status")
    if (S.prefs.density === "compact") document.body.classList.add("compact")
    if (S.prefs.zoom) {
      zoomLevel = S.prefs.zoom
      document.body.style.zoom = String(1 + zoomLevel * 0.1)
    }
    wireResize()
    const startRoot = S.prefs.root || S.folder || ""
    if (startRoot) setRoot(startRoot, { force: true })
    Array.prototype.forEach.call(document.querySelectorAll("#sidebar .side-view"), function (node) {
      node.hidden = node.dataset.view !== S.sideView
    })
    if (S.sideView === "spaces") setTimeout(function () { if (FW.spaces) FW.spaces.render() }, 0)
    else if (S.sideView !== "chats" && FW.explorer) FW.explorer.show(S.sideView)
    activity()
    status()
    FW.store.on("running", function () {
      status()
      if (!S.running) refreshBranch()
    })
    FW.store.on("context", status)
    FW.store.on("title", function () {
      if (document.body.classList.contains("split")) drawStageHead()
    })
    FW.store.on("chat:loaded", function (data) {
      // a chat that works in a folder opens that folder here too
      if (data && data.chat && data.chat.local_path) setRoot(data.chat.local_path)
      if (document.body.classList.contains("split")) drawStageHead()
      status()
    })
    window.fw.wb.onChanged(function (change) {
      if (change.root !== norm(root()) && change.root !== root()) {
        if (norm(change.root) !== norm(root())) return
      }
      fileCache.at = 0
      if (FW.explorer) FW.explorer.changed(change.paths)
      if (FW.editor) FW.editor.changed(change.paths)
      clearTimeout(branchTimer)
      branchTimer = setTimeout(refreshBranch, 900)
    })
  }

  let branchTimer = null

  window.FW = window.FW || {}
  window.FW.wb = {
    init: init,
    root: root,
    setRoot: setRoot,
    baseName: baseName,
    toRel: toRel,
    allFiles: allFiles,
    fuzzy: fuzzy,
    openFolder: openFolder,
    openFiles: openFiles,
    register: register,
    run: run,
    key: key,
    commands: function () {
      return commands
    },
    palette: palette,
    setView: setView,
    activity: activity,
    status: status,
    updateSplit: updateSplit,
    toggleChat: toggleChat,
    refreshBranch: refreshBranch,
    branch: function () {
      return branchInfo
    },
    onKey: onKey
  }
})()
