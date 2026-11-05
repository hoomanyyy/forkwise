/* Local harness: fakes the Electron bridge so the renderer can be tested in a browser. */
(function () {
  const now = Date.now()
  const models = [
    { key: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", vision: true, context: 200000 },
    { key: "gpt-5", label: "GPT-5", vision: true, context: 200000 },
    { key: "gemini-2.5-pro", label: "Gemini 2.5 Pro", vision: true, context: 1000000 }
  ]
  const chats = [
    { id: "c1", title: "Redesign the pricing page", updated_at: now - 60000, pinned: true },
    { id: "c2", title: "Tidy up my Downloads folder", updated_at: now - 3600 * 1000 },
    { id: "c3", title: "Fix the login redirect bug", updated_at: now - 26 * 3600 * 1000 },
    { id: "c4", title: "Weekly revenue breakdown", updated_at: now - 3 * 86400 * 1000 },
    { id: "c5", title: "Wallpaper ideas", updated_at: now - 9 * 86400 * 1000 }
  ]
  const history = [
    {
      role: "user",
      content: "Open my Downloads folder and tidy it up. Group screenshots, invoices and zips into subfolders.",
      created_at: new Date(now - 400000).toISOString()
    },
    {
      role: "assistant",
      reasoning: "The user wants their Downloads folder tidied. I should list the folder first, then create subfolders for screenshots, invoices and archives, and move the files. Everything happens on this Mac, so I use the computer tool with action fs_list and fs_move.",
      content: "",
      tool_calls: [
        { id: "t1", type: "function", function: { name: "computer", arguments: JSON.stringify({ action: "fs_list", path: "Downloads" }) } },
        { id: "t2", type: "function", function: { name: "computer", arguments: JSON.stringify({ action: "fs_mkdir", path: "Downloads/Screenshots" }) } },
        { id: "t3", type: "function", function: { name: "computer", arguments: JSON.stringify({ action: "fs_move", from: "Downloads/*.zip", to: "Downloads/Archives" }) } }
      ],
      created_at: new Date(now - 380000).toISOString()
    },
    {
      role: "tool",
      tool_call_id: "t1",
      name: "computer",
      content: "1,284 items:\nScreenshot 2026-11-02 at 09.14.22.png\ninvoice-november.pdf\nbrand-assets.zip\n...",
      meta: { ok: true },
      created_at: new Date(now - 379000).toISOString()
    },
    {
      role: "tool",
      tool_call_id: "t2",
      name: "computer",
      content: "Created Downloads/Screenshots",
      meta: { ok: true },
      created_at: new Date(now - 378000).toISOString()
    },
    {
      role: "tool",
      tool_call_id: "t3",
      name: "computer",
      content: "Moved 14 files into Downloads/Archives (1.2 GB).",
      meta: { ok: true },
      created_at: new Date(now - 377000).toISOString()
    },
    {
      role: "assistant",
      content:
        "Done. Your Downloads folder went from **1,284 loose items** to three tidy folders:\n\n- `Screenshots/` holds 412 images, sorted by month\n- `Invoices/` holds 38 PDFs\n- `Archives/` holds 14 zip files\n\nI left a short `README.txt` that lists what moved where, and nothing was deleted.\n\n```bash\nopen ~/Downloads\n```",
      reasoning: "",
      tool_calls: [],
      created_at: new Date(now - 360000).toISOString()
    }
  ]

  const listeners = { run: [], error: [], status: [], activity: [], ask: [], panic: [], authReady: [], authLost: [], menu: [], winState: [], theme: [], term: [], termExit: [] }
  function fire(name, payload) {
    ;(listeners[name] || []).forEach(function (fn) {
      fn(payload)
    })
    return function () {}
  }

  let resolveApproval = null
  let timers = []

  function simulate(userText) {
    const runId = "run_" + Math.random().toString(36).slice(2, 8)
    listeners.run.forEach(function (fn) {
      fn({ type: "start", run_id: runId })
    })
    setTimeout(function () {
      listeners.run.forEach(function (fn) {
        fn({ type: "context", tokens: 18432, limit: 200000 })
      })
    }, 120)
    const reasoning = "I should look at the machine first. A screenshot tells me what is on screen, then I can decide which window to bring forward and where to click."
    reasoning.split(" ").forEach(function (word, index) {
      timers.push(
        setTimeout(function () {
          listeners.run.forEach(function (fn) {
            fn({ type: "reasoning", step: 1, text: word + " " })
          })
        }, 320 + index * 26)
      )
    })
    timers.push(
      setTimeout(function () {
        listeners.run.forEach(function (fn) {
          fn({ type: "assistant", step: 1, content: "", reasoning: reasoning, tool_calls: [{ id: "live1", function: { name: "computer", arguments: '{"action":"screenshot"}' } }] })
        })
      }, 320 + reasoning.split(" ").length * 26 + 120)
    )
    timers.push(
      setTimeout(function () {
        listeners.run.forEach(function (fn) {
          fn({ type: "tool_start", id: "live1", name: "computer", args: { action: "screenshot" } })
        })
      }, 1500)
    )
    timers.push(
      setTimeout(function () {
        listeners.run.forEach(function (fn) {
          fn({ type: "tool_end", id: "live1", ok: true, text: "Screen captured (2560 \u00d7 1600). Finder is in front, Safari has four tabs open, the Forkwise app is behind.", meta: {} })
        })
      }, 2400)
    )
    timers.push(
      setTimeout(function () {
        listeners.run.forEach(function (fn) {
          fn({ type: "tool_start", id: "live2", name: "computer", args: { action: "shell", command: "defaults write com.apple.dock autohide -bool true && killall Dock" } })
        })
        listeners.run.forEach(function (fn) {
          fn({ type: "waiting", id: "live2", kind: "approval", name: "computer", args: { action: "shell", command: "defaults write com.apple.dock autohide -bool true && killall Dock" }, always: true })
        })
        resolveApproval = function (value) {
          listeners.run.forEach(function (fn) {
            fn({ type: "answered", id: "live2", value: value })
          })
          setTimeout(function () {
            listeners.run.forEach(function (fn) {
              fn({ type: "tool_end", id: "live2", ok: value !== "deny", text: value === "deny" ? "The user denied this action." : "Dock hidden. The change is live.", meta: {} })
            })
            const words = "I turned on auto-hide for the Dock and restarted it, so your desktop now has the full screen. Nothing else changed. If you want the Dock back, say the word and I will undo it.".split(" ")
            words.forEach(function (word, index) {
              timers.push(
                setTimeout(function () {
                  listeners.run.forEach(function (fn) {
                    fn({ type: "text", step: 2, text: word + " " })
                  })
                }, 400 + index * 26)
              )
            })
            timers.push(
              setTimeout(function () {
                listeners.run.forEach(function (fn) {
                  fn({ type: "assistant", step: 2, content: "I turned on auto-hide for the Dock and restarted it, so your desktop now has the full screen. Nothing else changed. If you want the Dock back, say the word and I will undo it.", reasoning: "", tool_calls: [] })
                })
                listeners.run.forEach(function (fn) {
                  fn({ type: "done", status: "finished" })
                })
              }, 900 + words.length * 26)
            )
          }, 400)
        }
      }, 3200)
    )
  }

  const prefsLog = []
  const files = [
    { path: "src/pages/Pricing.tsx", code: "M", add: 34, del: 12 },
    { path: "src/components/PlanCard.tsx", code: "M", add: 18, del: 4 },
    { path: "src/styles/pricing.css", code: "A", add: 96, del: 0 },
    { path: "src/lib/legacy-pricing.ts", code: "D", add: 0, del: 61 }
  ]

  window.fw = {
    version: "4.0.0",
    boot: function () {
      const mode = new URLSearchParams(location.search).get("mode")
      if (mode === "login") {
        return Promise.resolve({ version: "4.0.0", platform: "darwin", arch: "arm64", hostname: "MacBook Pro", user: null, models: [], plan: null, usage: null, prefs: {}, theme: "dark", device: { state: "off" }, feed: [], site: "https://forkwiseai.com", api: "https://api.forkwiseai.com", online: true, problem: "", folder: "", login: true })
      }
      if (mode === "problem") {
        return Promise.resolve({ version: "4.0.0", platform: "darwin", arch: "arm64", hostname: "MacBook Pro", user: null, models: [], plan: null, usage: null, prefs: {}, theme: "dark", device: { state: "off" }, feed: [], site: "", api: "", online: false, problem: "getaddrinfo ENOTFOUND api.forkwiseai.com", folder: "", login: true })
      }
      return Promise.resolve({
        version: "4.0.0",
        platform: "darwin",
        arch: "arm64",
        hostname: "MacBook Pro",
        user: { id: "u1", email: "hooman@forkwiseai.com", name: "Hooman Khodadadi", is_admin: false, settings: {} },
        models: models,
        plan: { name: "Pro" },
        usage: { tokens: 128400 },
        prefs: { theme: "dark" },
        theme: "dark",
        device: { state: "online" },
        feed: [
          { type: "shell", text: "defaults write com.apple.dock autohide -bool true", time: now - 120000 },
          { type: "open", text: "Opened Safari", time: now - 240000 },
          { type: "screenshot", text: "Captured the screen", time: now - 300000 },
          { type: "files", text: "Moved 14 files into Downloads/Archives", time: now - 360000 }
        ],
        site: "https://forkwiseai.com",
        api: "https://api.forkwiseai.com",
        online: true,
        problem: "",
        folder: "",
        login: false
      })
    },
    auth: {
      start: function () {
        return Promise.resolve({ ok: true })
      },
      logout: function () {
        return Promise.resolve({ ok: true })
      },
      onReady: function (fn) { listeners.authReady.push(fn); return function () {} },
      onLost: function (fn) { listeners.authLost.push(fn); return function () {} }
    },
    api: function (path, method, body) {
      return Promise.resolve({ ok: true })
    },
    chats: {
      list: function () {
        return Promise.resolve({ chats: chats })
      },
      get: function (id) {
        const chat = chats.find(function (item) { return item.id === id }) || chats[0]
        return Promise.resolve({ chat: Object.assign({ local_path: "/Users/hooman/Projects/brand-site", mode: "auto", model: "claude-sonnet-4-5" }, chat), messages: history, run: null, project: null, preview: null })
      },
      create: function (body) {
        const chat = { id: "c" + Math.random().toString(36).slice(2, 7), title: "New chat", updated_at: Date.now(), local_path: (body && body.local_path) || "", mode: "auto", model: "claude-sonnet-4-5" }
        chats.unshift(chat)
        return Promise.resolve({ chat: chat })
      },
      patch: function (id, body) {
        const chat = chats.find(function (item) { return item.id === id })
        if (chat) Object.assign(chat, body || {})
        return Promise.resolve({ chat: chat })
      },
      remove: function (id) {
        return Promise.resolve({ ok: true })
      }
    },
    send: function (payload) {
      simulate(payload.content)
      return Promise.resolve({ run_id: "run_demo" })
    },
    stopRun: function () {
      timers.forEach(clearTimeout)
      listeners.run.forEach(function (fn) { fn({ type: "done", status: "stopped" }) })
      return Promise.resolve({ ok: true })
    },
    respond: function (runId, id, value) {
      if (resolveApproval) resolveApproval(value)
      return Promise.resolve({ ok: true })
    },
    detachRun: function () {
      return Promise.resolve({ ok: true })
    },
    onRunEvent: function (fn) { listeners.run.push(fn); return function () {} },
    onRunError: function (fn) { listeners.error.push(fn); return function () {} },
    attachFiles: function () {
      return Promise.resolve({ files: [{ name: "pricing.png", path: "pricing.png", size: 240000, kind: "image" }] })
    },
    pickFolder: function () {
      return Promise.resolve({ folder: "/Users/hooman/Projects/brand-site" })
    },
    prefs: {
      all: function () { return Promise.resolve({}) },
      set: function (values) {
        prefsLog.push(values)
        return Promise.resolve({ ok: true })
      }
    },
    theme: {
      get: function () { return Promise.resolve({ theme: "dark" }) },
      on: function (fn) { listeners.theme.push(fn); return function () {} }
    },
    win: {
      control: function () { return Promise.resolve({ ok: true }) },
      onState: function (fn) { listeners.winState.push(fn); return function () {} }
    },
    openExternal: function (url) { window.open(url, "_blank"); return Promise.resolve({ ok: true }) },
    openPath: function () { return Promise.resolve("") },
    device: {
      state: function () { return Promise.resolve({ state: { state: "online" }, feed: [] }) },
      connect: function () { return Promise.resolve({ state: { state: "online" } }) },
      pair: function () { return Promise.resolve({}) },
      pause: function () { return Promise.resolve({ ok: true }) },
      panic: function () { listeners.panic.forEach(function (fn) { fn({}) }); return Promise.resolve({ ok: true }) },
      answer: function () { return Promise.resolve({ ok: true }) },
      apps: function () {
        return Promise.resolve({ apps: [{ name: "Safari", target: "Safari" }, { name: "Visual Studio Code", target: "Code" }, { name: "Finder", target: "Finder" }, { name: "Figma", target: "Figma" }, { name: "Slack", target: "Slack" }, { name: "Terminal", target: "Terminal" }, { name: "Spotify", target: "Spotify" }] })
      },
      openApp: function () { return Promise.resolve({ ok: true }) },
      screenshot: function () {
        return Promise.resolve({ data: "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#1d1c1b"/><rect x="40" y="40" width="380" height="240" rx="8" fill="#2a2927"/><rect x="60" y="70" width="180" height="10" rx="5" fill="#6f6b64"/><rect x="60" y="95" width="300" height="8" rx="4" fill="#4a4741"/><rect x="60" y="115" width="260" height="8" rx="4" fill="#4a4741"/><circle cx="540" cy="120" r="46" fill="#3a3835"/></svg>'), width: 640, height: 400 })
      },
      settings: function () { return Promise.resolve({ ok: true }) },
      info: function () { return Promise.resolve({ ok: true, hostname: "MacBook Pro", platform: "darwin", release: "25.0.0", home: "/Users/hooman" }) },
      onStatus: function (fn) { listeners.status.push(fn); return function () {} },
      onActivity: function (fn) { listeners.activity.push(fn); return function () {} },
      onAsk: function (fn) { listeners.ask.push(fn); return function () {} },
      onPanic: function (fn) { listeners.panic.push(fn); return function () {} }
    },
    term: {
      start: function (cwd) {
        return Promise.resolve({ cwd: cwd || "/Users/hooman" })
      },
      write: function (text) {
        const echo = function (value, delay) {
          setTimeout(function () {
            listeners.term.forEach(function (fn) { fn({ text: value }) })
          }, delay)
        }
        echo("$ " + text, 30)
        if (text.indexOf("ls") === 0) echo("src  package.json  README.md  node_modules\r\n", 200)
        else echo("zsh: command finished\r\n", 200)
      },
      stop: function () { return Promise.resolve({ ok: true }) },
      onData: function (fn) { listeners.term.push(fn); return function () {} },
      onExit: function ( fn) { listeners.termExit.push(fn); return function () {} }
    },
    git: {
      status: function () {
        return Promise.resolve({ branch: "main", files: files })
      },
      diff: function (folder, file) {
        return Promise.resolve({ text: "diff --git a/" + file + " b/" + file + "\nindex 3b18e51..a1f2c9d 100644\n--- a/" + file + "\n+++ b/" + file + "\n@@ -12,7 +12,9 @@ export function Pricing() {\n-  const plans = legacyPlans\n+  const plans = usePlans()\n+  const currency = useCurrency()\n   return (\n-    <div className=\"pricing\">\n+    <section className=\"pricing\" data-currency={currency}>\n       {plans.map((plan) => (\n-        <PlanCard plan={plan} />\n+        <PlanCard key={plan.id} plan={plan} featured={plan.featured} />\n" })
      }
    },
    fs: { read: function () { return Promise.resolve({ text: "" }) } },
    onMenu: function (fn) { listeners.menu.push(fn); return function () {} }
  }

  /* Contract guard: every bridge path the renderer touches must exist in preload.js. */
  const raw = window.fw
  const used = []
  const unknown = []
  const wrapped = new WeakSet()
  function guard(target, prefix) {
    if (!target || typeof target !== "object" || wrapped.has(target)) return target
    wrapped.add(target)
    return new Proxy(target, {
      get: function (object, prop) {
        if (typeof prop === "symbol" || prop === "then" || prop === "toJSON") return object[prop]
        const path = prefix ? prefix + "." + prop : prop
        if (!(prop in object)) {
          unknown.push(path)
          return function () { return Promise.resolve({}) }
        }
        used.push(path)
        const value = object[prop]
        if (value && typeof value === "object" && !Array.isArray(value)) return guard(value, path)
        return value
      }
    })
  }
  window.fw = guard(raw, "")
  window.FW_HARNESS = {
    prefs: function () { return prefsLog },
    ask: function (payload) { listeners.ask.forEach(function (fn) { fn(payload) }) },
    used: function () { return Array.from(new Set(used)).sort() },
    unknown: function () { return Array.from(new Set(unknown)).sort() },
    missing: function () {
      const contract = window.FW_CONTRACT || []
      const plain = []
      const walk = function (object, prefix) {
        Object.keys(object).forEach(function (key) {
          const path = prefix ? prefix + "." + key : key
          const value = object[key]
          if (typeof value === "object" && value !== null) walk(value, path)
          else plain.push(path)
        })
      }
      walk(raw, "")
      return contract.filter(function (path) { return plain.indexOf(path) === -1 })
    }
  }
})()
