/* Real terminals in the panel (xterm.js on a pseudo terminal, the same pair
   VS Code uses): several at once, colours, vim, htop, dev servers. Also
   starts other coding agents (Claude Code, Codex, OpenCode) in a folder. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  const terms = []
  let activeId = ""
  let counter = 0
  let lib = null
  let loading = null
  let available = null
  let strip = null
  let area = null

  /* ------------------------------------------------------------ loading */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      // the editor's AMD loader would swallow these UMD files, so hide it while they load
      const amd = window.define
      window.define = undefined
      const script = document.createElement("script")
      script.src = src
      script.onload = function () {
        window.define = amd
        resolve()
      }
      script.onerror = function () {
        window.define = amd
        reject(new Error("Could not load " + src))
      }
      document.head.appendChild(script)
    })
  }

  function loadLib() {
    if (lib) return Promise.resolve(lib)
    if (loading) return loading
    loading = (async function () {
      const base = new URL("../node_modules/@xterm/", location.href).href
      const css = document.createElement("link")
      css.rel = "stylesheet"
      css.href = base + "xterm/css/xterm.css"
      document.head.appendChild(css)
      await loadScript(base + "xterm/lib/xterm.js")
      await loadScript(base + "addon-fit/lib/addon-fit.js")
      lib = { Terminal: window.Terminal, FitAddon: window.FitAddon && window.FitAddon.FitAddon ? window.FitAddon.FitAddon : window.FitAddon }
      return lib
    })()
    return loading
  }

  async function isAvailable() {
    if (available !== null) return available
    try {
      const info = await window.fw.pty.available()
      available = !!(info && info.ok)
    } catch (problem) {
      available = false
    }
    return available
  }

  function theme() {
    const style = getComputedStyle(document.documentElement)
    const dark = document.documentElement.dataset.theme !== "light"
    function v(name) {
      return style.getPropertyValue(name).trim()
    }
    return {
      background: v("--bg-side") || (dark ? "#1a1918" : "#f1f1f0"),
      foreground: v("--text") || (dark ? "#f4f3f1" : "#21201e"),
      cursor: v("--text") || "#fff",
      cursorAccent: v("--bg-side") || "#000",
      selectionBackground: dark ? "#4a6fa566" : "#9cb7e066",
      black: dark ? "#2a2927" : "#21201e",
      brightBlack: "#6c6962",
      red: dark ? "#ff7a90" : "#d6334f",
      green: dark ? "#4ade80" : "#16a34a",
      yellow: dark ? "#f5b84a" : "#a16207",
      blue: dark ? "#7ba3ff" : "#2f6fed",
      magenta: dark ? "#d5a6ff" : "#9333ea",
      cyan: dark ? "#67e8f9" : "#0e7490",
      white: dark ? "#e7e5e1" : "#6c6962"
    }
  }

  /* ------------------------------------------------------------ terminals */

  function folderNow() {
    return (S.chat && S.chat.local_path) || (FW.wb && FW.wb.root()) || S.folder || S.prefs.folder || ""
  }

  async function open(options, quiet) {
    const settings = options || {}
    if (!(await isAvailable())) {
      FW.app.togglePanel(true)
      FW.panel.show("terminal")
      U.toast("Real terminals are not available here, so the simple terminal is used")
      return null
    }
    await loadLib()
    counter += 1
    const id = "t" + Date.now().toString(36) + counter
    const el = h("div", { class: "xterm-host" })
    const xterm = new lib.Terminal({
      fontFamily: "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace",
      fontSize: S.prefs.terminalFontSize || 12.5,
      lineHeight: 1.25,
      cursorBlink: true,
      allowProposedApi: false,
      scrollback: 10000,
      theme: theme(),
      macOptionIsMeta: true
    })
    const fit = new lib.FitAddon()
    xterm.loadAddon(fit)
    const term = { id: id, title: settings.title || "Terminal " + counter, cwd: settings.cwd || folderNow(), command: settings.command || "", xterm: xterm, fit: fit, el: el, opened: false, started: false, exited: false }
    terms.push(term)
    activeId = id
    xterm.onData(function (data) {
      if (term.exited) {
        restart(term)
        return
      }
      window.fw.pty.write(id, data)
    })
    xterm.attachCustomKeyEventHandler(function (event) {
      if (event.type !== "keydown") return true
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.key.toLowerCase() === "c" && xterm.hasSelection()) {
        U.copy(xterm.getSelection())
        xterm.clearSelection()
        return false
      }
      if (mod && event.shiftKey && (event.key.toLowerCase() === "c")) {
        if (xterm.hasSelection()) U.copy(xterm.getSelection())
        return false
      }
      // keys the app keeps (settings, quick open, panel, sidebar and Ctrl+Shift shortcuts)
      if (mod && (event.shiftKey || [",", "p", "b", "\\", "`"].indexOf(event.key.toLowerCase()) >= 0) && event.key.toLowerCase() !== "v") return false
      return true
    })
    if (!quiet) {
      if (S.panelOpen && S.panel === "terminal") draw()
      else FW.panel.show("terminal")
    }
    return term
  }

  async function start(term) {
    if (term.started) return
    term.started = true
    const dims = term.fit.proposeDimensions() || { cols: 80, rows: 24 }
    try {
      const info = await window.fw.pty.start(term.id, { cwd: term.cwd, cols: dims.cols, rows: dims.rows })
      term.cwd = info.cwd
      if (term.command) {
        setTimeout(function () {
          window.fw.pty.write(term.id, term.command + "\r")
        }, 450)
      }
    } catch (problem) {
      term.xterm.writeln("\x1b[31mCould not start a shell: " + (problem.message || problem) + "\x1b[0m")
    }
  }

  function restart(term) {
    term.exited = false
    term.started = false
    term.command = ""
    term.xterm.reset()
    start(term)
  }

  function close(id) {
    const index = terms.findIndex(function (term) {
      return term.id === id
    })
    if (index < 0) return
    const term = terms[index]
    window.fw.pty.kill(id)
    term.xterm.dispose()
    term.el.remove()
    terms.splice(index, 1)
    if (activeId === id) activeId = terms.length ? terms[Math.max(0, index - 1)].id : ""
    draw()
  }

  function activate(id) {
    activeId = id
    draw()
  }

  /* ----------------------------------------------------------- the panel */

  // Called by the panel when the Terminal tab is shown.
  async function mount(host) {
    if (!(await isAvailable())) return false
    await loadLib()
    if (!terms.length) await open({}, true)
    const wrap = h("div", { class: "terms" })
    strip = h("div", { class: "terms-strip" })
    area = h("div", { class: "terms-area" })
    wrap.appendChild(strip)
    wrap.appendChild(area)
    host.innerHTML = ""
    host.appendChild(wrap)
    draw()
    if (!host.__fwObserved && window.ResizeObserver) {
      host.__fwObserved = true
      new ResizeObserver(function () {
        fitActive()
      }).observe(host)
    }
    return true
  }

  function draw() {
    if (!strip || !area || !strip.isConnected) return
    strip.innerHTML = ""
    terms.forEach(function (term) {
      const tab = h("button", { class: "term-tab" + (term.id === activeId ? " on" : "") + (term.exited ? " exited" : ""), type: "button", title: term.cwd }, [
        h("span", { html: icon("terminal", 11) }),
        h("span", { class: "name", text: term.title }),
        h("span", { class: "tab-x", title: "Close", html: icon("close", 9) })
      ])
      tab.addEventListener("click", function (event) {
        if (event.target.closest(".tab-x")) {
          close(term.id)
          return
        }
        activate(term.id)
      })
      tab.addEventListener("dblclick", async function () {
        const name = await U.dialog({ title: "Rename terminal", input: term.title, ok: "Rename" })
        if (name) {
          term.title = name
          draw()
        }
      })
      strip.appendChild(tab)
    })
    strip.appendChild(h("button", { class: "view-btn", title: "New terminal", html: icon("plus", 12), onclick: function () { open({}) } }))
    strip.appendChild(h("button", { class: "view-btn", title: "Run another agent here", html: icon("spark", 12), onclick: function (event) { agentMenu(event.currentTarget) } }))
    strip.appendChild(h("span", { class: "grow" }))
    strip.appendChild(h("button", { class: "view-btn", title: "Clear", html: icon("trash", 12), onclick: function () { const term = active(); if (term) term.xterm.clear() } }))
    area.innerHTML = ""
    const term = active()
    if (!term) return
    area.appendChild(term.el)
    if (!term.opened) {
      term.xterm.open(term.el)
      term.opened = true
    }
    requestAnimationFrame(function () {
      fitActive()
      start(term)
      term.xterm.focus()
    })
  }

  function active() {
    return terms.find(function (term) {
      return term.id === activeId
    }) || null
  }

  function fitActive() {
    const term = active()
    if (!term || !term.opened || !term.el.isConnected || term.el.clientWidth < 20) return
    try {
      term.fit.fit()
      window.fw.pty.resize(term.id, term.xterm.cols, term.xterm.rows)
    } catch (problem) {}
  }

  function agentMenu(anchor) {
    U.menu(anchor, [
      { value: "claude", label: "Claude Code", hint: "runs: claude", icon: "spark" },
      { value: "codex", label: "Codex", hint: "runs: codex", icon: "spark" },
      { value: "opencode", label: "OpenCode", hint: "runs: opencode", icon: "spark" },
      { value: "gemini", label: "Gemini CLI", hint: "runs: gemini", icon: "spark" },
      { separator: true },
      { value: "help", label: "They must be installed on this computer", icon: "help" }
    ], function (value) {
      if (value === "help") {
        U.toast("Install them first, e.g. npm i -g @anthropic-ai/claude-code or @openai/codex")
        return
      }
      runAgent(value)
    })
  }

  // Another coding agent, started in its own terminal in the open folder.
  function runAgent(command, folder) {
    const names = { claude: "Claude Code", codex: "Codex", opencode: "OpenCode", gemini: "Gemini CLI" }
    return open({ title: names[command] || command, cwd: folder || folderNow(), command: command })
  }

  function applyTheme() {
    terms.forEach(function (term) {
      term.xterm.options.theme = theme()
    })
  }

  function init() {
    window.fw.pty.onData(function (payload) {
      const term = terms.find(function (item) {
        return item.id === payload.id
      })
      if (term) term.xterm.write(payload.data)
    })
    window.fw.pty.onExit(function (payload) {
      const term = terms.find(function (item) {
        return item.id === payload.id
      })
      if (!term) return
      term.exited = true
      term.xterm.writeln("\r\n\x1b[2m[the shell exited — press any key to start a new one]\x1b[0m")
      draw()
    })
    FW.store.on("theme", applyTheme)
  }

  window.FW = window.FW || {}
  window.FW.terminals = {
    init: init,
    open: open,
    mount: mount,
    runAgent: runAgent,
    isAvailable: isAvailable,
    count: function () {
      return terms.length
    }
  }
})()
