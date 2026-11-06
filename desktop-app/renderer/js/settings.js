/* Settings modal. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  let back = null
  let tab = "general"

  const TABS = [
    { id: "general", label: "General", icon: "settings", text: "Theme, density, chat and window" },
    { id: "agent", label: "Agent", icon: "spark", text: "How the agent works, where chats run and project rules" },
    { id: "models", label: "Models", icon: "cpu", text: "The default model and which models show in the picker" },
    { id: "skills", label: "Skills", icon: "sparkles", text: "Expert playbooks the agent loads for a task" },
    { id: "computer", label: "Computer", icon: "monitor", text: "This computer, your own Chrome and permissions" },
    { id: "editor", label: "Editor", icon: "code", text: "Font, tabs, wrapping and saving" },
    { id: "terminal", label: "Terminal", icon: "terminal", text: "Shell and terminal look" },
    { id: "keys", label: "Keyboard", icon: "keyboard", text: "Every shortcut in one place" },
    { id: "account", label: "Account", icon: "user", text: "Plan, usage and session" },
    { id: "about", label: "About", icon: "help", text: "Version and links" }
  ]
  let query = ""

  function open(which) {
    if (which) tab = which
    if (back) back.remove()
    query = ""
    const bar = document.getElementById("menubar")
    const top = bar ? Math.round(bar.getBoundingClientRect().bottom) : 0
    back = h("div", { class: "settings-page", style: "top:" + top + "px" })
    document.body.appendChild(back)
    document.addEventListener("keydown", escClose)
    draw(back)
    const search = back.querySelector(".sp-search input")
    if (search) search.focus()
  }

  function close() {
    if (back) back.remove()
    back = null
    document.removeEventListener("keydown", escClose)
  }

  function escClose(event) {
    if (event.key !== "Escape") return
    if (query && back) {
      query = ""
      const input = back.querySelector(".sp-search input")
      if (input) input.value = ""
      drawMain(back)
      return
    }
    close()
  }

  function draw(page) {
    page.innerHTML = ""
    const search = h("input", { type: "search", placeholder: "Search settings", spellcheck: "false", value: query })
    search.addEventListener("input", function () {
      query = search.value.trim().toLowerCase()
      drawMain(page)
      markNav(page)
    })
    const nav = h("nav", { class: "sp-nav" })
    TABS.forEach(function (item) {
      nav.appendChild(h("button", { class: "nav-item", dataset: { tab: item.id }, onclick: function () { tab = item.id; query = ""; search.value = ""; drawMain(page); markNav(page) } }, [h("span", { html: icon(item.icon, 15) }), h("span", { text: item.label })]))
    })
    const side = h("aside", { class: "sp-side" }, [
      h("div", { class: "sp-title" }, [h("b", { text: "Settings" })]),
      h("label", { class: "sp-search" }, [h("span", { html: icon("search", 13) }), search]),
      nav,
      h("div", { class: "sp-foot", text: "Forkwise " + (S.version || "") })
    ])
    const main = h("main", { class: "sp-main" })
    const closeBtn = h("button", { class: "icon-btn sp-close", title: "Close (Esc)", "aria-label": "Close settings", html: icon("close", 15), onclick: close })
    page.appendChild(side)
    page.appendChild(main)
    page.appendChild(closeBtn)
    drawMain(page)
    markNav(page)
  }

  function markNav(page) {
    Array.prototype.forEach.call(page.querySelectorAll(".sp-nav .nav-item"), function (button) {
      button.classList.toggle("on", !query && button.dataset.tab === tab)
    })
  }

  function fillPane(pane, id) {
    if (id === "general") paneGeneral(pane)
    if (id === "editor") paneEditor(pane)
    if (id === "agent") paneAgent(pane)
    if (id === "models") paneModels(pane)
    if (id === "skills") paneSkills(pane)
    if (id === "terminal") paneTerminal(pane)
    if (id === "account") paneAccount(pane)
    if (id === "computer") paneComputer(pane)
    if (id === "keys") paneKeys(pane)
    if (id === "about") paneAbout(pane)
    cardify(pane)
  }

  // Rows after each heading sit together in one card.
  function cardify(pane) {
    const kids = Array.prototype.slice.call(pane.childNodes)
    let card = null
    kids.forEach(function (node) {
      if (node.nodeType !== 1) return
      if (node.tagName === "H3") {
        card = null
        return
      }
      if (node.classList.contains("set-row") || node.classList.contains("set-plain")) {
        if (!card) {
          card = h("div", { class: "set-card" })
          pane.insertBefore(card, node)
        }
        card.appendChild(node)
        return
      }
      card = null
    })
  }

  function drawMain(page) {
    const main = page.querySelector(".sp-main")
    if (!main) return
    main.innerHTML = ""
    main.scrollTop = 0
    const inner = h("div", { class: "sp-inner" })
    main.appendChild(inner)
    if (!query) {
      const item = TABS.find(function (entry) { return entry.id === tab }) || TABS[0]
      inner.appendChild(h("h1", { text: item.label }))
      inner.appendChild(h("p", { class: "sp-lead", text: item.text }))
      const pane = h("div", { class: "modal-pane sp-pane" })
      inner.appendChild(pane)
      fillPane(pane, item.id)
      return
    }
    let found = 0
    TABS.forEach(function (item) {
      if (item.id === "skills" || item.id === "keys") return
      const pane = h("div", { class: "modal-pane sp-pane" })
      fillPane(pane, item.id)
      Array.prototype.forEach.call(pane.querySelectorAll(".set-row"), function (rowEl) {
        const hit = rowEl.textContent.toLowerCase().indexOf(query) >= 0
        rowEl.hidden = !hit
        if (hit) found += 1
      })
      Array.prototype.forEach.call(pane.querySelectorAll(".set-card"), function (card) {
        const any = Array.prototype.some.call(card.querySelectorAll(".set-row"), function (rowEl) { return !rowEl.hidden })
        card.hidden = !any
        const heading = card.previousElementSibling
        if (heading && heading.tagName === "H3") heading.hidden = !any
      })
      Array.prototype.forEach.call(pane.querySelectorAll(".set-note, .chrome-steps, .link-row:not(.set-row .link-row), .account-card"), function (node) {
        if (!node.closest(".set-card")) node.hidden = true
      })
      if (pane.querySelector(".set-row:not([hidden])")) {
        inner.appendChild(h("div", { class: "sp-group", text: item.label }))
        inner.appendChild(pane)
      }
    })
    if (!found) inner.appendChild(h("div", { class: "sp-empty", text: "No setting matches \u201c" + query + "\u201d." }))
  }

  function row(title, sub, control) {
    return h("div", { class: "set-row" }, [h("div", { class: "set-text" }, [h("b", { text: title }), sub ? h("span", { text: sub }) : null]), control])
  }

  function picker(options, value, onChange) {
    const wrap = h("div", { class: "seg" })
    options.forEach(function (option) {
      wrap.appendChild(
        h("button", { class: "seg-btn" + (option.value === value ? " on" : ""), text: option.label, onclick: function () { onChange(option.value) } })
      )
    })
    // rebuild highlight properly
    wrap.addEventListener("click", function (event) {
      const button = event.target.closest(".seg-btn")
      if (!button) return
      Array.prototype.forEach.call(wrap.children, function (child) { child.classList.remove("on") })
      button.classList.add("on")
    })
    return wrap
  }

  function toggle(on, onChange) {
    const node = h("button", { class: "switch" + (on ? " on" : ""), role: "switch", "aria-checked": on ? "true" : "false" })
    node.addEventListener("click", function () {
      node.classList.toggle("on")
      const value = node.classList.contains("on")
      node.setAttribute("aria-checked", value ? "true" : "false")
      onChange(value)
    })
    return node
  }

  function paneGeneral(pane) {
    pane.appendChild(h("h3", { text: "Appearance" }))
    pane.appendChild(
      row("Theme", "Follow the system or pick one.", picker([
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" }
      ], S.prefs.theme || "system", function (value) {
        FW.store.savePrefs({ theme: value })
        FW.app.applyTheme(value)
      }))
    )
    pane.appendChild(
      row("Density", "Compact fits more on the screen.", picker([
        { value: "comfortable", label: "Comfortable" },
        { value: "compact", label: "Compact" }
      ], S.prefs.density || "comfortable", function (value) {
        FW.store.savePrefs({ density: value })
        document.body.classList.toggle("compact", value === "compact")
      }))
    )
    pane.appendChild(
      row("Status bar", "Folder, branch, cursor, model and context at the bottom.", toggle(S.prefs.statusBar !== false, function (value) {
        FW.store.savePrefs({ statusBar: value })
        document.body.classList.toggle("no-status", !value)
      }))
    )
    pane.appendChild(h("h3", { text: "Chat" }))
    pane.appendChild(
      row("Send with", "Which key sends the message. The other one adds a new line.", picker([
        { value: "enter", label: "Enter" },
        { value: "mod-enter", label: U.key("Mod+Enter") }
      ], S.prefs.sendKey || "enter", function (value) {
        S.prefs.sendKey = value
        FW.store.savePrefs({ sendKey: value })
      }))
    )
    pane.appendChild(
      row("Notifications", "When a task finishes or the agent needs you while the app is in the background.", toggle(S.prefs.notify !== false, function (value) {
        S.prefs.notify = value
        FW.store.savePrefs({ notify: value })
      }))
    )
    pane.appendChild(
      row("Show the thinking steps", "Keep the reasoning lines in the conversation.", toggle(S.prefs.showThinking !== false, function (value) {
        FW.store.savePrefs({ showThinking: value })
        document.documentElement.classList.toggle("hide-thinking", !value)
      }))
    )
    pane.appendChild(
      row("Keep the panel open", "Show Changes, Terminal and Computer on the right.", toggle(!!S.panelOpen, function (value) {
        FW.app.togglePanel(value)
      }))
    )
    pane.appendChild(
      row("Keep running when closed", "The window hides instead of quitting, so the agent stays reachable.", toggle(!!S.prefs.background, function (value) {
        FW.store.savePrefs({ background: value })
      }))
    )
  }

  function setEditor(values) {
    Object.assign(S.prefs, values)
    FW.store.savePrefs(values)
    if (FW.editor) FW.editor.applyOptions()
  }

  function number(value, min, max, onChange) {
    const input = h("input", { class: "set-number", type: "number", min: String(min), max: String(max), value: String(value) })
    input.addEventListener("change", function () {
      const next = Math.max(min, Math.min(max, parseInt(input.value, 10) || value))
      input.value = String(next)
      onChange(next)
    })
    return input
  }

  function paneEditor(pane) {
    const prefs = S.prefs
    pane.appendChild(h("h3", { text: "Text" }))
    pane.appendChild(row("Font size", "Size of the code in the editor.", number(prefs.editorFontSize || 13, 9, 28, function (value) { setEditor({ editorFontSize: value }) })))
    pane.appendChild(row("Tab size", "Spaces per indent level.", picker([{ value: 2, label: "2" }, { value: 4, label: "4" }, { value: 8, label: "8" }], prefs.tabSize || 2, function (value) { setEditor({ tabSize: value }) })))
    pane.appendChild(row("Indent with spaces", "Off uses tab characters.", toggle(prefs.insertSpaces !== false, function (value) { setEditor({ insertSpaces: value }) })))
    pane.appendChild(row("Word wrap", "Wrap long lines instead of scrolling sideways.", toggle(!!prefs.wordWrap, function (value) { setEditor({ wordWrap: value }) })))
    pane.appendChild(h("h3", { text: "View" }))
    pane.appendChild(row("Minimap", "The small map of the file on the right.", toggle(prefs.minimap !== false, function (value) { setEditor({ minimap: value }) })))
    pane.appendChild(row("Sticky scroll", "Keep the current function or class name on top while scrolling.", toggle(prefs.stickyScroll !== false, function (value) { setEditor({ stickyScroll: value }) })))
    pane.appendChild(row("Line numbers", null, toggle(prefs.lineNumbers !== false, function (value) { setEditor({ lineNumbers: value }) })))
    pane.appendChild(row("Changes side by side", "Off shows changes in one column.", toggle(prefs.diffInline !== true, function (value) { setEditor({ diffInline: !value }) })))
    pane.appendChild(h("h3", { text: "Saving" }))
    pane.appendChild(row("Auto save", "Save a second after you stop typing.", toggle(prefs.autoSave === "delay", function (value) { setEditor({ autoSave: value ? "delay" : "off" }) })))
  }

  function paneAgent(pane) {
    const prefs = S.prefs
    pane.appendChild(h("h3", { text: "Working with the agent" }))
    pane.appendChild(row("Follow the agent", "The panel and the editor switch to the file, preview or plan the agent is working on.", toggle(!!prefs.follow, function (value) {
      FW.store.savePrefs({ follow: value })
      if (FW.panel && FW.panel.following() !== value) FW.panel.toggleFollow()
    })))
    pane.appendChild(row("Default mode", "How new chats start.", picker([
      { value: "auto", label: "Agent" },
      { value: "ask", label: "Ask first" },
      { value: "plan", label: "Plan" }
    ], prefs.mode || "auto", function (value) {
      FW.store.savePrefs({ mode: value })
      S.prefs.mode = value
      if (FW.composer) FW.composer.refresh()
    })))
    pane.appendChild(h("h3", { text: "Where chats run" }))
    pane.appendChild(row("Run new chats on", "This computer runs commands, the terminal and the project on your own machine, like Cursor. Cloud uses the Forkwise sandbox on the server.", picker([
      { value: "local", label: "This computer" },
      { value: "cloud", label: "Cloud sandbox" }
    ], prefs.runWhere === "cloud" ? "cloud" : "local", function (value) {
      FW.store.savePrefs({ runWhere: value })
      S.prefs.runWhere = value
      if (FW.composer) FW.composer.renderChips()
    })))
    const folderText = h("span", { class: "mono set-path", text: prefs.folder || "~/Forkwise (made for you)" })
    pane.appendChild(row("Folder for new chats", "Used when no folder is open and the message names none. A folder written in the message always wins.", h("div", { class: "set-inline" }, [
      folderText,
      h("button", { class: "btn sm", text: "Choose", onclick: async function () {
        const result = await window.fw.pickFolder()
        if (!result.folder) return
        FW.store.savePrefs({ folder: result.folder })
        S.prefs.folder = result.folder
        S.folder = result.folder
        folderText.textContent = result.folder
        if (FW.composer) FW.composer.renderChips()
      } }),
      prefs.folder ? h("button", { class: "btn sm ghost", text: "Clear", onclick: function () {
        FW.store.savePrefs({ folder: "" })
        S.prefs.folder = ""
        S.folder = ""
        folderText.textContent = "~/Forkwise (made for you)"
        if (FW.composer) FW.composer.renderChips()
      } }) : null
    ])))
    pane.appendChild(h("h3", { text: "Project" }))
    const folder = (S.chat && S.chat.local_path) || (FW.wb && FW.wb.root()) || ""
    pane.appendChild(row("Project rules", folder ? "FORKWISE.md in " + FW.wb.baseName(folder) + ". The agent reads it at the start of every task." : "Open a folder first.", h("button", { class: "btn sm", text: "Edit rules", disabled: !folder, onclick: function () { close(); FW.wb.run("agent.rules") } })))
    pane.appendChild(row("Panel tabs", "Add, remove and reorder them with + and by dragging in the panel.", h("button", { class: "btn sm", text: "Reset tabs", onclick: function () { FW.store.savePrefs({ panelTabs: null }); S.prefs.panelTabs = null; FW.panel.render(); U.toast("Panel tabs reset") } })))
  }

  function paneAccount(pane) {
    const user = S.user || {}
    pane.appendChild(h("h3", { text: "Signed in" }))
    const card = h("div", { class: "account-card" }, [
      h("span", { class: "avatar lg", text: U.initials(user.name || user.email) }),
      h("div", {}, [h("b", { text: user.name || "Forkwise user" }), h("span", { text: user.email || "" })]),
      user.is_admin ? h("span", { class: "pill", text: "admin" }) : null
    ])
    pane.appendChild(card)
    pane.appendChild(h("h3", { text: "Plan and usage" }))
    const plan = (S.plan && (S.plan.name || S.plan.id)) || "Free"
    pane.appendChild(row("Plan", null, h("span", { class: "mono", text: plan })))
    const usage = S.usage || {}
    const used = usage.tokens || usage.total || 0
    pane.appendChild(row("Tokens used today", null, h("span", { class: "mono", text: used ? used.toLocaleString() : "0" })))
    pane.appendChild(row("App version", null, h("span", { class: "mono", text: S.version || "\u2014" })))
    pane.appendChild(h("h3", { text: "Links" }))
    const links = h("div", { class: "link-row" })
    ;[
      { text: "Open forkwiseai.com", url: "https://forkwiseai.com" },
      { text: "Dashboard", url: "https://forkwiseai.com/app" },
      { text: "Billing", url: "https://forkwiseai.com/billing" }
    ].forEach(function (item) {
      links.appendChild(h("button", { class: "btn sm", text: item.text, onclick: function () { window.fw.openExternal(item.url) } }))
    })
    pane.appendChild(links)
    pane.appendChild(h("h3", { text: "Session" }))
    pane.appendChild(
      h("div", { class: "link-row" }, [
        h("button", { class: "btn sm", text: "Refresh session", onclick: function () { FW.app.reloadSession(); U.toast("Session refreshed") } }),
        h("button", { class: "btn sm danger", text: "Sign out", onclick: function () { close(); FW.app.signOut() } })
      ])
    )
  }

  function paneComputer(pane) {
    const info = S.deviceInfo || {}
    const status = S.device.state || "off"
    pane.appendChild(h("h3", { text: "This computer" }))
    pane.appendChild(row(info.hostname || S.hostname || "Connected machine", (info.platform || S.platform || "") + (info.release ? " " + info.release : ""), h("span", { class: "status-dot " + (status === "online" ? "online" : "") })))
    pane.appendChild(
      row("Connection", status === "online" ? "The agent can use this computer." : "Not connected.", h("button", { class: "btn sm", text: status === "online" ? "Reconnect" : "Connect", onclick: function () { window.fw.device.connect(); U.toast("Connecting\u2026") } }))
    )
    const auto = !!(S.user && S.user.settings && S.user.settings.desktop_auto)
    pane.appendChild(
      row("Act without asking", "Approvals are skipped for commands, clicks and file writes.", toggle(auto, function (value) {
        window.fw.api("/api/auth/settings", "POST", { settings: { desktop_auto: value } }).then(function (data) {
          if (data && data.user) S.user = data.user
          U.toast(value ? "Approvals are off" : "Approvals are on again")
        }).catch(function (problem) { U.toast(problem.message || "Could not save", "bad") })
      }))
    )
    paneChrome(pane)
    pane.appendChild(h("h3", { text: "Permissions" }))
    const notes = [
      "macOS asks once for Screen Recording and Accessibility before the agent can see or control windows.",
      "On Linux, X11 works out of the box. Wayland limits automation to the tools your desktop exposes.",
      "Windows works through PowerShell and the built-in automation helpers."
    ]
    notes.forEach(function (text) {
      pane.appendChild(h("div", { class: "set-note", text: text }))
    })
    if (S.platform === "darwin") {
      pane.appendChild(
        h("div", { class: "link-row" }, [
          h("button", { class: "btn sm", text: "Open Screen Recording", onclick: function () { window.fw.device.settings("screen") } }),
          h("button", { class: "btn sm", text: "Open Accessibility", onclick: function () { window.fw.device.settings("accessibility") } })
        ])
      )
    }
    pane.appendChild(h("h3", { text: "Emergency stop" }))
    pane.appendChild(row("Stop everything", "Kills running actions and releases the mouse and keyboard.", h("button", { class: "btn sm danger", text: "Stop now", onclick: function () { window.fw.device.panic(); U.toast("Stopped") } })))
    pane.appendChild(h("div", { class: "set-note", text: "The global shortcut " + U.key("Mod+Alt+Shift+X") + " does the same from anywhere." }))
  }

  function paneChrome(pane) {
    pane.appendChild(h("h3", { text: "Your own Chrome" }))
    const box = h("div", { class: "chrome-box" })
    pane.appendChild(box)
    function fill(state) {
      box.innerHTML = ""
      const on = !!state.connected
      box.appendChild(row(
        on ? "Connected: " + (state.browser || "your browser") : "Not connected",
        on ? "The agent can open tabs in your own browser, signed in as you, on the sites you allow." : "Add Forkwise for Chrome so the agent can work in your own Chrome, Edge or Brave with your sign-ins.",
        h("span", { class: "status-dot " + (on ? "online" : "") })
      ))
      if (on) {
        box.appendChild(h("div", { class: "set-note", text: "The agent only uses tabs in the purple Forkwise tab group and asks before every new site. Manage allowed sites from the Forkwise button in the browser toolbar." }))
        return
      }
      const steps = h("ol", { class: "chrome-steps" }, [
        h("li", { text: "Press Set up. Forkwise opens the extensions page and copies the extension folder path." }),
        h("li", { text: "Turn on Developer mode (top right), then press Load unpacked." }),
        h("li", { text: "Paste the path into the folder box and press Select folder. The Forkwise button appears in the toolbar." })
      ])
      box.appendChild(steps)
      box.appendChild(h("div", { class: "link-row" }, [
        h("button", { class: "btn sm primary", text: "Set up", onclick: async function () {
          const result = await window.fw.chrome.install()
          U.toast(result.opened ? "Path copied. Paste it after Load unpacked." : "Path copied. Open chrome://extensions in your browser.")
        } }),
        h("button", { class: "btn sm", text: "Copy folder path", onclick: async function () {
          const result = await window.fw.chrome.state()
          navigator.clipboard.writeText(result.folder || "")
          U.toast("Copied " + (result.folder || ""))
        } })
      ]))
    }
    fill({ connected: false })
    if (window.fw.chrome) {
      window.fw.chrome.state().then(fill).catch(function () {})
      const stop = window.fw.chrome.onState(function (state) {
        if (!document.body.contains(box)) {
          if (stop) stop()
          return
        }
        fill(state)
      })
    }
  }

  function paneModels(pane) {
    const models = S.models || []
    if (!models.length) {
      pane.appendChild(h("div", { class: "set-note", text: "The server has no models set up yet." }))
      return
    }
    const hidden = (S.prefs.hiddenModels || []).slice()
    pane.appendChild(h("h3", { text: "Default" }))
    const current = S.prefs.model || models[0].key
    const select = h("select", { class: "set-select" })
    FW.vendors.group(models).forEach(function (group) {
      const box = h("optgroup", { label: group.vendor.label })
      group.items.forEach(function (model) {
        const option = h("option", { value: model.key, text: model.label || model.key })
        if (model.key === current) option.selected = true
        box.appendChild(option)
      })
      select.appendChild(box)
    })
    select.addEventListener("change", function () {
      FW.store.savePrefs({ model: select.value })
      S.prefs.model = select.value
      if (FW.composer) FW.composer.refresh()
    })
    pane.appendChild(row("Model for new chats", "You can still switch per chat from the model picker.", select))
    pane.appendChild(row("Thinking", "How long models that can reason think by default.", picker([
      { value: "", label: "Auto" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" }
    ], S.prefs.effort || "", function (value) {
      FW.store.savePrefs({ effort: value })
      S.prefs.effort = value
    })))
    FW.vendors.group(models).forEach(function (group) {
      pane.appendChild(h("h3", { class: "vendor-head" }, [FW.vendors.badge(group.vendor.key), h("span", { text: group.vendor.label }), h("small", { text: String(group.items.length) })]))
      group.items.forEach(function (model) {
        const parts = []
        if (model.context) parts.push(model.context >= 1000000 ? Math.round(model.context / 100000) / 10 + "M context" : Math.round(model.context / 1000) + "k context")
        if (model.vision) parts.push("reads images")
        pane.appendChild(row(model.label || model.key, parts.join(" \u00b7 ") || model.key, toggle(hidden.indexOf(model.key) < 0, function (value) {
          const index = hidden.indexOf(model.key)
          if (value && index >= 0) hidden.splice(index, 1)
          if (!value && index < 0) hidden.push(model.key)
          FW.store.savePrefs({ hiddenModels: hidden })
          S.prefs.hiddenModels = hidden
        })))
      })
    })
    pane.appendChild(h("div", { class: "set-note", text: "Turned off models are hidden from the picker. If every model is off, all of them show." }))
  }

  function paneSkills(pane) {
    const wrap = h("div", { class: "skills-wrap" }, [h("div", { class: "set-note", text: "Loading skills\u2026" })])
    pane.appendChild(wrap)
    window.fw.api("/api/skills", "GET").then(function (data) {
      wrap.innerHTML = ""
      const mine = data.skills || []
      const builtin = data.builtin || []
      wrap.appendChild(h("h3", { text: "Your skills" }))
      if (!mine.length) wrap.appendChild(h("div", { class: "set-plain set-row", text: "" }, [h("div", { class: "set-text" }, [h("b", { text: "None yet" }), h("span", { text: "The agent saves a skill when it learns a procedure worth keeping. You can also ask it: \u201csave this as a skill\u201d." })])]))
      mine.forEach(function (skill) {
        wrap.appendChild(row(skill.name, skill.description || "", h("div", { class: "set-inline" }, [
          h("button", { class: "btn sm ghost", text: "Use", onclick: function () { close(); FW.composer.addSkill(skill.name) } }),
          toggle(!!skill.enabled, function (value) {
            window.fw.api("/api/skills/" + encodeURIComponent(skill.id), "PATCH", { enabled: value }).catch(function (problem) { U.toast(problem.message || "Could not change the skill", "bad") })
          })
        ])))
      })
      let category = ""
      builtin.forEach(function (skill) {
        if (skill.category !== category) {
          category = skill.category
          wrap.appendChild(h("h3", { text: "Forkwise skills \u00b7 " + category }))
        }
        wrap.appendChild(row(skill.title, skill.description, h("button", { class: "btn sm", text: "Use", onclick: function () { close(); FW.composer.addSkill(skill.name) } })))
      })
      cardify(wrap)
    }).catch(function (problem) {
      wrap.innerHTML = ""
      wrap.appendChild(h("div", { class: "set-note", text: problem.message || "Could not load skills." }))
    })
  }

  function paneTerminal(pane) {
    const prefs = S.prefs
    pane.appendChild(h("h3", { text: "Shell" }))
    const select = h("select", { class: "set-select" }, [h("option", { value: "", text: "Default" })])
    pane.appendChild(row("Shell", "New terminals start with this shell.", select))
    if (window.fw.pty && window.fw.pty.shells) {
      window.fw.pty.shells().then(function (list) {
        list.forEach(function (item) {
          const option = h("option", { value: item.id, text: item.label })
          if (item.id === (prefs.terminalShell || "")) option.selected = true
          select.appendChild(option)
        })
      }).catch(function () {})
    }
    select.addEventListener("change", function () {
      FW.store.savePrefs({ terminalShell: select.value })
      S.prefs.terminalShell = select.value
      U.toast("New terminals use " + (select.options[select.selectedIndex].text))
    })
    pane.appendChild(h("h3", { text: "Look" }))
    pane.appendChild(row("Font size", "Size of the text in terminals.", number(prefs.terminalFontSize || 12, 9, 24, function (value) {
      FW.store.savePrefs({ terminalFontSize: value })
      S.prefs.terminalFontSize = value
    })))
    pane.appendChild(h("h3", { text: "Agents in the terminal" }))
    pane.appendChild(row("Command line agents", "Run Claude Code, Codex or OpenCode in a terminal from the Agent menu, if they are installed.", h("div", { class: "set-inline" }, [
      h("button", { class: "btn sm", text: "Claude Code", onclick: function () { close(); FW.terminals.runAgent("claude") } }),
      h("button", { class: "btn sm", text: "Codex", onclick: function () { close(); FW.terminals.runAgent("codex") } })
    ])))
  }

  function paneAbout(pane) {
    pane.appendChild(h("h3", { text: "Forkwise Desktop" }))
    pane.appendChild(row("Version", null, h("span", { class: "mono", text: S.version || "\u2014" })))
    pane.appendChild(row("Updates", "The app checks for a new version when it starts.", h("button", { class: "btn sm", text: "Download page", onclick: function () { window.fw.openExternal("https://forkwiseai.com/download") } })))
    pane.appendChild(h("h3", { text: "Links" }))
    pane.appendChild(row("Website", "forkwiseai.com", h("button", { class: "btn sm", text: "Open", onclick: function () { window.fw.openExternal("https://forkwiseai.com") } })))
    pane.appendChild(row("Report a problem", "Tell us what went wrong and what you expected.", h("button", { class: "btn sm", text: "Open", onclick: function () { window.fw.openExternal("https://forkwiseai.com/contact") } })))
  }

  function paneKeys(pane) {
    pane.appendChild(h("h3", { text: "Keyboard" }))
    const rows = [
      ["New chat", "Mod+N"],
      ["Search chats", "Mod+K"],
      ["Send message", "Enter"],
      ["New line", "Shift+Enter"],
      ["Stop the agent", "Esc"],
      ["Command palette", "Mod+Shift+P"],
      ["Go to file", "Mod+P"],
      ["Open file", "Mod+O"],
      ["Open folder", "Mod+Alt+O"],
      ["Save", "Mod+S"],
      ["Close editor", "Mod+W"],
      ["Explorer", "Mod+Shift+E"],
      ["Find in files", "Mod+Shift+F"],
      ["Source control", "Mod+Shift+G"],
      ["Edit selection with the agent", "Mod+K in the editor"],
      ["Add selection to chat", "Mod+L in the editor"],
      ["Chat beside the editor", "Mod+Alt+B"],
      ["Mention a file", "@ in the message box"],
      ["Last message again", "\u2191 in an empty box"],
      ["Focus the message box", "Mod+L"],
      ["Choose the mode", "Mod+."],
      ["Choose the model", "Mod+/"],
      ["Jump to the latest", "End"],
      ["Toggle panel", "Mod+B"],
      ["Toggle sidebar", "Mod+\\"],
      ["Open terminal", "Mod+`"],
      ["Settings", "Mod+,"]
    ]
    rows.forEach(function (item) {
      pane.appendChild(row(item[0], null, h("kbd", { text: U.key(item[1]) })))
    })
    pane.appendChild(h("div", { class: "set-note", text: "The emergency stop is always available: " + U.key("Mod+Alt+Shift+X") + "." }))
  }

  window.FW = window.FW || {}
  window.FW.settings = { open: open, close: close }
})()
