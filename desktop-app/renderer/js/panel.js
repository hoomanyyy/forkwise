/* Right panel: Changes, Terminal, Computer. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon
  const L = window.FWLabels

  let head = null
  let body = null
  let terminalStarted = false
  let termOut = null
  let termInput = null
  let termText = ""
  let termCwd = ""
  const TERM_KEEP = 200000
  let appsLoaded = false
  let appsCache = []
  let lastShot = null
  let shotBusy = false
  let diffFor = ""

  const MIN_W = 264
  const MAX_W = 720
  const DEFAULT_W = 330
  const STEP = 16

  const TABS = [
    { id: "changes", label: "Changes" },
    { id: "terminal", label: "Terminal" },
    { id: "computer", label: "Computer" }
  ]

  function init() {
    head = document.getElementById("panelHead")
    body = document.getElementById("panelBody")
    wireResize()
    render()
    window.fw.term.onData(function (payload) {
      termWrite(stripAnsi(payload.text || ""))
    })
    window.fw.term.onExit(function () {
      terminalStarted = false
      termWrite("\n[the shell exited \u2014 press Enter to start a new one]\n")
    })
    window.fw.device.onStatus(function (state) {
      S.device = state
      FW.sidebar.device()
      if (S.panel === "computer") render()
    })
    window.fw.device.onActivity(function (event) {
      S.feed.push(event)
      while (S.feed.length > 120) S.feed.shift()
      if (S.panel === "computer" && body) {
        const list = body.querySelector(".feed")
        if (list) list.prepend(feedRow(event))
      }
    })
  }

  // Terminal output is kept here so it survives the panel redrawing.
  function termWrite(text) {
    if (!text) return
    termText = (termText + text.replace(/\r\n/g, "\n").replace(/\r/g, "")).slice(-TERM_KEEP)
    if (!termOut) return
    const stuck = termOut.scrollHeight - termOut.scrollTop - termOut.clientHeight < 24
    termOut.textContent = termText
    if (stuck) termOut.scrollTop = termOut.scrollHeight
  }

  function stripAnsi(text) {
    return String(text || "")
      .replace(/^.*cannot set terminal process group.*\n?/gm, "")
      .replace(/^.*no job control in this shell.*\n?/gm, "")
      .replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, "")
      .replace(/\u001b\][^\u0007]*\u0007/g, "")
  }

  function wireResize() {
    const resize = document.getElementById("panelResize")
    if (!resize) return
    let startX = 0
    let startW = 0
    let dragging = false
    resize.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return
      e.preventDefault()
      dragging = true
      startX = e.clientX
      startW = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--panel-w"), 10) || 330
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    })
    function onMove(e) {
      if (!dragging) return
      const delta = startX - e.clientX
      const next = Math.max(MIN_W, Math.min(MAX_W, startW + delta))
      document.documentElement.style.setProperty("--panel-w", next + "px")
    }
    function onUp(e) {
      if (!dragging) return
      dragging = false
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--panel-w"), 10) || 330
      const snapped = Math.round(current / STEP) * STEP
      document.documentElement.style.setProperty("--panel-w", snapped + "px")
      S.prefs.panelWidth = snapped
      FW.store.savePrefs({ panelWidth: snapped })
    }
    resize.addEventListener("dblclick", function (e) { e.preventDefault(); resetWidth() })
    resize.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); adjust(STEP) }
      else if (e.key === "ArrowRight") { e.preventDefault(); adjust(-STEP) }
      else if (e.key === "Enter") { e.preventDefault(); resetWidth() }
    })
    function adjust(delta) {
      const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--panel-w"), 10) || 330
      const next = Math.max(MIN_W, Math.min(MAX_W, current + delta))
      document.documentElement.style.setProperty("--panel-w", next + "px")
      S.prefs.panelWidth = next
      FW.store.savePrefs({ panelWidth: next })
    }
    function resetWidth() {
      document.documentElement.style.setProperty("--panel-w", DEFAULT_W + "px")
      S.prefs.panelWidth = DEFAULT_W
      FW.store.savePrefs({ panelWidth: DEFAULT_W })
    }
  }

  function render() {
    if (!head || !body) return
    head.innerHTML = ""
    TABS.forEach(function (tab) {
      const count = tab.id === "changes" && S.changedFiles && S.changedFiles.length ? h("span", { class: "count", text: String(S.changedFiles.length) }) : null
      head.appendChild(
        h("button", {
          class: "tab" + (S.panel === tab.id ? " on" : ""),
          onclick: function () {
            show(tab.id)
          }
        }, [h("span", { text: tab.label }), count])
      )
    })
    head.appendChild(
      h("button", {
        class: "icon-btn",
        style: "margin-left:auto",
        title: "Close panel",
        html: icon("close", 13),
        onclick: function () {
          FW.app.togglePanel(false)
        }
      })
    )
    body.innerHTML = ""
    body.className = "panel-body" + (S.panel === "terminal" ? " flush" : "")
    if (S.panel === "changes") renderChanges()
    if (S.panel === "terminal") renderTerminal()
    if (S.panel === "computer") renderComputer()
  }

  function show(tab) {
    S.panel = tab
    FW.store.savePrefs({ panel: tab })
    render()
    if (tab === "changes") loadGit()
  }

  /* ------------------------------------------------------------ changes */

  function setChanges(files) {
    S.changedFiles = files || []
    if (S.panel === "changes" && body) render()
  }

  function renderChanges() {
    const folder = (S.chat && S.chat.local_path) || S.folder
    const wrap = h("div")
    if (!folder) {
      wrap.appendChild(
        h("div", { class: "panel-empty" }, [
          h("span", { html: icon("folderPlus", 22) }),
          h("div", { text: "Attach a folder to this chat and the files the agent changes show up here." }),
          h("div", { style: "margin-top:10px" }, [h("button", { class: "btn sm", text: "Choose a folder", onclick: function () { FW.composer && document.getElementById("btnFolder").click() } })])
        ])
      )
      body.appendChild(wrap)
      return
    }
    const branch = h("div", { class: "branch-row" }, [h("span", { html: icon("branch", 12) }), h("b", { text: gitBranch || shortFolder(folder) }), h("span", { class: "grow" }), h("button", { class: "icon-btn", html: icon("refresh", 12), title: "Refresh", onclick: loadGit })])
    wrap.appendChild(branch)
    const list = h("div", { class: "file-list" })
    const files = gitFiles || []
    if (!files.length) {
      list.appendChild(h("div", { class: "panel-empty", text: gitLoaded ? "No changes yet." : "Reading the folder\u2026" }))
    }
    files.forEach(function (file) {
      const parts = String(file.path).split("/")
      const name = parts.pop()
      const dir = parts.join("/")
      const code = file.code || "M"
      const codeClass = code === "A" || code === "??" ? " new" : code === "D" ? " del" : ""
      const row = h("button", { class: "file-row" + (diffFor === file.path ? " on" : ""), dataset: { file: file.path } }, [
        h("span", { class: "code" + codeClass, text: code === "??" ? "A" : code.slice(0, 1) }),
        h("span", { class: "name", text: name }),
        dir ? h("span", { class: "dir", text: dir }) : null,
        file.add ? h("span", { class: "plus", text: "+" + file.add }) : null,
        file.del ? h("span", { class: "minus", text: "\u2212" + file.del }) : null
      ])
      row.addEventListener("click", function () {
        diffFor = file.path
        render()
        loadDiff(folder, file.path)
      })
      list.appendChild(row)
    })
    wrap.appendChild(list)
    if (diffFor) {
      wrap.appendChild(h("div", { class: "diff-head", text: diffFor }))
      const diff = h("div", { class: "diff", id: "diffBox" }, [h("pre", { text: "Reading\u2026" })])
      wrap.appendChild(diff)
    }
    body.appendChild(wrap)
    if (!gitLoaded) loadGit()
    if (diffFor && !document.getElementById("diffBox").dataset.loaded) loadDiff(folder, diffFor)
  }

  let gitFiles = []
  let gitBranch = ""
  let gitLoaded = false
  let gitLoading = false

  async function loadGit() {
    const folder = (S.chat && S.chat.local_path) || S.folder
    if (!folder || gitLoading) return
    gitLoading = true
    try {
      const status = await window.fw.git.status(folder)
      gitFiles = status.files || []
      gitBranch = status.branch || ""
      gitLoaded = true
      if (S.panel === "changes") render()
    } catch (problem) {
      gitLoaded = true
    } finally {
      gitLoading = false
    }
  }

  async function loadDiff(folder, file) {
    const box = document.getElementById("diffBox")
    if (!box) return
    box.dataset.loaded = "1"
    try {
      const result = await window.fw.git.diff(folder, file)
      const pre = h("pre")
      String(result.text || "No diff.")
        .split("\n")
        .forEach(function (line) {
          let cls = "l"
          if (line.indexOf("+++") === 0 || line.indexOf("---") === 0 || line.indexOf("diff ") === 0 || line.indexOf("index ") === 0) cls += " meta"
          else if (line.indexOf("@@") === 0) cls += " hunk"
          else if (line.indexOf("+") === 0) cls += " add"
          else if (line.indexOf("-") === 0) cls += " del"
          pre.appendChild(h("span", { class: cls, text: line || " " }))
        })
      box.innerHTML = ""
      box.appendChild(pre)
    } catch (problem) {
      box.innerHTML = ""
      box.appendChild(h("pre", { text: problem.message || "Could not read the diff." }))
    }
  }

  function shortFolder(folder) {
    const parts = String(folder || "").split(/[\\/]/).filter(Boolean)
    return parts.slice(-2).join("/") || "this computer"
  }

  /* ----------------------------------------------------------- terminal */

  function renderTerminal() {
    const folder = (S.chat && S.chat.local_path) || S.folder || S.prefs.folder || ""
    const shown = termCwd || folder || "Home folder"
    const wrap = h("div", { class: "term" })
    const headRow = h("div", { class: "term-head" }, [
      h("span", { class: "path", text: shown, title: shown }),
      h("button", { html: icon("refresh", 12), title: "Restart the shell here", onclick: restartTerminal }),
      h("button", { html: icon("trash", 12), title: "Clear (Ctrl+L)", onclick: clearTerminal })
    ])
    termOut = h("div", { class: "term-out", tabindex: "0" })
    termOut.textContent = termText
    termInput = h("input", { type: "text", placeholder: "Type a command and press Enter", spellcheck: "false", autocomplete: "off" })
    const prompt = h("span", { text: "\u276f" })
    const inputRow = h("div", { class: "term-in" }, [prompt, termInput])
    wrap.appendChild(headRow)
    wrap.appendChild(termOut)
    wrap.appendChild(inputRow)
    body.appendChild(wrap)
    termOut.scrollTop = termOut.scrollHeight
    termOut.addEventListener("mouseup", function () {
      // clicking the output puts the cursor back in the input, unless text was selected
      const picked = window.getSelection && String(window.getSelection())
      if (!picked) termInput.focus()
    })

    termInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        const text = termInput.value
        if (!terminalStarted) startShell(folder, headRow)
        if (!text.trim()) {
          window.fw.term.write("\n")
          return
        }
        termHistory.push(text)
        termIndex = termHistory.length
        termInput.value = ""
        window.fw.term.write(text + "\n")
        termOut.scrollTop = termOut.scrollHeight
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        if (termIndex > 0) {
          termIndex -= 1
          termInput.value = termHistory[termIndex] || ""
        }
      } else if (event.key === "ArrowDown") {
        event.preventDefault()
        if (termIndex < termHistory.length - 1) {
          termIndex += 1
          termInput.value = termHistory[termIndex] || ""
        } else {
          termIndex = termHistory.length
          termInput.value = ""
        }
      } else if (event.key === "l" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        clearTerminal()
      } else if (event.key === "c" && event.ctrlKey && !termInput.value && !String(window.getSelection())) {
        // Ctrl+C with nothing to copy interrupts the running command
        event.preventDefault()
        termWrite("^C\n")
        window.fw.term.interrupt()
      }
    })

    if (!terminalStarted) startShell(folder, headRow)
    setTimeout(function () {
      termInput.focus()
    }, 60)
  }

  const termHistory = []
  let termIndex = -1

  function startShell(folder, headRow) {
    terminalStarted = true
    window.fw.term
      .start(folder)
      .then(function (info) {
        if (info && info.cwd) {
          termCwd = info.cwd
          const path = headRow && headRow.querySelector(".path")
          if (path) {
            path.textContent = info.cwd
            path.title = info.cwd
          }
        }
      })
      .catch(function (problem) {
        terminalStarted = false
        termWrite("Could not start a shell: " + problem.message + "\n")
      })
  }

  function clearTerminal() {
    termText = ""
    if (termOut) termOut.textContent = ""
  }

  function restartTerminal() {
    window.fw.term.stop().then(function () {
      terminalStarted = false
      termCwd = ""
      if (S.panel === "terminal") render()
    })
  }

  /* ----------------------------------------------------------- computer */

  function renderComputer() {
    const wrap = h("div")
    const info = S.deviceInfo || {}
    const state = S.device.state || "off"
    const online = state === "online"
    wrap.appendChild(
      h("div", { class: "comp-status" }, [
        h("div", { class: "avatar-sq", html: icon("monitor", 16) }),
        h("div", { class: "meta" }, [h("b", { text: S.hostname || info.hostname || "This computer" }), h("span", { text: online ? "Connected \u00b7 " + platformName() : state === "connecting" ? "Connecting\u2026" : "Not connected" })]),
        h("span", { class: "status-dot " + (online ? "online" : state === "connecting" ? "connecting" : "") })
      ])
    )
    if (!online) {
      wrap.appendChild(
        h("div", { style: "padding:8px 4px" }, [
          h("div", { class: "comp-note", text: "The agent can only use this computer while it is connected." }),
          h("button", { class: "btn sm", style: "margin-top:8px", text: "Connect this computer", onclick: connect })
        ])
      )
    }

    wrap.appendChild(h("div", { class: "group-title" }, [h("span", { text: "Quick actions" })]))
    const quick = h("div", { class: "quick" })
    const actions = [
      { icon: "eye", label: "Screenshot", run: screenshot },
      { icon: "app", label: "Open an app", run: function () { openApps() } },
      { icon: "folder", label: "My files", run: function () { window.fw.openPath(S.prefs.folder || info.home || "") } },
      { icon: "image", label: "Wallpaper", run: function () { window.fw.device.settings("wallpaper") } },
      { icon: "monitor", label: "Display", run: function () { window.fw.device.settings("display") } },
      { icon: "stopCircle", label: "Stop all", run: function () { window.fw.device.panic(); U.toast("Stopped everything") } }
    ]
    actions.forEach(function (action) {
      quick.appendChild(h("button", { onclick: action.run }, [h("span", { html: icon(action.icon, 13) }), h("span", { text: action.label })]))
    })
    wrap.appendChild(quick)

    const shotBox = h("div", { class: "shot-wrap" + (lastShot || shotBusy ? "" : " hidden"), id: "shotBox" })
    if (shotBusy) shotBox.appendChild(h("div", { class: "shot-note", text: "Taking a screenshot\u2026" }))
    else if (lastShot) putShot(shotBox, lastShot)
    wrap.appendChild(shotBox)

    wrap.appendChild(h("div", { class: "group-title" }, [h("span", { text: "Apps" }), h("button", { class: "apps-load", text: appsLoaded ? "Refresh" : "Load apps", onclick: function () { openApps(true) } })]))
    const search = h("input", { type: "text", placeholder: "Search apps", spellcheck: "false" })
    const appList = h("div", { class: "app-list", id: "appList" })
    wrap.appendChild(h("div", { class: "apps-search" }, [search]))
    wrap.appendChild(appList)
    search.addEventListener("input", function () {
      renderApps(appList, search.value.trim().toLowerCase())
    })
    if (appsLoaded) renderApps(appList, "")

    wrap.appendChild(h("div", { class: "group-title" }, [h("span", { text: "Recent activity" })]))
    const feed = h("div", { class: "feed" })
    S.feed.slice(-30).reverse().forEach(function (event) {
      feed.appendChild(feedRow(event))
    })
    if (!S.feed.length) feed.appendChild(h("div", { class: "comp-note", text: "Nothing yet. Ask the agent to do something on this computer." }))
    wrap.appendChild(feed)

    const auto = !!(S.user && S.user.settings && S.user.settings.desktop_auto)
    wrap.appendChild(
      h("div", { class: "comp-toggle" }, [
        h("div", {}, [h("div", { text: "Act without asking" }), h("div", { class: "sub", text: "Commands and clicks run straight away. Keep it off if you want to approve each step." })]),
        switchButton(auto, function (value) {
          updateSetting({ desktop_auto: value })
        })
      ])
    )
    wrap.appendChild(
      h("div", { class: "comp-toggle" }, [
        h("div", {}, [h("div", { text: "Pause the agent" }), h("div", { class: "sub", text: "Blocks every new action on this computer until you turn it back on." })]),
        switchButton(!!S.devicePaused, function (value) {
          S.devicePaused = value
          window.fw.device.pause(value)
          if (S.panel === "computer") render()
        })
      ])
    )
    wrap.appendChild(h("div", { class: "comp-note", text: "Press " + U.key("Mod+Alt+Shift+X") + " at any time to stop everything." }))
    body.appendChild(wrap)
  }

  function platformName() {
    const platform = (S.deviceInfo && S.deviceInfo.platform) || S.platform || "linux"
    if (platform === "darwin") return "macOS"
    if (platform === "win32") return "Windows"
    return "Linux"
  }

  function switchButton(on, onChange) {
    const node = h("button", { class: "switch" + (on ? " on" : ""), type: "button", role: "switch" })
    node.addEventListener("click", function () {
      node.classList.toggle("on")
      onChange(node.classList.contains("on"))
    })
    return node
  }

  async function updateSetting(patch) {
    try {
      const data = await window.fw.api("/api/auth/settings", "POST", { settings: patch })
      if (data && data.user) S.user = data.user
      U.toast(Object.keys(patch)[0] === "desktop_auto" && patch.desktop_auto ? "The agent can act without asking now" : "Saved")
    } catch (problem) {
      U.toast(problem.message || "Could not save that setting", "bad")
    }
  }

  async function connect() {
    try {
      await window.fw.device.connect()
      U.toast("Connecting\u2026")
    } catch (problem) {
      U.toast(problem.message || "Could not connect", "bad")
    }
  }

  function putShot(box, result) {
    box.innerHTML = ""
    const image = h("img", { src: result.data, class: "zoom", alt: "This computer", title: "Click to enlarge" })
    box.appendChild(image)
    box.appendChild(h("div", { class: "shot-note" }, [h("span", { text: result.width + " \u00d7 " + result.height + " \u00b7 just now" }), h("button", { class: "icon-btn", html: icon("close", 11), title: "Hide", onclick: function () { lastShot = null; box.classList.add("hidden") } })]))
    image.addEventListener("click", function () {
      const back = h("div", { class: "modal-back" }, [h("img", { src: result.data, style: "max-width:92vw;max-height:92vh;border-radius:8px;box-shadow:var(--shadow-2)" })])
      back.addEventListener("click", function () { back.remove() })
      document.body.appendChild(back)
    })
  }

  async function screenshot() {
    if (shotBusy) return
    shotBusy = true
    render()
    try {
      const result = await window.fw.device.screenshot()
      lastShot = result
      shotBusy = false
      render()
    } catch (problem) {
      shotBusy = false
      lastShot = null
      render()
      U.toast(problem.message || "Screen access was refused.", "bad", 5000)
    }
  }

  function openApps(force) {
    const load = async function () {
      const result = await window.fw.device.apps(!!force)
      appsCache = result.apps || []
      appsLoaded = true
      const list = document.getElementById("appList")
      const search = document.querySelector(".apps-search input")
      const reload = document.querySelector(".apps-load")
      if (reload) reload.textContent = "Refresh"
      if (list) renderApps(list, search ? search.value.trim().toLowerCase() : "")
      else if (S.panel === "computer") render()
    }
    load().catch(function (problem) {
      U.toast(problem.message || "Could not read the app list", "bad")
    })
  }

  function renderApps(host, query) {
    if (!host) return
    host.innerHTML = ""
    if (!appsLoaded) {
      host.appendChild(h("div", { class: "comp-note", text: "Load the apps installed on this computer to open them from here." }))
      return
    }
    const items = appsCache.filter(function (app) {
      return !query || app.name.toLowerCase().indexOf(query) >= 0
    })
    if (!items.length) {
      host.appendChild(h("div", { class: "comp-note", text: "No app matches that." }))
      return
    }
    items.slice(0, 80).forEach(function (app) {
      host.appendChild(
        h("button", { class: "app-row", title: app.target, onclick: function () { window.fw.device.openApp(app.name).then(function (r) { if (!r.ok) U.toast(r.text, "bad") }) } }, [h("span", { class: "app-name", text: app.name }), h("span", { class: "open", text: "Open" })])
      )
    })
  }

  function feedRow(event) {
    const text = event.text || (event.type === "shell" ? "Ran a command" : event.type === "error" ? "Failed" : event.type || "Action")
    return h("div", { class: "feed-row", title: text }, [h("span", { class: "what", text: L.shorten(text, 80) }), h("span", { class: "when", text: U.clock(event.time || Date.now()) })])
  }

  window.FW = window.FW || {}
  window.FW.panel = { init: init, render: render, show: show, setChanges: setChanges, loadGit: loadGit }
})()
