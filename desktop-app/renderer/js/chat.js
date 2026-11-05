/* The conversation: history, the live turn and its flat activity lines. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon
  const md = window.FWMarkdown
  const L = window.FWLabels

  let thread = null
  let inner = null
  let stage = null
  let stick = true
  let live = null
  let current = null
  let lastReload = 0

  function init() {
    thread = document.getElementById("thread")
    stage = document.getElementById("stage")
    inner = h("div", { class: "thread-inner" })
    thread.appendChild(inner)
    thread.addEventListener("scroll", function () {
      stick = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 70
    })
    inner.addEventListener("click", onClick)
    thread.addEventListener("click", onClick)
  }

  function scrolled(force) {
    if (!stick && !force) return
    requestAnimationFrame(function () {
      thread.scrollTop = thread.scrollHeight
    })
  }

  function base(path) {
    const clean = String(path || "").replace(/\\/g, "/").replace(/\/+$/, "")
    const parts = clean.split("/")
    return parts.length <= 2 ? clean : parts.slice(-2).join("/")
  }

  /* --------------------------------------------------------------- empty */

  function greeting() {
    const hour = new Date().getHours()
    if (hour < 5) return "Still up?"
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  function showEmpty() {
    live = null
    current = null
    inner.innerHTML = ""
    stage.classList.add("is-empty")
    const suggestions = [
      { icon: "folder", text: "Open my Downloads folder and tidy it up", prompt: "Open my Downloads folder, look at what is in it and tidy it up. Tell me what you moved." },
      { icon: "image", text: "Change my desktop wallpaper", prompt: "Change my desktop wallpaper to something calm and dark. Pick a good one yourself and set it." },
      { icon: "eye", text: "Look at my screen and tell me what is wrong", prompt: "Take a screenshot of my screen, look at it and tell me what you see. Then fix anything that looks broken." },
      { icon: "app", text: "Open the apps I need and set up my workspace", prompt: "Open my code editor and my browser, then arrange the windows so I can start working." }
    ]
    const hero = h("div", { class: "empty-hero" }, [h("h1", { text: greeting() }), h("p", { text: "Ask, build, or let me use this computer for you." })])
    const list = h("div", { class: "suggestions" })
    suggestions.forEach(function (item) {
      list.appendChild(
        h("button", { class: "suggestion", dataset: { prompt: item.prompt } }, [h("span", { html: icon(item.icon, 14) }), h("span", { text: item.text })])
      )
    })
    inner.appendChild(hero)
    inner.appendChild(list)
    S.chat = null
  }

  /* ------------------------------------------------------------- history */

  function parseCalls(value) {
    if (!value) return []
    if (Array.isArray(value)) return value
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (problem) {
      return []
    }
  }

  function callName(call) {
    if (!call) return ""
    if (call.function && call.function.name) return call.function.name
    return call.name || ""
  }

  function callArgs(call) {
    if (!call) return {}
    const raw = call.function ? call.function.arguments : call.arguments
    if (!raw) return {}
    if (typeof raw === "object") return raw
    try {
      return JSON.parse(raw)
    } catch (problem) {
      return { raw: raw }
    }
  }

  function renderHistory(messages) {
    inner.innerHTML = ""
    stage.classList.remove("is-empty")
    const results = {}
    messages.forEach(function (message) {
      if (message.role === "tool" && message.tool_call_id) results[message.tool_call_id] = message
    })
    messages.forEach(function (message) {
      if (message.role === "user") {
        if (message.hidden) return
        addUser(message.content, message.meta)
        return
      }
      if (message.role !== "assistant") return
      const block = h("div", { class: "turn turn-agent" }, [h("div", { class: "agent-block" })])
      inner.appendChild(block)
      const flow = block.firstChild
      if (message.reasoning) addThinking(flow, message.reasoning, false)
      if (message.content) addText(flow, message.content)
      parseCalls(message.tool_calls).forEach(function (call) {
        const result = results[call.id]
        const meta = result && result.meta ? result.meta : {}
        addActivity(flow, {
          name: callName(call),
          args: callArgs(call),
          ok: result ? meta.ok !== false : true,
          output: result ? result.content || "" : "",
          finished: !!result,
          at: message.created_at
        })
      })
    })
    scrolled(true)
  }

  function setChat(data) {
    current = data.chat ? data.chat.id : null
    S.chat = data.chat || null
    live = null
    let messages = (data.messages || []).slice()
    const active = data.run && data.run.active
    if (active) {
      while (messages.length && messages[messages.length - 1].role !== "user") messages.pop()
    }
    renderHistory(messages)
    S.messages = messages
    if (active) {
      startLive(data.run.id, true)
    }
    S.running = !!active
    S.runId = active ? data.run.id : ""
    FW.store.emit("chat:loaded", data)
  }

  /* --------------------------------------------------------------- turns */

  function addUser(content, meta) {
    const bubble = h("div", { class: "bubble" })
    bubble.appendChild(h("div", { text: content || "" }))
    const files = (meta && meta.attachments) || []
    if (files.length) {
      const box = h("div", { class: "files" })
      box.textContent = files.map(function (file) {
        return L.fileName(file.name || file.path)
      }).join(", ")
      bubble.appendChild(box)
    }
    const turn = h("div", { class: "turn turn-user" }, [bubble])
    inner.appendChild(turn)
    stage.classList.remove("is-empty")
    return turn
  }

  function appendUser(content, meta) {
    if (stage.classList.contains("is-empty")) {
      inner.innerHTML = ""
      stage.classList.remove("is-empty")
    }
    addUser(content, meta)
    scrolled(true)
  }

  function ensureLive() {
    if (live) return live
    const turn = h("div", { class: "turn turn-agent" }, [h("div", { class: "agent-block" })])
    inner.appendChild(turn)
    stage.classList.remove("is-empty")
    live = { turn: turn, flow: turn.firstChild, textEl: null, think: null, rows: {}, runId: "", ignoreFirstUser: true, started: Date.now(), thinkingStarted: 0 }
    return live
  }

  function startLive(runId, ignoreFirstUser) {
    const state = ensureLive()
    state.runId = runId
    state.ignoreFirstUser = ignoreFirstUser !== false
    S.running = true
    S.runId = runId
    FW.store.emit("run:start", { runId: runId })
  }

  function addThinking(flow, text, isLive) {
    const body = h("div", { class: "think-body", text: "" })
    const word = h("span", { class: "think-word", text: isLive ? "Thinking" : thoughtLabel(text) })
    const head = h("button", { class: "think-head" + (isLive ? " live" : ""), type: "button" }, [word, h("span", { html: icon("chevron", 11, "chev") })])
    const wrap = h("div", { class: "think" }, [head, body])
    head.addEventListener("click", function () {
      wrap.classList.toggle("open")
    })
    if (text) body.textContent = text
    flow.appendChild(wrap)
    return { wrap: wrap, head: head, word: word, body: body, raw: text || "", started: Date.now(), open: false }
  }

  function thoughtLabel(text) {
    const words = String(text || "").trim().split(/\s+/).length
    const seconds = Math.max(1, Math.round(words / 7))
    return "Thought for " + (seconds > 60 ? Math.round(seconds / 60) + "m" : seconds + "s")
  }

  function addText(flow, text) {
    const node = h("div", { class: "md" })
    node.innerHTML = md.render(text)
    flow.appendChild(node)
    return node
  }

  function ensureText() {
    const state = ensureLive()
    if (state.textEl) return state.textEl
    // a new text block only starts when the last thing in the flow is not text
    state.textEl = addText(state.flow, "")
    state.textEl.dataset.raw = ""
    state.textEl.classList.add("streaming")
    return state.textEl
  }

  function addActivity(flow, info) {
    const name = info.name
    const args = info.args || {}
    const label = L.label(name, args)
    const detail = L.detail(name, args)
    const output = info.output || ""
    const hasOutput = output.trim().length > 0
    const row = h("div", { class: "act" })
    const meta = h("span", { class: "act-meta", text: info.finished ? (info.ms ? L.duration(info.ms) : "") : "" })
    const line = h("button", { class: "act-line", type: "button" }, [
      h("span", { class: "act-icon", html: icon(L.icon(name, args), 13) }),
      h("span", { class: "act-text", text: label }),
      meta,
      hasOutput ? h("span", { class: "act-chev", html: icon("chevron", 11) }) : null
    ])
    const out = h("div", { class: "act-out" })
    if (hasOutput) {
      out.appendChild(h("pre", { text: clampOutput(output) }))
    }
    if (detail && detail !== label && name === "computer" && args.action === "open") {
      // keep the open target visible in the expanded area
      out.appendChild(h("pre", { text: detail }))
    }
    row.appendChild(line)
    row.appendChild(out)
    row.dataset.name = name
    line.addEventListener("click", function () {
      if (!out.childNodes.length) return
      row.classList.toggle("open")
    })
    flow.appendChild(row)
    return { row: row, line: line, meta: meta, out: out, started: Date.now(), name: name, args: args, hasOutput: hasOutput }
  }

  function clampOutput(text) {
    const clean = String(text || "")
    return clean.length > 12000 ? clean.slice(0, 12000) + "\n\u2026 output cut" : clean
  }

  function setRunning(value) {
    S.running = !!value
    if (!value && live) {
      Object.keys(live.rows).forEach(function (id) {
        const row = live.rows[id]
        if (row.row.classList.contains("running")) {
          row.row.classList.remove("running")
          if (!row.meta.textContent) row.meta.textContent = ""
        }
      })
    }
    FW.store.emit("running", S.running)
  }

  /* -------------------------------------------------------------- events */

  function handleEvent(event) {
    if (!event) return
    if (S.chat && event.chat_id && S.chat.id !== event.chat_id) return
    const type = event.type
    if (type === "start") {
      startLive(event.run_id, true)
      if (event.model) S.runModel = event.model
      return
    }
    if (type === "user_message") {
      if (live && live.ignoreFirstUser) {
        live.ignoreFirstUser = false
        return
      }
      if (!live) startLive(S.runId || "")
      appendUser(event.content, event.meta)
      return
    }
    if (type === "step") return
    if (type === "text") {
      const state = ensureLive()
      if (state.think && state.think.head.classList.contains("live")) finishThinking(state)
      const el = ensureText()
      el.dataset.raw = (el.dataset.raw || "") + (event.text || "")
      scheduleRender(el)
      scrolled()
      return
    }
    if (type === "reasoning") {
      const state = ensureLive()
      if (state.textEl) {
        state.textEl.classList.remove("streaming")
        state.textEl = null
      }
      if (!state.think) {
        state.think = addThinking(state.flow, "", true)
        state.think.body.textContent = ""
      }
      state.think.raw += event.text || ""
      state.think.body.textContent = state.think.raw
      scrolled()
      return
    }
    if (type === "assistant") {
      const state = ensureLive()
      if (state.think) finishThinking(state)
      if (typeof event.content === "string") {
        const el = state.textEl || (event.content.trim() ? ensureText() : null)
        if (el) {
          el.dataset.raw = event.content
          el.innerHTML = md.render(event.content)
          el.classList.remove("streaming")
        }
        state.textEl = null
      }
      state.think = null
      return
    }
    if (type === "tool_start") {
      const state = ensureLive()
      if (state.think) finishThinking(state)
      if (state.textEl) {
        state.textEl.classList.remove("streaming")
        state.textEl = null
      }
      const row = addActivity(state.flow, { name: event.name, args: event.args || {}, finished: false })
      row.row.classList.add("running")
      state.rows[event.id] = row
      scrolled()
      return
    }
    if (type === "tool_end") {
      const state = ensureLive()
      const row = state.rows[event.id]
      if (!row) return
      row.row.classList.remove("running")
      const ms = Date.now() - row.started
      row.meta.textContent = event.ok === false ? "failed" : L.duration(ms)
      if (event.ok === false) row.meta.style.color = "var(--bad)"
      const text = event.text || ""
      if (text.trim()) {
        if (!row.line.querySelector(".act-chev")) row.line.appendChild(h("span", { class: "act-chev", html: icon("chevron", 11) }))
        row.out.appendChild(h("pre", { text: clampOutput(text) }))
      }
      if (event.meta && event.meta.files) {
        S.changedFiles = event.meta.files
        if (window.FW.panel) window.FW.panel.setChanges(event.meta.files)
      }
      return
    }
    if (type === "waiting") {
      showWaiting(event)
      return
    }
    if (type === "answered") {
      markAnswered(event)
      return
    }
    if (type === "changes") {
      S.changedFiles = event.files || []
      if (window.FW.panel) window.FW.panel.setChanges(S.changedFiles)
      return
    }
    if (type === "context") {
      S.context = { tokens: event.tokens || 0, limit: event.limit || 0 }
      FW.store.emit("context", S.context)
      return
    }
    if (type === "usage") {
      S.usage = Object.assign({}, S.usage || {}, event)
      return
    }
    if (type === "title") {
      if (S.chat) S.chat.title = event.title
      FW.store.emit("title", event.title)
      return
    }
    if (type === "notice") {
      if (event.text) U.toast(event.text, "warn", 4200)
      return
    }
    if (type === "checkpoint") {
      const state = ensureLive()
      const row = addActivity(state.flow, { name: "checkpoint", args: {}, finished: true })
      row.line.querySelector(".act-text").textContent = "Saved a checkpoint"
      return
    }
    if (type === "compacting" || type === "compacted") {
      const state = ensureLive()
      const text = type === "compacting" ? "Compacting the context" : "Compacted the context"
      const row = addActivity(state.flow, { name: "compact", args: {}, finished: type === "compacted" })
      row.line.querySelector(".act-text").textContent = text
      return
    }
    if (type === "sub") {
      if (event.text) {
        const state = ensureLive()
        const row = addActivity(state.flow, { name: "task", args: {}, finished: false })
        row.line.querySelector(".act-text").textContent = event.text
      }
      return
    }
    if (type === "done") {
      finishLive(event.status)
      return
    }
    if (type === "error") {
      const state = ensureLive()
      state.flow.appendChild(h("div", { class: "turn-error" }, [h("span", { html: icon("alert", 13) }), h("span", { text: event.text || "Something went wrong." })]))
      setRunning(false)
      scrolled()
      return
    }
  }

  function finishThinking(state) {
    if (!state.think) return
    const seconds = Math.max(1, Math.round((Date.now() - state.think.started) / 1000))
    state.think.head.classList.remove("live")
    state.think.word.textContent = "Thought for " + (seconds >= 60 ? Math.round(seconds / 60) + "m" : seconds + "s")
    state.think = null
  }

  let renderQueue = new Map()
  function scheduleRender(el) {
    if (renderQueue.has(el)) return
    renderQueue.set(el, true)
    requestAnimationFrame(function () {
      renderQueue.delete(el)
      if (!el.isConnected) return
      el.innerHTML = md.render(el.dataset.raw || "")
    })
  }

  /* ------------------------------------------------------------ approvals */

  function showWaiting(event) {
    const state = ensureLive()
    const isApproval = event.kind === "approval"
    const name = event.name || ""
    const args = event.args || {}
    const card = h("div", { class: "approve", dataset: { call: event.id } })
    if (isApproval) {
      const label = L.label(name, args)
      const command = args.command || args.text || ""
      const target = args.path || args.folder || args.url || args.name || args.app || ""
      card.appendChild(h("div", { class: "approve-title" }, [h("span", { html: icon("shield", 13) }), h("span", { text: "Allow this on your computer?" })]))
      if (command) card.appendChild(h("div", { class: "approve-pre", text: command }))
      else if (target) card.appendChild(h("div", { class: "approve-pre", text: String(target) }))
      else card.appendChild(h("div", { class: "approve-pre", text: label }))
      const what = name === "computer" ? (args.action ? String(args.action).replace(/_/g, " ") : "this action") : name
      const actions = h("div", { class: "approve-actions" }, [
        h("button", { class: "btn primary sm", dataset: { answer: "allow" }, text: "Allow" }),
        event.always === false ? null : h("button", { class: "btn sm", dataset: { answer: "always" }, text: "Always allow", title: "Do not ask again for " + what }),
        h("button", { class: "btn ghost sm", dataset: { answer: "deny" }, text: "Deny" }),
        h("span", { class: "note", text: "Forkwise is asking before acting" })
      ])
      card.appendChild(actions)
      card.addEventListener("click", function (clickEvent) {
        const button = clickEvent.target.closest("[data-answer]")
        if (!button) return
        answer(card, event.id, button.dataset.answer)
      })
    } else {
      const question = event.question || "Forkwise needs an answer."
      card.appendChild(h("div", { class: "question-text", text: question }))
      const options = event.options || []
      if (options.length) {
        const list = h("div", { class: "question-options" })
        options.forEach(function (option) {
          const label = typeof option === "string" ? option : option.label || option.text || JSON.stringify(option)
          list.appendChild(h("button", { class: "question-option", dataset: { answer: label } }, [h("span", { html: icon("chevron", 11) }), h("span", { text: label })]))
        })
        card.appendChild(list)
      }
      const input = h("input", { placeholder: "Type an answer", type: "text" })
      const send = h("button", { class: "btn sm primary", text: "Send" })
      const box = h("div", { class: "question-input" }, [input, send])
      card.appendChild(box)
      card.addEventListener("click", function (clickEvent) {
        const button = clickEvent.target.closest("[data-answer]")
        if (button) answer(card, event.id, button.dataset.answer)
      })
      send.addEventListener("click", function () {
        if (input.value.trim()) answer(card, event.id, input.value.trim())
      })
      input.addEventListener("keydown", function (keyEvent) {
        if (keyEvent.key === "Enter" && input.value.trim()) answer(card, event.id, input.value.trim())
      })
      setTimeout(function () {
        input.focus()
      }, 30)
    }
    state.flow.appendChild(card)
    scrolled(true)
  }

  async function answer(card, id, value) {
    if (card.classList.contains("done")) return
    const runId = (live && live.runId) || S.runId
    card.classList.add("done")
    Array.prototype.forEach.call(card.querySelectorAll("button"), function (button) {
      button.disabled = true
    })
    try {
      await window.fw.respond(runId, id, value)
      const done = h("div", { class: "answer", text: value === "deny" ? "Denied" : value === "always" ? "Allowed, and remembered" : "Allowed" })
      card.appendChild(done)
    } catch (problem) {
      U.toast(problem.message || "Could not send the answer", "bad")
      card.classList.remove("done")
    }
  }

  function markAnswered(event) {
    const card = inner.querySelector('.approve[data-call="' + event.id + '"]')
    if (card) card.classList.add("done")
  }

  /* ---------------------------------------------------------------- done */

  function finishLive(status) {
    if (live && live.textEl) {
      live.textEl.classList.remove("streaming")
      live.textEl = null
    }
    if (live && live.think) finishThinking(live)
    setRunning(false)
    S.runId = ""
    scrolled()
    const chatId = S.chat ? S.chat.id : current
    if (chatId && Date.now() - lastReload > 600) {
      lastReload = Date.now()
      setTimeout(function () {
        FW.store.emit("run:done", { chatId: chatId, status: status })
      }, 250)
    }
  }

  function onDevicePanic() {
    if (!live) return
    live.flow.appendChild(h("div", { class: "turn-error" }, [h("span", { html: icon("alert", 13) }), h("span", { text: "Stopped everything on this computer." })]))
  }

  /* -------------------------------------------------------------- clicks */

  function onClick(event) {
    const link = event.target.closest("a[data-external]")
    if (link) {
      event.preventDefault()
      window.fw.openExternal(link.getAttribute("href"))
      return
    }
    const copy = event.target.closest("[data-copy]")
    if (copy) {
      const box = copy.closest(".md-code")
      const code = box ? box.querySelector("code") : null
      if (code) U.copy(code.textContent)
      return
    }
    const suggestion = event.target.closest(".suggestion")
    if (suggestion) {
      FW.composer.fill(suggestion.dataset.prompt || "")
      return
    }
    const shot = event.target.closest("img.zoom")
    if (shot) {
      const back = h("div", { class: "modal-back" }, [h("img", { src: shot.src, style: "max-width:92vw;max-height:92vh;border-radius:8px;box-shadow:var(--shadow-2)" })])
      back.addEventListener("click", function () {
        back.remove()
      })
      document.body.appendChild(back)
    }
  }

  window.FW = window.FW || {}
  window.FW.chat = {
    init: init,
    setChat: setChat,
    showEmpty: showEmpty,
    appendUser: appendUser,
    handleEvent: handleEvent,
    setRunning: setRunning,
    onPanic: onDevicePanic,
    scroll: scrolled,
    current: function () {
      return current
    },
    note: function (text, kind) {
      const state = ensureLive()
      state.flow.appendChild(h("div", { class: kind === "error" ? "turn-error" : "turn-system" }, [h("span", { html: icon(kind === "error" ? "alert" : "dot", 13) }), h("span", { text: text })]))
      scrolled()
    }
  }
})()
