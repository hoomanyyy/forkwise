/* Harness probe: drives the UI and reports geometry + state as JSON in the DOM. */
(function () {
  const errors = []
  window.addEventListener("error", function (event) {
    errors.push(String(event.message))
  })
  window.addEventListener("unhandledrejection", function (event) {
    errors.push("rejection: " + String(event.reason && event.reason.message ? event.reason.message : event.reason))
  })
  const nativeWarn = console.error
  console.error = function () {
    errors.push(Array.prototype.join.call(arguments, " "))
    nativeWarn.apply(console, arguments)
  }

  const params = new URLSearchParams(location.search)
  const scenario = params.get("scenario") || "chat"

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms)
    })
  }

  function rect(node) {
    if (!node) return null
    const box = node.getBoundingClientRect()
    return { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) }
  }

  function css(node, prop) {
    if (!node) return ""
    return getComputedStyle(node).getPropertyValue(prop)
  }

  function report(extra) {
    const composer = document.querySelector(".composer")
    const thread = document.getElementById("thread")
    const data = {
      scenario: scenario,
      errors: errors,
      title: document.title,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      theme: document.documentElement.dataset.theme,
      tokens: {
        bg: css(document.documentElement, "--bg").trim(),
        text: css(document.documentElement, "--text").trim(),
        font: css(document.body, "font-family")
      },
      rects: {
        titlebar: rect(document.getElementById("titlebar")),
        sidebar: rect(document.getElementById("sidebar")),
        main: rect(document.getElementById("main")),
        panel: rect(document.getElementById("panel")),
        composer: rect(composer),
        thread: rect(thread),
        login: rect(document.getElementById("login"))
      },
      counts: {
        chats: document.querySelectorAll(".chat-row").length,
        turns: document.querySelectorAll(".turn").length,
        acts: document.querySelectorAll(".act").length,
        thinks: document.querySelectorAll(".think").length,
        bubbles: document.querySelectorAll(".turn-user .bubble").length,
        approves: document.querySelectorAll(".approve").length,
        files: document.querySelectorAll(".file-row").length,
        apps: document.querySelectorAll(".app-row").length,
        toasts: document.querySelectorAll(".toast").length
      },
      fw: window.FW_HARNESS
        ? { used: window.FW_HARNESS.used(), unknown: window.FW_HARNESS.unknown(), unimplemented: window.FW_HARNESS.missing() }
        : null,
      computed: {
        appCols: css(document.getElementById("app"), "grid-template-columns"),
        appDisplay: css(document.getElementById("app"), "display"),
        app: rect(document.getElementById("app")),
        bodyH: document.body.getBoundingClientRect().height,
        htmlH: document.documentElement.getBoundingClientRect().height,
        bodyDisplay: css(document.body, "display"),
        mainMinH: css(document.getElementById("main"), "min-height"),
        panelTransform: css(document.getElementById("panel"), "transform"),
        panelPosition: css(document.getElementById("panel"), "position"),
        classes: document.body.className
      },
      body: {
        appHidden: document.getElementById("app").hidden,
        loginHidden: document.getElementById("login").hidden,
        panelOpen: document.body.classList.contains("panel-open"),
        sidebarHidden: document.body.classList.contains("sidebar-hidden"),
        stageEmpty: document.getElementById("stage").classList.contains("is-empty")
      },
      sizes: {
        inner: rect(document.querySelector(".thread-inner")),
        innerH: document.querySelector(".thread-inner") ? Math.round(document.querySelector(".thread-inner").getBoundingClientRect().height) : 0,
        actH: document.querySelector(".act") ? Math.round(document.querySelector(".act").getBoundingClientRect().height) : 0,
        mdSize: document.querySelector(".md") ? css(document.querySelector(".md"), "font-size") : "",
        turnGap: document.querySelector(".turn") ? css(document.querySelector(".turn"), "margin-bottom") : "",
        threadScroll: thread ? thread.scrollHeight : 0,
        threadClient: thread ? thread.clientHeight : 0,
        composerWidth: composer ? Math.round(composer.getBoundingClientRect().width) : 0,
        fontsOnest: document.fonts ? document.fonts.check('12px "Onest"') : null,
        fontsMono: document.fonts ? document.fonts.check('12px "JetBrains Mono"') : null
      },
      visibleText: (document.getElementById("thread") ? document.getElementById("thread").innerText : "").slice(0, 1500),
      panelText: (document.getElementById("panel") ? document.getElementById("panel").innerText : "").slice(0, 900),
      composerText: (document.querySelector(".composer") ? document.querySelector(".composer").innerText : "").slice(0, 400),
      extra: extra || null
    }
    const pre = document.createElement("pre")
    pre.id = "probeOut"
    pre.style.display = "none"
    pre.textContent = JSON.stringify(data, null, 2)
    document.body.appendChild(pre)
  }

  async function drive() {
    await wait(700)
    if (scenario === "chat") {
      await window.FW.app.openChat("c1")
      await wait(500)
      window.FW.app.togglePanel(true)
      await wait(300)
      window.FW.panel.show("changes")
      await wait(300)
      report()
      return
    }
    if (scenario === "empty") {
      window.FW.app.newChat()
      await wait(300)
      report()
      return
    }
    if (scenario === "live") {
      window.FW.app.newChat()
      await wait(200)
      const box = document.getElementById("prompt")
      box.value = "Open my Downloads folder and tidy it up"
      box.dispatchEvent(new Event("input", { bubbles: true }))
      await wait(120)
      document.getElementById("btnSend").click()
      await wait(3900)
      const allow = document.querySelector('.approve [data-answer="allow"]')
      report({ hasApprove: !!allow, sendDisabled: document.getElementById("btnSend").disabled, sendStop: document.getElementById("btnSend").classList.contains("stop") })
      return
    }
    if (scenario === "answered") {
      window.FW.app.newChat()
      await wait(200)
      const box = document.getElementById("prompt")
      box.value = "Turn on Dock auto hide for me"
      box.dispatchEvent(new Event("input", { bubbles: true }))
      document.getElementById("btnSend").click()
      await wait(3900)
      const allow = document.querySelector('.approve [data-answer="allow"]')
      if (allow) allow.click()
      await wait(1100)
      report({ allowed: !!allow, acts: document.querySelectorAll(".act").length })
      return
    }
    if (scenario === "terminal") {
      await window.FW.app.openChat("c1")
      window.FW.app.togglePanel(true)
      window.FW.panel.show("terminal")
      await wait(400)
      const input = document.querySelector(".term-in input")
      if (input) {
        input.value = "ls -la"
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
      }
      await wait(600)
      report({ terminal: (document.querySelector(".term-out") || {}).innerText })
      return
    }
    if (scenario === "computer") {
      window.FW.app.togglePanel(true)
      window.FW.panel.show("computer")
      await wait(500)
      const shot = Array.prototype.find.call(document.querySelectorAll(".quick button"), function (button) {
        return button.textContent.indexOf("Screenshot") >= 0
      })
      if (shot) shot.click()
      await wait(800)
      const load = Array.prototype.find.call(document.querySelectorAll(".group-title button"), function (button) {
        return button.textContent.indexOf("apps") >= 0
      })
      if (load) load.click()
      await wait(700)
      report({ hasShot: !!document.querySelector("#shotBox img") })
      return
    }
    if (scenario === "settings") {
      await wait(200)
      window.FW.settings.open("general")
      await wait(300)
      document.querySelectorAll(".nav-item")[2].click()
      await wait(300)
      report({ modal: (document.querySelector(".modal") || {}).innerText ? document.querySelector(".modal").innerText.slice(0, 400) : "" })
      return
    }
    if (scenario === "login" || scenario === "problem") {
      await wait(300)
      const login = document.getElementById("login")
      const out = {
        loginHidden: login.hidden,
        appHidden: document.getElementById("app").hidden,
        rect: rect(login),
        text: login.innerText.slice(0, 500),
        retry: !document.getElementById("btnRetry").hidden,
        button: document.getElementById("btnLogin").textContent
      }
      report(out)
      return
    }
    if (scenario === "prefs") {
      window.FW.settings.open("general")
      await wait(300)
      const seg = document.querySelectorAll(".seg-btn")
      const light = Array.prototype.find.call(seg, function (button) { return button.textContent === "Light" })
      if (light) light.click()
      await wait(600)
      const sw = document.querySelectorAll(".switch")[0]
      if (sw) sw.click()
      await wait(600)
      const out = { theme: document.documentElement.dataset.theme, prefs: window.FW_HARNESS.prefs() }
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
      await wait(300)
      out.closed = document.querySelectorAll(".modal").length
      report(out)
      return
    }
    if (scenario === "ask") {
      await window.FW.app.openChat("c1")
      await wait(200)
      const answers = []
      const original = window.fw.device.answer
      window.fw.device.answer = function (id, value) {
        answers.push(id + ":" + value)
        return original(id, value)
      }
      const listenersAsk = []
      window.fw.device.onAsk(function (payload) { listenersAsk.push(payload) })
      const ask = { id: "ask_1", text: "Run: defaults write com.apple.dock autohide -bool true", canAlways: true }
      window.FW_HARNESS.ask(ask)
      await wait(300)
      const card = document.querySelector(".ask-card")
      const out = { card: !!card, buttons: card ? Array.from(card.querySelectorAll("[data-ask]")).map(function (b) { return b.textContent }) : [], cardRect: rect(card) }
      if (card) card.querySelector('[data-ask="always"]').click()
      await wait(300)
      out.answers = answers
      out.after = document.querySelectorAll(".ask-card").length
      report(out)
      return
    }
    if (scenario === "search") {
      await window.FW.app.openChat("c1")
      await wait(300)
      const field = document.getElementById("chatSearch")
      field.value = "down"
      field.dispatchEvent(new Event("input", { bubbles: true }))
      await wait(300)
      const rows = Array.prototype.map.call(document.querySelectorAll(".chat-row"), function (row) {
        return row.innerText.replace(/\n/g, " ")
      })
      report({ rows: rows, groups: document.querySelectorAll(".side-label").length })
      return
    }
    if (scenario === "theme") {
      await window.FW.app.openChat("c1")
      await wait(300)
      window.FW.app.applyTheme("light")
      await wait(400)
      report({ theme: document.documentElement.dataset.theme, bg: css(document.body, "background-color"), text3: css(document.documentElement, "--text-3").trim(), accentText: css(document.querySelector(".chat-row.on") || document.body, "color") })
      return
    }
    if (scenario === "diff") {
      await window.FW.app.openChat("c1")
      window.FW.app.togglePanel(true)
      window.FW.panel.show("changes")
      await wait(500)
      const rows = document.querySelectorAll(".file-row")
      if (rows[1]) rows[1].click()
      await wait(400)
      report({ diffLines: document.querySelectorAll(".diff .l").length, diffHead: (document.querySelector(".diff") || {}).innerText ? document.querySelector(".diff").innerText.slice(0, 120) : "", active: document.querySelectorAll(".file-row.on").length })
      return
    }
    if (scenario === "stop") {
      window.FW.app.newChat()
      await wait(200)
      const box = document.getElementById("prompt")
      box.value = "Do something long"
      box.dispatchEvent(new Event("input", { bubbles: true }))
      document.getElementById("btnSend").click()
      await wait(900)
      const stop = document.getElementById("btnSend").classList.contains("stop")
      document.getElementById("btnSend").click()
      await wait(600)
      report({ wasStop: stop, running: window.FW.store.state.running })
      return
    }
    report()
  }

  window.addEventListener("load", function () {
    drive().catch(function (problem) {
      errors.push("drive: " + (problem && problem.stack ? problem.stack : problem))
      report()
    })
  })
})()
