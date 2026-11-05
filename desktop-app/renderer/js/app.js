/* App shell: boot, login, navigation, layout, events. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon
  const chat = window.FW.chat

  let booted = false

  function $(id) {
    return document.getElementById(id)
  }

  /* ------------------------------------------------------------- theme */

  function resolveTheme(value) {
    const wanted = value || "system"
    if (wanted !== "system") return wanted
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  }

  function applyTheme(value) {
    document.documentElement.dataset.theme = resolveTheme(value)
  }

  /* ------------------------------------------------------------- boot */

  async function boot() {
    document.body.classList.add("booted")
    try {
      const data = await window.fw.boot()
      S.prefs = data.prefs || {}
      S.version = data.version
      S.platform = data.platform
      S.hostname = data.hostname
      S.site = data.site
      S.offline = data.online === false
      applyTheme(S.prefs.theme)
      document.body.classList.add("platform-" + (data.platform || "linux"))
      if (!data.user) {
        showLogin(data)
        return
      }
      await start(data)
    } catch (problem) {
      console.error("boot failed: " + (problem && problem.stack ? problem.stack : problem))
      showLogin({ problem: problem.message || "Forkwise could not start.", login: true })
      const box = $("loginError")
      box.hidden = false
      box.textContent = String(problem && problem.message ? problem.message : problem)
    }
  }

  function showLogin(data) {
    const login = $("login")
    const app = $("app")
    app.hidden = true
    login.hidden = false
    $("loginError").hidden = true
    if (data.problem) {
      $("loginTitle").textContent = "Cannot reach Forkwise"
      $("loginDetail").textContent = "The app could not reach the server. " + data.problem
      $("loginHint").textContent = "Check your connection, then try again. Nothing was lost."
      $("btnLogin").hidden = true
      $("btnRetry").hidden = false
    } else {
      $("loginTitle").textContent = "Sign in to your computer"
      $("loginDetail").textContent = "One account for the web app and this computer. Your chats, models and plan stay in sync."
      $("loginHint").textContent = "A browser window opens. Sign in with your forkwiseai.com account and this app picks it up automatically."
      $("btnLogin").hidden = false
      $("btnRetry").hidden = true
    }
  }

  async function start(data) {
    $("login").hidden = true
    $("app").hidden = false
    S.user = data.user
    S.models = data.models || []
    S.plan = data.plan
    S.usage = data.usage
    S.device = data.device || { state: "off" }
    S.feed = data.feed || []
    if (data.folder) S.folder = data.folder
    S.panel = S.prefs.panel || "changes"
    S.panelOpen = S.prefs.panelOpen === undefined ? window.innerWidth >= 1160 : !!S.prefs.panelOpen
    S.sidebarOpen = S.prefs.sidebarOpen === undefined ? window.innerWidth >= 760 : !!S.prefs.sidebarOpen
    if (S.prefs.showThinking === false) document.documentElement.classList.add("hide-thinking")
    if (S.prefs.panelWidth !== undefined && S.prefs.panelWidth !== null) {
      document.documentElement.style.setProperty("--panel-w", S.prefs.panelWidth + "px")
    }

    chat.init()
    window.FW.composer.init()
    window.FW.sidebar.init()
    window.FW.panel.init()
    window.FW.sidebar.account()
    window.FW.sidebar.device()
    applyLayout()
    wire()

    if (S.device.state === "online") loadDeviceInfo()
    await refreshChats()
    if (S.offline) showBanner("No connection to Forkwise. Showing what was loaded.")
    const last = S.prefs.lastChat
    if (last && S.chats.some(function (item) { return item.id === last })) openChat(last)
    else newChat()
    if (S.device.state === "off") window.fw.device.connect().catch(function () {})
    booted = true
  }

  function wire() {
    window.fw.onRunEvent(function (event) {
      if (event.type === "done" || event.type === "error") {
        // handled by chat
      }
      chat.handleEvent(event)
    })
    window.fw.onRunError(function (payload) {
      U.toast(payload.message || "The connection to the run dropped", "bad", 5000)
      chat.setRunning(false)
    })
    window.fw.device.onStatus(function (state) {
      const was = S.device.state
      S.device = state
      window.FW.sidebar.device()
      if (S.panel === "computer") window.FW.panel.render()
      if (state.state === "online" && was !== "online") {
        loadDeviceInfo()
        U.toast("This computer is connected")
      }
      if (state.state === "off" && was === "online") U.toast("This computer disconnected", "bad", 4000)
    })
    window.fw.device.onPanic(function () {
      chat.onPanic()
      chat.setRunning(false)
      U.toast("Stopped everything on this computer", "warn", 4000)
    })
    window.fw.device.onAsk(function (payload) {
      askDevice(payload)
    })
    window.fw.auth.onReady(function (boot) {
      location.reload()
    })
    window.fw.auth.onLost(function () {
      showLogin({ problem: "", login: true })
    })
    window.fw.onMenu(function (payload) {
      const action = payload && payload.action
      if (action === "new-chat") newChat()
      if (action === "settings") window.FW.settings.open("general")
      if (action === "sidebar") toggleSidebar()
      if (action === "panel") togglePanel(!S.panelOpen)
      if (action === "open-folder") $("btnFolder").click()
    })
    window.fw.win.onState(function (state) {
      document.body.classList.toggle("maximized", !!state.maximized)
    })
    window.fw.theme.on(function (payload) {
      if (!S.prefs.theme || S.prefs.theme === "system") applyTheme("system")
    })
    if (window.matchMedia) {
      const query = window.matchMedia("(prefers-color-scheme: light)")
      const onChange = function () {
        if ((S.prefs.theme || "system") === "system") applyTheme("system")
      }
      if (query.addEventListener) query.addEventListener("change", onChange)
    }

    window.FW.store.on("run:done", function (payload) {
      if (S.chat && payload.chatId === S.chat.id) {
        openChat(payload.chatId, true)
      }
      refreshChats()
    })
    window.FW.store.on("run:start", function () {
      window.FW.composer.update()
    })
    window.FW.store.on("running", function () {
      window.FW.composer.update()
      window.FW.composer.renderChips()
    })
    window.FW.store.on("title", function () {
      window.FW.sidebar.render()
      setTitle(S.chat ? S.chat.title : "")
    })
    window.FW.store.on("context", function () {
      window.FW.composer.update()
    })

    $("btnLogin").addEventListener("click", async function () {
      $("btnLogin").disabled = true
      try {
        const data = await window.fw.boot()
        if (data.user) {
          location.reload()
          return
        }
        await window.fw.auth.start()
      } catch (problem) {
        $("loginError").hidden = false
        $("loginError").textContent = problem.message || "Could not open the browser."
      } finally {
        $("btnLogin").disabled = false
      }
    })
    $("btnRetry").addEventListener("click", function () {
      location.reload()
    })

    document.addEventListener("keydown", onKey)
    document.addEventListener("click", function (event) {
      const external = event.target.closest("[data-external]")
      if (external) window.fw.openExternal(external.getAttribute("data-external"))
    })
  }

  const askQueue = []
  let asking = false

  async function askDevice(payload) {
    if (!payload || !payload.id) return
    askQueue.push(payload)
    if (!asking) nextAsk()
  }

  function nextAsk() {
    const payload = askQueue.shift()
    if (!payload) {
      asking = false
      return
    }
    asking = true
    const text = String(payload.text || "Use this computer").slice(0, 400)
    const card = h("div", { class: "ask-card", role: "dialog", "aria-live": "assertive" }, [
      h("div", { class: "ask-head" }, [h("span", { class: "ask-dot" }), h("b", { text: "Forkwise wants to use this computer" })]),
      h("div", { class: "ask-body" }, [h("code", { text: text })]),
      h("div", { class: "ask-foot" }, [
        h("button", { class: "btn primary sm", text: "Allow", dataset: { ask: "allow" } }),
        payload.canAlways ? h("button", { class: "btn sm", text: "Always allow", dataset: { ask: "always" } }) : null,
        h("button", { class: "btn ghost sm", text: "Deny", dataset: { ask: "deny" } }),
        h("span", { class: "ask-note", text: "Denies by itself in 10 minutes" })
      ])
    ])
    function finish(value) {
      card.classList.add("leaving")
      setTimeout(function () {
        card.remove()
        nextAsk()
      }, 160)
      window.fw.device.answer(payload.id, value).catch(function () {})
    }
    card.addEventListener("click", function (event) {
      const button = event.target.closest("[data-ask]")
      if (button) finish(button.dataset.ask)
    })
    const stage = document.getElementById("stage") || document.body
    stage.appendChild(card)
    const first = card.querySelector("[data-ask]")
    if (first) first.focus()
  }

  function onKey(event) {
    const mod = event.metaKey || event.ctrlKey
    if (!mod) return
    const key = event.key.toLowerCase()
    if (key === "n") {
      event.preventDefault()
      newChat()
    } else if (key === "k") {
      event.preventDefault()
      $("chatSearch").focus()
      $("chatSearch").select()
    } else if (key === "b") {
      event.preventDefault()
      togglePanel(!S.panelOpen)
    } else if (key === "\\") {
      event.preventDefault()
      toggleSidebar()
    } else if (key === ",") {
      event.preventDefault()
      window.FW.settings.open("general")
    } else if (key === "`") {
      event.preventDefault()
      togglePanel(true)
      window.FW.panel.show("terminal")
    }
  }

  /* ------------------------------------------------------------ layout */

  function applyLayout() {
    document.body.classList.toggle("panel-open", !!S.panelOpen)
    document.body.classList.toggle("sidebar-hidden", !S.sidebarOpen)
    const panelBtn = $("btnPanel")
    if (panelBtn) panelBtn.classList.toggle("on", !!S.panelOpen)
  }

  function togglePanel(value) {
    S.panelOpen = value === undefined ? !S.panelOpen : !!value
    window.FW.store.savePrefs({ panelOpen: S.panelOpen })
    applyLayout()
    if (S.panelOpen) window.FW.panel.render()
  }

  function toggleSidebar() {
    S.sidebarOpen = !S.sidebarOpen
    window.FW.store.savePrefs({ sidebarOpen: S.sidebarOpen })
    applyLayout()
  }

  function setTitle(text) {
    const node = $("tbTitle")
    if (node) node.textContent = text || "New chat"
    document.title = text ? text + " \u2014 Forkwise" : "Forkwise"
  }

  function showBanner(text) {
    const banner = $("banner")
    banner.innerHTML = ""
    banner.hidden = false
    banner.appendChild(h("span", { text: text }))
    banner.appendChild(h("button", { class: "btn sm", text: "Retry", onclick: function () { location.reload() } }))
  }

  /* ------------------------------------------------------------- chats */

  async function refreshChats() {
    try {
      const data = await window.fw.chats.list({})
      S.chats = data.chats || []
      window.FW.sidebar.render()
    } catch (problem) {
      if (problem.status === 401) showLogin({ login: true })
    }
  }

  async function openChat(id, quiet) {
    if (!id) return
    try {
      const data = await window.fw.chats.get(id)
      S.chat = data.chat
      S.changedFiles = []
      window.FW.store.savePrefs({ lastChat: id })
      chat.setChat(data)
      window.FW.composer.setChat(data.chat)
      window.FW.sidebar.render()
      setTitle(data.chat.title)
      if (data.chat.local_path) window.FW.panel.loadGit()
      if (S.panelOpen && S.panel === "changes") window.FW.panel.render()
      chat.scroll(true)
    } catch (problem) {
      if (!quiet) U.toast(problem.message || "Could not open that chat", "bad")
    }
  }

  function newChat() {
    S.chat = null
    S.changedFiles = []
    S.context = { tokens: 0, limit: 0 }
    chat.showEmpty()
    window.FW.composer.setChat(null)
    window.FW.sidebar.render()
    setTitle("")
    window.FW.store.savePrefs({ lastChat: "" })
    window.FW.composer.focus()
    if (S.panelOpen && S.panel === "changes") window.FW.panel.render()
  }

  async function signOut() {
    try {
      await window.fw.auth.logout()
    } catch (problem) {}
    location.reload()
  }

  async function reloadSession() {
    try {
      const data = await window.fw.boot()
      if (!data.user) {
        showLogin({ login: true })
        return
      }
      S.user = data.user
      S.models = data.models || []
      S.plan = data.plan
      window.FW.composer.refresh()
      window.FW.sidebar.account()
    } catch (problem) {
      U.toast(problem.message || "Could not refresh the session", "bad")
    }
  }

  async function loadDeviceInfo() {
    try {
      const info = await window.fw.device.info()
      if (info && info.ok) {
        S.deviceInfo = info
        if (S.panel === "computer") window.FW.panel.render()
      }
    } catch (problem) {}
  }

  window.FW = window.FW || {}
  window.FW.app = {
    boot: boot,
    openChat: openChat,
    newChat: newChat,
    refreshChats: refreshChats,
    togglePanel: togglePanel,
    toggleSidebar: toggleSidebar,
    showPanel: function (which) {
      togglePanel(true)
      window.FW.panel.show(which)
    },
    applyTheme: applyTheme,
    signOut: signOut,
    reloadSession: reloadSession,
    showLogin: showLogin
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("btnSidebar").innerHTML = U.icon("sidebar", 15)
    $("btnPanel").innerHTML = U.icon("panel", 15)
    document.querySelector(".search-ico").innerHTML = U.icon("search", 13)
    $("btnSidebar").addEventListener("click", toggleSidebar)
    $("btnPanel").addEventListener("click", function () {
      togglePanel(!S.panelOpen)
    })
    ;["minimize", "maximize", "close"].forEach(function (action) {
      const button = $("win-" + action)
      if (button) {
        button.addEventListener("click", function () {
          window.fw.win.control(action)
        })
      }
    })
    boot()
  })
})()
