/* Right panel: tabs you choose (Changes, Terminal, Computer, Browser, Plan,
   Timeline, Rules), added with +, closed with x and dragged to reorder. */
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
    { id: "changes", label: "Changes", icon: "branch", hint: "Files the agent changed" },
    { id: "terminal", label: "Terminal", icon: "terminal", hint: "A shell on this computer" },
    { id: "computer", label: "Computer", icon: "monitor", hint: "Screen, apps and what the agent did" },
    { id: "browser", label: "Browser", icon: "globe", hint: "Preview pages and sites" },
    { id: "plan", label: "Plan", icon: "list", hint: "The agent's plan and to-do list" },
    { id: "timeline", label: "Timeline", icon: "clock", hint: "Every step of this chat" },
    { id: "rules", label: "Rules", icon: "book", hint: "FORKWISE.md: what the agent should know" },
    { id: "problems", label: "Problems", icon: "alert", hint: "Errors and warnings in the project's code" }
  ]
  const DEFAULT_TABS = ["changes", "terminal", "computer", "browser", "plan"]

  let following = false
  let problemTimer = null
  let browserUrl = ""
  const browserBack = []
  const browserForward = []
  let rulesText = null
  let rulesFile = ""
  let rulesDirty = false

  function openTabs() {
    const saved = Array.isArray(S.prefs.panelTabs) ? S.prefs.panelTabs : DEFAULT_TABS
    const known = saved.filter(function (id) {
      return TABS.some(function (tab) {
        return tab.id === id
      })
    })
    return known.length ? known : DEFAULT_TABS.slice()
  }

  function saveTabs(list) {
    S.prefs.panelTabs = list
    FW.store.savePrefs({ panelTabs: list })
  }

  function tabInfo(id) {
    return TABS.find(function (tab) {
      return tab.id === id
    })
  }

  function init() {
    head = document.getElementById("panelHead")
    body = document.getElementById("panelBody")
    following = !!S.prefs.follow
    FW.store.on("timeline", timelineChanged)
    FW.store.on("problems", function () {
      if (S.panelOpen && S.panel === "problems") {
        clearTimeout(problemTimer)
        problemTimer = setTimeout(render, 400)
      }
    })
    FW.store.on("plan", function () {
      if (S.panelOpen && S.panel === "plan") render()
    })
    FW.store.on("chat:loaded", function () {
      rulesText = null
      if (S.panelOpen && (S.panel === "timeline" || S.panel === "plan" || S.panel === "rules")) render()
    })
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
    const list = openTabs()
    if (list.indexOf(S.panel) < 0) S.panel = list[0]
    head.innerHTML = ""
    const strip = h("div", { class: "panel-tabs" })
    let dragging = ""
    list.forEach(function (id) {
      const tab = tabInfo(id)
      const count = id === "changes" && S.changedFiles && S.changedFiles.length ? h("span", { class: "count", text: String(S.changedFiles.length) }) : id === "plan" && S.todos && S.todos.length ? h("span", { class: "count", text: doneCount() + "/" + S.todos.length }) : null
      const close = list.length > 1 ? h("span", { class: "tab-x", title: "Close tab", html: icon("close", 9) }) : null
      const button = h("button", { class: "tab" + (S.panel === id ? " on" : ""), title: tab.hint, draggable: "true", dataset: { tab: id } }, [h("span", { text: tab.label }), count, close])
      button.addEventListener("click", function (event) {
        if (close && close.contains(event.target)) {
          event.stopPropagation()
          removeTab(id)
          return
        }
        show(id)
      })
      button.addEventListener("mousedown", function (event) {
        if (event.button === 1 && list.length > 1) {
          event.preventDefault()
          removeTab(id)
        }
      })
      button.addEventListener("dragstart", function (event) {
        dragging = id
        event.dataTransfer.setData("text/fw-panel", id)
        button.classList.add("dragging")
      })
      button.addEventListener("dragend", function () {
        button.classList.remove("dragging")
      })
      button.addEventListener("dragover", function (event) {
        if (Array.prototype.indexOf.call(event.dataTransfer.types, "text/fw-panel") < 0) return
        event.preventDefault()
        button.classList.add("drop-before")
      })
      button.addEventListener("dragleave", function () {
        button.classList.remove("drop-before")
      })
      button.addEventListener("drop", function (event) {
        const moving = event.dataTransfer.getData("text/fw-panel") || dragging
        button.classList.remove("drop-before")
        if (!moving || moving === id) return
        event.preventDefault()
        const next = openTabs().filter(function (item) {
          return item !== moving
        })
        next.splice(next.indexOf(id), 0, moving)
        saveTabs(next)
        render()
      })
      strip.appendChild(button)
    })
    head.appendChild(strip)
    const missing = TABS.filter(function (tab) {
      return list.indexOf(tab.id) < 0
    })
    head.appendChild(h("button", {
      class: "icon-btn",
      title: missing.length ? "Add a tab" : "All tabs are open",
      html: icon("plus", 13),
      onclick: function (event) {
        addMenu(event.currentTarget)
      }
    }))
    head.appendChild(h("button", {
      class: "icon-btn follow-btn" + (following ? " on" : ""),
      style: "margin-left:auto",
      title: following ? "Following the agent: the panel and editor switch to what it is doing (click to stop)" : "Follow the agent",
      html: icon(following ? "eye" : "eyeOff", 13),
      onclick: toggleFollow
    }))
    head.appendChild(
      h("button", {
        class: "icon-btn",
        title: "Close panel (" + U.key("Mod+B") + ")",
        html: icon("close", 13),
        onclick: function () {
          FW.app.togglePanel(false)
        }
      })
    )
    body.innerHTML = ""
    termOut = null
    body.className = "panel-body" + (S.panel === "terminal" || S.panel === "browser" ? " flush" : "")
    if (S.panel === "changes") renderChanges()
    if (S.panel === "terminal") renderTerminal()
    if (S.panel === "computer") renderComputer()
    if (S.panel === "browser") renderBrowser()
    if (S.panel === "plan") renderPlan()
    if (S.panel === "timeline") renderTimeline()
    if (S.panel === "rules") renderRules()
    if (S.panel === "problems") renderProblems()
  }

  function renderProblems() {
    const list = FW.editor && FW.editor.problems ? FW.editor.problems() : []
    const wrap = h("div")
    if (!list.length) {
      wrap.appendChild(h("div", { class: "panel-empty" }, [h("div", { html: icon("check", 18) }), h("div", { text: S.intelFiles ? "No problems found in " + S.intelFiles + " files. JS and TS files are checked as you edit." : "Open a JS or TS file to check the project for errors." })]))
      body.appendChild(wrap)
      return
    }
    const errors = list.filter(function (item) { return item.severity === "error" }).length
    wrap.appendChild(h("div", { class: "panel-section-title", text: errors + " errors \u00b7 " + (list.length - errors) + " warnings" }))
    let last = ""
    list.slice(0, 500).forEach(function (item) {
      if (item.path !== last) {
        last = item.path
        wrap.appendChild(h("div", { class: "hit-file", style: "padding:0 2px", title: item.path }, [h("span", { class: "file-ico", html: FW.explorer.fileIcon(item.path.split("/").pop()) }), h("span", { text: item.path.split("/").pop() }), h("span", { class: "dim", text: item.path })]))
      }
      const row = h("button", { class: "problem-row " + item.severity, type: "button", title: item.message }, [
        h("span", { class: "problem-ico", html: icon("alert", 11) }),
        h("span", { class: "problem-text", text: item.message }),
        h("span", { class: "problem-pos", text: item.line + ":" + item.col })
      ])
      row.addEventListener("click", function () {
        FW.editor.open(item.path, { pin: true, line: item.line, col: item.col })
      })
      wrap.appendChild(row)
    })
    wrap.appendChild(h("div", { style: "margin-top:10px" }, [h("button", { class: "btn sm", text: "Ask the agent to fix these", onclick: function () {
      const text = list.slice(0, 40).map(function (item) { return "- @" + item.path + ":" + item.line + " " + item.message }).join("\n")
      FW.composer.fill("Fix these problems in the project, then check that they are gone:\n" + text)
    } })]))
    body.appendChild(wrap)
  }

  function addMenu(anchor) {
    const list = openTabs()
    const items = TABS.map(function (tab) {
      return { value: tab.id, label: tab.label, hint: tab.hint, icon: tab.icon, checked: list.indexOf(tab.id) >= 0 }
    })
    items.push({ separator: true })
    items.push({ value: "reset", label: "Reset tabs", icon: "refresh" })
    U.menu(anchor, items, function (value) {
      if (value === "reset") {
        saveTabs(DEFAULT_TABS.slice())
        render()
        return
      }
      const current = openTabs()
      if (current.indexOf(value) >= 0) {
        if (current.length > 1) removeTab(value)
        return
      }
      current.push(value)
      saveTabs(current)
      show(value)
    }, { className: "wide" })
  }

  function removeTab(id) {
    const list = openTabs().filter(function (item) {
      return item !== id
    })
    if (!list.length) return
    saveTabs(list)
    if (S.panel === id) S.panel = list[0]
    render()
  }

  function toggleFollow() {
    following = !following
    FW.store.savePrefs({ follow: following })
    U.toast(following ? "Following the agent" : "Stopped following")
    render()
  }

  // Following: show the place the agent is working right now.
  function follow(kind, info) {
    if (!following) return
    if (kind === "file" && FW.editor) FW.editor.follow(info.path)
    if (kind === "preview" && info.url) {
      FW.app.togglePanel(true)
      browse(info.url)
    }
    if (kind === "todos") {
      FW.app.togglePanel(true)
      show("plan")
    }
    if (kind === "screen") {
      FW.app.togglePanel(true)
      show("computer")
    }
  }

  function show(tab) {
    if (!S.panelOpen) {
      S.panel = tab
      FW.app.togglePanel(true)
    }
    if (openTabs().indexOf(tab) < 0) {
      const list = openTabs()
      list.push(tab)
      saveTabs(list)
    }
    S.panel = tab
    FW.store.savePrefs({ panel: tab })
    render()
    if (tab === "changes") loadGit()
  }

  /* ------------------------------------------------------------ browser */

  function normalUrl(value) {
    const text = String(value || "").trim()
    if (!text) return ""
    if (/^https?:\/\//i.test(text)) return text
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i.test(text)) return "http://" + text
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(text)) return "https://" + text
    return "https://duckduckgo.com/?q=" + encodeURIComponent(text)
  }

  function browse(url, fromHistory) {
    const next = normalUrl(url)
    if (!next) return
    if (browserUrl && !fromHistory) {
      browserBack.push(browserUrl)
      browserForward.length = 0
    }
    browserUrl = next
    if (S.panel === "browser") render()
    else show("browser")
  }

  function renderBrowser() {
    const wrap = h("div", { class: "browser" })
    const input = h("input", { type: "text", value: browserUrl, placeholder: "Type a URL, e.g. localhost:3000", spellcheck: "false" })
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") browse(input.value)
    })
    input.addEventListener("focus", function () {
      input.select()
    })
    const bar = h("div", { class: "browser-bar" }, [
      h("button", { class: "view-btn", title: "Back", html: icon("arrowLeft", 13), disabled: !browserBack.length, onclick: function () { if (browserBack.length) { browserForward.push(browserUrl); browserUrl = browserBack.pop(); render() } } }),
      h("button", { class: "view-btn", title: "Forward", html: icon("arrowRight", 13), disabled: !browserForward.length, onclick: function () { if (browserForward.length) { browserBack.push(browserUrl); browserUrl = browserForward.pop(); render() } } }),
      h("button", { class: "view-btn", title: "Reload", html: icon("refresh", 13), onclick: function () { const frame = wrap.querySelector("iframe"); if (frame) frame.src = browserUrl } }),
      input,
      h("button", { class: "view-btn", title: "Open in your browser", html: icon("external", 13), onclick: function () { if (browserUrl) window.fw.openExternal(browserUrl) } })
    ])
    wrap.appendChild(bar)
    if (browserUrl) {
      const frame = h("iframe", { src: browserUrl, sandbox: "allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads", referrerpolicy: "no-referrer" })
      wrap.appendChild(frame)
    } else {
      wrap.appendChild(h("div", { class: "browser-empty" }, [h("div", {}, [
        h("div", { text: "Preview a local app or open a page here." }),
        h("div", { style: "margin-top:6px", text: "When the agent starts a preview it shows up here. Some sites do not allow being shown inside another app; open those in your browser." })
      ])]))
      setTimeout(function () {
        input.focus()
      }, 30)
    }
    body.appendChild(wrap)
  }

  /* --------------------------------------------------------------- plan */

  function doneCount() {
    return (S.todos || []).filter(function (todo) {
      return todo.status === "completed" || todo.status === "done"
    }).length
  }

  function renderPlan() {
    const wrap = h("div")
    const todos = S.todos || []
    if (!todos.length && !S.planText) {
      wrap.appendChild(h("div", { class: "panel-empty" }, [h("div", { html: icon("list", 18) }), h("div", { text: "No plan yet. When the agent breaks a task into steps, they show up here with their progress. Switch to Plan mode to get a plan before any change." })]))
      body.appendChild(wrap)
      return
    }
    if (todos.length) {
      const done = doneCount()
      wrap.appendChild(h("div", { class: "panel-section-title", text: "To-do · " + done + " of " + todos.length + " done" }))
      const bar = h("div", { class: "plan-progress" }, [h("span", { style: "width:" + Math.round((done / todos.length) * 100) + "%" })])
      wrap.appendChild(bar)
      const list = h("div", { class: "todos" })
      todos.forEach(function (todo) {
        const status = String(todo.status || "")
        const mark = status === "completed" || status === "done" ? "check" : status === "in_progress" ? "play" : "dot"
        list.appendChild(h("div", { class: "todo " + status }, [h("span", { class: "todo-mark", html: icon(mark, 11) }), h("span", { dir: "auto", text: todo.content || todo.text || todo.title || "" })]))
      })
      wrap.appendChild(list)
    }
    if (S.planText) {
      wrap.appendChild(h("div", { class: "panel-section-title", style: "margin-top:16px", text: "Plan" }))
      wrap.appendChild(h("div", { class: "md", style: "font-size:13px", html: window.FWMarkdown.render(S.planText) }))
    }
    body.appendChild(wrap)
  }

  /* ----------------------------------------------------------- timeline */

  function renderTimeline() {
    const wrap = h("div", { class: "timeline" })
    const nodes = document.querySelectorAll(".thread-inner .turn-user, .thread-inner .act, .thread-inner .plan-card, .thread-inner .turn-error")
    if (!nodes.length) {
      wrap.appendChild(h("div", { class: "panel-empty" }, [h("div", { html: icon("clock", 18) }), h("div", { text: "Every step of this chat shows up here: your messages, commands, edits and errors. Click one to jump to it." })]))
      body.appendChild(wrap)
      return
    }
    Array.prototype.forEach.call(nodes, function (node) {
      let text = ""
      let meta = ""
      let kind = ""
      if (node.classList.contains("turn-user")) {
        text = (node.dataset.raw || "").replace(/\s+/g, " ").slice(0, 120)
        kind = "user"
      } else if (node.classList.contains("plan-card")) {
        text = "Plan ready for review"
      } else if (node.classList.contains("turn-error")) {
        text = node.textContent
        kind = "failed"
      } else {
        const label = node.querySelector(".act-text")
        const time = node.querySelector(".act-meta")
        text = label ? label.textContent : ""
        meta = time ? time.textContent : ""
        if (node.classList.contains("running")) kind = "running"
        if (node.classList.contains("failed")) kind = "failed"
      }
      const row = h("button", { class: "tl-row " + kind, type: "button", title: text }, [h("span", { class: "tl-text", dir: "auto", text: text }), meta ? h("span", { class: "tl-meta", text: meta }) : null])
      row.addEventListener("click", function () {
        node.scrollIntoView({ block: "center", behavior: "smooth" })
        node.classList.remove("flash")
        void node.offsetWidth
        node.classList.add("flash")
      })
      wrap.appendChild(row)
    })
    body.appendChild(wrap)
    body.scrollTop = body.scrollHeight
  }

  let timelineTimer = null
  function timelineChanged() {
    if (S.panel !== "timeline" || !S.panelOpen) return
    clearTimeout(timelineTimer)
    timelineTimer = setTimeout(render, 250)
  }

  /* -------------------------------------------------------------- rules */

  async function renderRules() {
    const folder = (S.chat && S.chat.local_path) || (FW.wb && FW.wb.root()) || S.folder
    const wrap = h("div", { class: "rules" })
    body.appendChild(wrap)
    if (!folder) {
      wrap.appendChild(h("div", { class: "panel-empty" }, [h("div", { html: icon("book", 18) }), h("div", { text: "Open a folder to write rules for its project: how to run it, the stack, the style to follow. The agent reads FORKWISE.md at the start of every task." })]))
      return
    }
    if (rulesText === null || rulesFile.indexOf(folder) !== 0) {
      rulesText = ""
      rulesFile = ""
      const names = ["FORKWISE.md", "AGENTS.md", "CLAUDE.md"]
      for (let index = 0; index < names.length; index += 1) {
        try {
          const data = await window.fw.wb.read(folder, names[index])
          if (data.kind === "text") {
            rulesText = data.text
            rulesFile = folder + "|" + names[index]
            break
          }
        } catch (problem) {}
      }
      if (!rulesFile) rulesFile = folder + "|FORKWISE.md"
      rulesDirty = false
    }
    const name = rulesFile.split("|").pop()
    const area = h("textarea", { spellcheck: "false", placeholder: "# Project rules\n\n- How to run: npm run dev\n- Tests: npm test\n- Style: small functions, no new libraries without asking\n" })
    area.value = rulesText
    const state = h("span", { class: "grow", text: rulesDirty ? "Not saved" : name + " in " + FW.wb.baseName(folder) })
    const saveBtn = h("button", { class: "btn sm primary", text: "Save", disabled: !rulesDirty })
    area.addEventListener("input", function () {
      rulesText = area.value
      rulesDirty = true
      state.textContent = "Not saved"
      saveBtn.disabled = false
    })
    area.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        event.stopPropagation()
        saveRules(folder, name, state, saveBtn)
      }
    })
    saveBtn.addEventListener("click", function () {
      saveRules(folder, name, state, saveBtn)
    })
    wrap.appendChild(h("div", { class: "panel-section-title", text: "What the agent should always know" }))
    wrap.appendChild(area)
    wrap.appendChild(h("div", { class: "rules-foot" }, [state, h("button", { class: "btn ghost sm", text: "Open in editor", onclick: function () { FW.editor.open(name, { root: folder, pin: true }) } }), h("button", { class: "btn ghost sm", text: "Let the agent write it", onclick: function () { FW.composer.fill("Look at this project and write a FORKWISE.md with: what it is, the stack, how to run, test and build it, and the conventions to follow.") } }), saveBtn]))
  }

  async function saveRules(folder, name, state, saveBtn) {
    try {
      await window.fw.wb.write(folder, name, rulesText)
      rulesDirty = false
      state.textContent = "Saved " + name
      saveBtn.disabled = true
    } catch (problem) {
      U.toast(problem.message || "Could not save the rules", "bad")
    }
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

  // A real terminal when this computer supports it, else the simple one.
  function renderTerminal() {
    const holder = h("div", { class: "terms-holder" })
    body.appendChild(holder)
    FW.terminals.mount(holder).then(function (ok) {
      if (!ok && holder.isConnected) {
        holder.remove()
        renderLineTerminal()
      }
    }).catch(function () {
      if (holder.isConnected) {
        holder.remove()
        renderLineTerminal()
      }
    })
  }

  function renderLineTerminal() {
    const folder = (S.chat && S.chat.local_path) || (FW.wb && FW.wb.root()) || S.folder || S.prefs.folder || ""
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
  window.FW.panel = {
    init: init,
    render: render,
    show: show,
    setChanges: setChanges,
    loadGit: loadGit,
    toggleFollow: toggleFollow,
    follow: follow,
    browse: browse,
    following: function () {
      return following
    }
  }
})()
