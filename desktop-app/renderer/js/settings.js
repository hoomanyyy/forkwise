/* Settings modal. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  let back = null
  let tab = "general"

  const TABS = [
    { id: "general", label: "General", icon: "settings" },
    { id: "account", label: "Account", icon: "user" },
    { id: "computer", label: "Computer", icon: "monitor" },
    { id: "keys", label: "Keyboard", icon: "keyboard" }
  ]

  function open(which) {
    if (which) tab = which
    if (back) back.remove()
    back = h("div", { class: "modal-back", onclick: function (event) { if (event.target === back) close() } })
    const dialog = h("div", { class: "modal" })
    back.appendChild(dialog)
    document.body.appendChild(back)
    document.addEventListener("keydown", escClose)
    draw(dialog)
  }

  function close() {
    if (back) back.remove()
    back = null
    document.removeEventListener("keydown", escClose)
  }

  function escClose(event) {
    if (event.key === "Escape") close()
  }

  function draw(dialog) {
    dialog.innerHTML = ""
    const head = h("div", { class: "modal-head" }, [h("b", { text: "Settings" }), h("button", { class: "icon-btn", html: icon("close", 14), onclick: close })])
    const body = h("div", { class: "modal-body" })
    const side = h("div", { class: "modal-nav" })
    TABS.forEach(function (item) {
      side.appendChild(
        h("button", { class: "nav-item" + (tab === item.id ? " on" : ""), onclick: function () { tab = item.id; draw(dialog) } }, [h("span", { html: icon(item.icon, 14) }), h("span", { text: item.label })])
      )
    })
    const pane = h("div", { class: "modal-pane" })
    if (tab === "general") paneGeneral(pane)
    if (tab === "account") paneAccount(pane)
    if (tab === "computer") paneComputer(pane)
    if (tab === "keys") paneKeys(pane)
    body.appendChild(side)
    body.appendChild(pane)
    dialog.appendChild(head)
    dialog.appendChild(body)
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
    pane.appendChild(h("h3", { text: "Chat" }))
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
    pane.appendChild(h("h3", { text: "Default folder" }))
    const folder = h("div", { class: "set-inline" }, [
      h("span", { class: "mono", text: S.prefs.folder || "No folder chosen" }),
      h("button", { class: "btn sm", text: "Choose", onclick: async function () { const result = await window.fw.pickFolder(); if (result.folder) { FW.store.savePrefs({ folder: result.folder }); S.folder = result.folder; draw(back.querySelector(".modal")); } } })
    ])
    pane.appendChild(row("Folder for new chats", "The agent gets full read and write access to this folder.", folder))
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

  function paneKeys(pane) {
    pane.appendChild(h("h3", { text: "Keyboard" }))
    const rows = [
      ["New chat", "Mod+N"],
      ["Search chats", "Mod+K"],
      ["Send message", "Enter"],
      ["New line", "Shift+Enter"],
      ["Stop the agent", "Esc"],
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
