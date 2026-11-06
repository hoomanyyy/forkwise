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
  let jump = null
  let live = null
  let current = null
  let lastReload = 0

  // Following the bottom: true while the reader is at the end of the thread.
  let stick = true
  // The scrollTop this file set last, so its own scrolls are not taken as the reader's.
  let autoTop = -1
  let gliding = false

  function init() {
    thread = document.getElementById("thread")
    stage = document.getElementById("stage")
    inner = h("div", { class: "thread-inner" })
    thread.appendChild(inner)
    jump = h("button", { class: "jump", type: "button", title: "Jump to the latest (End)", hidden: true }, [
      h("span", { class: "jump-dot" }),
      h("span", { html: icon("chevronDown", 12) }),
      h("span", { text: "Latest" })
    ])
    jump.addEventListener("click", function () {
      follow(true)
    })
    // it sits just above the message box, wherever that is
    document.getElementById("composerDock").appendChild(jump)
    wireScroll()
    thread.addEventListener("click", onClick)
  }

  /* ------------------------------------------------------------ scrolling */

  function distance() {
    return thread.scrollHeight - thread.scrollTop - thread.clientHeight
  }

  function setTop(value) {
    thread.scrollTop = value
    autoTop = thread.scrollTop
  }

  // The reader took over: stop pulling the thread down.
  function release() {
    stick = false
    gliding = false
    showJump()
  }

  function showJump() {
    if (!jump) return
    const far = distance() > 160
    jump.hidden = !far
    jump.classList.toggle("live", !!S.running)
  }

  function hideJump() {
    if (jump) jump.hidden = true
  }

  function typingIn(target) {
    if (!target) return false
    const tag = target.tagName
    return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
  }

  function wireScroll() {
    thread.addEventListener("wheel", function (event) {
      if (event.deltaY < 0) release()
    }, { passive: true })
    thread.addEventListener("touchmove", function () {
      if (distance() > 8) release()
    }, { passive: true })
    thread.addEventListener("mousedown", function (event) {
      // a press on the scrollbar itself
      if (event.target === thread && event.offsetX >= thread.clientWidth) release()
    })
    document.addEventListener("keydown", function (event) {
      if (typingIn(event.target) || U.overlayOpen()) return
      if (event.key === "PageUp" || event.key === "Home" || (event.key === "ArrowUp" && !event.altKey)) release()
      if (event.key === "End" && !event.ctrlKey && !event.metaKey) follow(true)
    })
    thread.addEventListener("scroll", function () {
      if (Math.abs(thread.scrollTop - autoTop) < 2) return
      autoTop = -1
      if (distance() < 8) {
        stick = true
        hideJump()
      } else {
        stick = false
        gliding = false
        showJump()
      }
    }, { passive: true })
    // Anything that changes the height (new text, a line opening) keeps the bottom in view.
    if (window.ResizeObserver) {
      const watcher = new ResizeObserver(function () {
        follow()
      })
      watcher.observe(inner)
      watcher.observe(thread)
    }
  }

  // Eases the thread down to the newest content instead of jumping, so lines
  // slide in calmly while the agent works.
  function follow(force) {
    if (!thread) return
    if (force) {
      stick = true
      hideJump()
    }
    if (!stick) {
      showJump()
      return
    }
    if (gliding) return
    gliding = true
    requestAnimationFrame(glide)
  }

  function glide() {
    if (!gliding || !stick) {
      gliding = false
      return
    }
    const target = thread.scrollHeight - thread.clientHeight
    const gap = target - thread.scrollTop
    if (gap <= 1) {
      gliding = false
      return
    }
    if (gap > thread.clientHeight * 1.5) {
      // far away: skip most of it, glide the last part
      setTop(target - thread.clientHeight * 0.6)
    } else {
      setTop(thread.scrollTop + Math.max(1, Math.ceil(gap * 0.16)))
    }
    requestAnimationFrame(glide)
  }

  // Straight to the bottom, no easing: for opening a chat.
  function toBottom() {
    stick = true
    gliding = false
    hideJump()
    setTop(thread.scrollHeight)
    requestAnimationFrame(function () {
      if (stick) setTop(thread.scrollHeight)
    })
  }

  function scrolled(force) {
    if (force) toBottom()
    else follow()
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
    hideJump()
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
    const tips = h("div", { class: "empty-tips" }, [
      h("span", {}, [h("kbd", { text: "Enter" }), h("span", { text: " send" })]),
      h("span", {}, [h("kbd", { text: "Shift+Enter" }), h("span", { text: " new line" })]),
      h("span", {}, [h("kbd", { text: U.key("Mod+K") }), h("span", { text: " search chats" })]),
      h("span", { text: "Drop files here to attach them" })
    ])
    inner.appendChild(hero)
    inner.appendChild(list)
    inner.appendChild(tips)
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

  // Message content can be plain text or a list of parts (text and images).
  function contentText(content) {
    if (typeof content === "string") return content
    if (!Array.isArray(content)) return content == null ? "" : String(content)
    const parts = []
    content.forEach(function (part) {
      if (part && typeof part.text === "string") parts.push(part.text)
    })
    return parts.join("\n")
  }

  function newAgentTurn(enter) {
    const turn = h("div", { class: "turn turn-agent" + (enter ? " enter" : "") }, [h("div", { class: "agent-block" })])
    inner.appendChild(turn)
    return turn
  }

  function renderHistory(messages) {
    inner.innerHTML = ""
    stage.classList.remove("is-empty")
    const results = {}
    messages.forEach(function (message) {
      if (message.role === "tool" && message.tool_call_id) results[message.tool_call_id] = message
    })
    // all the steps of one answer share a single turn, like the live view
    let turn = null
    messages.forEach(function (message) {
      if (message.role === "user") {
        if (message.hidden) return
        turn = null
        addUser(contentText(message.content), message.meta, message.id, false)
        return
      }
      if (message.role !== "assistant") return
      if (!turn) turn = newAgentTurn(false)
      const flow = turn.firstChild
      if (message.reasoning) addThinking(flow, message.reasoning, false)
      const text = contentText(message.content)
      if (text.trim()) addText(flow, text)
      parseCalls(message.tool_calls).forEach(function (call) {
        const result = results[call.id]
        const meta = result && result.meta ? result.meta : {}
        addActivity(flow, {
          name: callName(call),
          args: callArgs(call),
          ok: result ? meta.ok !== false : true,
          output: result ? contentText(result.content) : "",
          finished: !!result,
          enter: false
        })
      })
    })
    if (!inner.childNodes.length) inner.appendChild(h("div", { class: "empty-chat", text: "No messages here yet. Write one below." }))
    addTurnActions()
    markPlans(S.running)
  }

  // Before a chat is drawn again (after a run ends) the reader's place, the
  // lines they opened and the real timings are kept.
  function snapshot() {
    const opened = []
    const thinkWords = []
    const metas = []
    Array.prototype.forEach.call(inner.querySelectorAll(".act, .think"), function (el, index) {
      if (el.classList.contains("open") && !el.classList.contains("auto")) opened.push(index)
    })
    Array.prototype.forEach.call(inner.querySelectorAll(".think-word"), function (el) {
      thinkWords.push(el.textContent)
    })
    Array.prototype.forEach.call(inner.querySelectorAll(".act-meta"), function (el) {
      metas.push(el.textContent)
    })
    return { stick: stick, top: thread.scrollTop, opened: opened, count: inner.querySelectorAll(".act, .think").length, thinkWords: thinkWords, metas: metas }
  }

  function restore(view) {
    const items = inner.querySelectorAll(".act, .think")
    if (items.length === view.count) {
      view.opened.forEach(function (index) {
        if (items[index]) items[index].classList.add("open")
      })
    }
    const words = inner.querySelectorAll(".think-word")
    if (words.length === view.thinkWords.length) {
      Array.prototype.forEach.call(words, function (el, index) {
        if (/^Thought for/.test(view.thinkWords[index])) el.textContent = view.thinkWords[index]
      })
    }
    const metas = inner.querySelectorAll(".act-meta")
    if (metas.length === view.metas.length) {
      Array.prototype.forEach.call(metas, function (el, index) {
        if (!el.textContent && view.metas[index]) el.textContent = view.metas[index]
      })
    }
    if (view.stick) toBottom()
    else {
      setTop(view.top)
      stick = false
      showJump()
    }
  }

  function setChat(data) {
    const same = data.chat && current === data.chat.id && inner.childNodes.length > 0 && !stage.classList.contains("is-empty")
    const view = same ? snapshot() : null
    current = data.chat ? data.chat.id : null
    S.chat = data.chat || null
    live = null
    let messages = (data.messages || []).slice()
    const active = data.run && data.run.active
    if (active) {
      while (messages.length && messages[messages.length - 1].role !== "user") messages.pop()
    }
    S.running = !!active
    S.runId = active ? data.run.id : ""
    S.messages = messages
    renderHistory(messages)
    if (active) {
      startLive(data.run.id)
    }
    if (view) restore(view)
    else toBottom()
    FW.store.emit("chat:loaded", data)
  }

  /* --------------------------------------------------------------- turns */

  function addUser(content, meta, id, enter) {
    const text = content || ""
    const bubble = h("div", { class: "bubble" })
    const body = h("div", { class: "bubble-text", dir: "auto", text: text })
    bubble.appendChild(body)
    const files = (meta && meta.attachments) || []
    if (files.length) {
      const box = h("div", { class: "files" })
      files.forEach(function (file) {
        box.appendChild(h("span", { class: "file-pill", title: file.path || file.name }, [h("span", { html: icon(file.kind === "image" ? "image" : "file", 11) }), h("span", { text: L.fileName(file.name || file.path) })]))
      })
      bubble.appendChild(box)
    }
    const lines = text.split("\n").length
    if (text.length > 1400 || lines > 16) {
      bubble.classList.add("long")
      const more = h("button", { class: "bubble-more", type: "button", text: "Show more" })
      more.addEventListener("click", function () {
        const open = bubble.classList.toggle("expanded")
        more.textContent = open ? "Show less" : "Show more"
      })
      bubble.appendChild(more)
    }
    const actions = h("div", { class: "msg-actions" }, [
      h("button", { class: "msg-btn", type: "button", title: "Copy", html: icon("copy", 12), dataset: { act: "copy-user" } }),
      id ? h("button", { class: "msg-btn", type: "button", title: "Edit and send again from here", html: icon("edit", 12), dataset: { act: "edit" } }) : null
    ])
    const turn = h("div", { class: "turn turn-user" + (enter ? " enter" : ""), dataset: { id: id || "" } }, [bubble, actions])
    turn.dataset.raw = text
    inner.appendChild(turn)
    stage.classList.remove("is-empty")
    return turn
  }

  function appendUser(content, meta, id) {
    if (stage.classList.contains("is-empty")) {
      inner.innerHTML = ""
      stage.classList.remove("is-empty")
    }
    const blank = inner.querySelector(".empty-chat")
    if (blank) blank.remove()
    clearTurnActions()
    addUser(content, meta, id, true)
    follow(true)
  }

  function ensureLive() {
    if (live) return live
    clearTurnActions()
    const blank = inner.querySelector(".empty-chat")
    if (blank) blank.remove()
    const turn = newAgentTurn(true)
    stage.classList.remove("is-empty")
    live = { turn: turn, flow: turn.firstChild, textEl: null, think: null, rows: {}, runId: "", started: Date.now(), compact: null }
    return live
  }

  function startLive(runId) {
    const state = ensureLive()
    state.runId = runId
    S.running = true
    S.runId = runId
    FW.store.emit("run:start", { runId: runId })
  }

  // The thinking line: "Thinking" while it runs, "Thought for 4s" after.
  function addThinking(flow, text, isLive) {
    const body = h("div", { class: "think-body", dir: "auto", text: text || "" })
    const word = h("span", { class: "think-word", text: isLive ? "Thinking" : thoughtLabel(text) })
    const head = h("button", { class: "think-head" + (isLive ? " live" : ""), type: "button" }, [word, h("span", { html: icon("chevron", 11, "chev") })])
    const wrap = h("div", { class: "think" + (isLive ? " enter" : "") }, [head, h("div", { class: "fold" }, [h("div", { class: "fold-inner" }, [body])])])
    head.addEventListener("click", function () {
      wrap.classList.remove("auto")
      wrap.classList.toggle("open")
    })
    flow.appendChild(wrap)
    return { wrap: wrap, head: head, word: word, body: body, raw: text || "", started: Date.now() }
  }

  function thoughtLabel(text) {
    const words = String(text || "").trim().split(/\s+/).length
    const seconds = Math.max(1, Math.round(words / 7))
    return "Thought for " + (seconds >= 60 ? Math.round(seconds / 60) + "m" : seconds + "s")
  }

  function addText(flow, text) {
    const node = h("div", { class: "md" })
    node.dataset.raw = text || ""
    node.innerHTML = md.render(text || "")
    flow.appendChild(node)
    return node
  }

  function ensureText() {
    const state = ensureLive()
    if (state.textEl) return state.textEl
    // a new text block only starts when the last thing in the flow is not text
    state.textEl = addText(state.flow, "")
    state.textEl.classList.add("streaming", "enter")
    return state.textEl
  }

  /* -------------------------------------------------------- smooth text */

  // Streamed text is revealed at a steady pace instead of in bursts, and the
  // markdown is redrawn at most about 30 times a second.
  const reveals = new WeakMap()

  function revealText(el) {
    let info = reveals.get(el)
    if (!info) {
      info = { shown: 0, drawn: 0, busy: false }
      reveals.set(el, info)
    }
    if (info.busy) return
    info.busy = true
    requestAnimationFrame(function tick(now) {
      const raw = el.dataset.raw || ""
      if (!el.isConnected) {
        info.busy = false
        return
      }
      const backlog = raw.length - info.shown
      if (backlog <= 0) {
        info.busy = false
        if (info.drawnLength !== raw.length) draw(el, raw, info, now)
        return
      }
      let next = info.shown + Math.max(2, Math.ceil(backlog / 9))
      if (next < raw.length) {
        const code = raw.charCodeAt(next - 1)
        if (code >= 0xd800 && code <= 0xdbff) next += 1
      }
      info.shown = Math.min(raw.length, next)
      if (now - info.drawn > 30 || info.shown >= raw.length) draw(el, raw.slice(0, info.shown), info, now)
      requestAnimationFrame(tick)
    })
  }

  function draw(el, text, info, now) {
    el.innerHTML = md.render(text)
    info.drawn = now
    info.drawnLength = text.length
  }

  function flushText(el) {
    const info = reveals.get(el)
    const raw = el.dataset.raw || ""
    if (info) {
      info.shown = raw.length
      info.drawnLength = raw.length
    }
    el.innerHTML = md.render(raw)
  }

  /* ------------------------------------------------------ activity lines */

  function addActivity(flow, info) {
    const name = info.name
    const args = info.args || {}
    if (name === "exit_plan_mode") return addPlan(flow, args.plan || "", info)
    const label = L.label(name, args)
    const detail = L.detail(name, args)
    const output = info.output || ""
    const row = h("div", { class: "act" + (info.enter ? " enter" : "") + (info.finished && info.ok === false ? " failed" : "") })
    const text = h("span", { class: "act-text", text: info.finished ? label : L.running(label), title: detail || label })
    const meta = h("span", { class: "act-meta", text: info.finished && info.ok === false ? "failed" : "" })
    const line = h("button", { class: "act-line", type: "button" }, [
      h("span", { class: "act-icon", html: icon(L.icon(name, args), 13) }),
      text,
      meta,
      h("span", { class: "act-chev", html: icon("chevron", 11) })
    ])
    const body = h("div", { class: "fold-inner" })
    const out = h("div", { class: "act-out fold" }, [body])
    row.appendChild(line)
    row.appendChild(out)
    row.dataset.name = name
    const item = { row: row, line: line, text: text, label: label, meta: meta, out: out, body: body, pre: null, started: Date.now(), name: name, args: args, streamed: "", subs: null }
    if (name === "todo_write" && Array.isArray(args.todos)) body.appendChild(todoList(args.todos))
    if (detail && detail !== label && (name === "bash" || (name === "computer" && (args.action === "shell" || args.action === "open")))) {
      body.appendChild(h("div", { class: "act-cmd", text: detail }))
    }
    if (output.trim()) setOutput(item, output)
    line.addEventListener("click", function () {
      if (!body.childNodes.length) return
      row.classList.remove("auto")
      row.classList.toggle("open")
    })
    refreshChevron(item)
    flow.appendChild(row)
    return item
  }

  function setOutput(item, text) {
    if (!item.pre) {
      item.pre = h("pre", { class: "act-pre" })
      item.body.appendChild(item.pre)
    }
    item.pre.textContent = clampOutput(text)
    refreshChevron(item)
  }

  function refreshChevron(item) {
    item.row.classList.toggle("has-out", item.body.childNodes.length > 0)
  }

  function todoList(todos) {
    const list = h("div", { class: "todos" })
    todos.forEach(function (todo) {
      const status = String(todo.status || "")
      const mark = status === "completed" || status === "done" ? "check" : status === "in_progress" ? "play" : "dot"
      list.appendChild(h("div", { class: "todo " + status }, [h("span", { class: "todo-mark", html: icon(mark, 11) }), h("span", { dir: "auto", text: todo.content || todo.text || todo.title || "" })]))
    })
    return list
  }

  function addPlan(flow, plan, info) {
    const card = h("div", { class: "plan-card" + (info.enter ? " enter" : "") }, [
      h("div", { class: "plan-head" }, [h("span", { html: icon("list", 13) }), h("span", { text: "Plan ready for review" })]),
      h("div", { class: "plan-body md", html: md.render(plan || "") }),
      h("div", { class: "plan-actions" }, [
        h("button", { class: "btn primary sm", type: "button", text: "Approve and build", dataset: { act: "plan-ok" } }),
        h("button", { class: "btn ghost sm", type: "button", text: "Keep planning", dataset: { act: "plan-more" } })
      ])
    ])
    flow.appendChild(card)
    const item = { row: card, line: card, text: card, label: "", meta: h("span"), out: card, body: card, pre: null, started: Date.now(), name: "exit_plan_mode", args: {}, plan: true }
    return item
  }

  // Only the newest plan, with nothing sent after it, can still be approved.
  function markPlans(running) {
    const cards = inner.querySelectorAll(".plan-card")
    Array.prototype.forEach.call(cards, function (card) {
      card.classList.remove("active")
    })
    if (!cards.length || running) return
    const last = cards[cards.length - 1]
    const turn = last.closest(".turn")
    if (turn && !turn.nextElementSibling) last.classList.add("active")
  }

  function clampOutput(text) {
    const clean = String(text || "")
    return clean.length > 12000 ? clean.slice(0, 12000) + "\n… output cut" : clean
  }

  function finishRow(row, ok, ms) {
    if (!row || row.plan) return
    row.row.classList.remove("running")
    row.text.textContent = row.label
    if (ok === false) {
      row.row.classList.add("failed")
      row.meta.textContent = "failed"
    } else if (ms !== undefined && ms >= 1000) {
      // quick steps stay clean, slow ones show how long they took
      row.meta.textContent = L.duration(ms)
    }
    if (row.row.classList.contains("auto")) row.row.classList.remove("open", "auto")
  }

  function setRunning(value) {
    S.running = !!value
    if (!value && live) {
      Object.keys(live.rows).forEach(function (id) {
        const row = live.rows[id]
        if (row.row.classList.contains("running")) finishRow(row, undefined)
      })
    }
    if (!value) {
      addTurnActions()
      markPlans(false)
    } else {
      clearTurnActions()
      markPlans(true)
    }
    if (jump) jump.classList.toggle("live", !!S.running)
    FW.store.emit("running", S.running)
  }

  /* ------------------------------------------------------- turn actions */

  function clearTurnActions() {
    Array.prototype.forEach.call(inner.querySelectorAll(".turn-actions"), function (node) {
      node.remove()
    })
  }

  // Copy and retry under the finished answer.
  function addTurnActions() {
    clearTurnActions()
    if (S.running) return
    const turns = inner.querySelectorAll(".turn-agent")
    const last = turns[turns.length - 1]
    if (!last || last.nextElementSibling) return
    if (!last.querySelector(".md, .act, .think, .plan-card, .turn-error")) return
    const bar = h("div", { class: "turn-actions" }, [
      h("button", { class: "msg-btn", type: "button", dataset: { act: "copy-turn" }, title: "Copy the answer" }, [h("span", { html: icon("copy", 12) }), h("span", { text: "Copy" })]),
      lastUser() ? h("button", { class: "msg-btn", type: "button", dataset: { act: "retry" }, title: "Ask the same thing again" }, [h("span", { html: icon("refresh", 12) }), h("span", { text: "Retry" })]) : null
    ])
    last.appendChild(bar)
  }

  function lastUser() {
    const messages = S.messages || []
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "user" && !messages[index].hidden) return messages[index]
    }
    return null
  }

  function turnText(turn) {
    const parts = []
    Array.prototype.forEach.call(turn.querySelectorAll(".agent-block > .md"), function (node) {
      if (node.dataset.raw) parts.push(node.dataset.raw.trim())
    })
    return parts.join("\n\n")
  }

  async function retry() {
    const message = lastUser()
    if (!message || !S.chat || S.running) return
    try {
      await window.fw.api("/api/chats/" + encodeURIComponent(S.chat.id) + "/rewind", "POST", { message_id: message.id, files: false })
      const attachments = (message.meta && message.meta.attachments) || []
      await FW.app.openChat(S.chat.id, true)
      FW.composer.resend(contentText(message.content), attachments)
    } catch (problem) {
      U.toast(problem.message || "Could not retry", "bad")
    }
  }

  async function editFrom(turn) {
    const id = turn.dataset.id
    if (!id || !S.chat) return
    if (S.running) {
      U.toast("Stop the agent first, then edit the message")
      return
    }
    const sure = await U.dialog({ title: "Edit this message?", text: "Everything after it is removed and the file changes made since are undone. The text goes back into the box for you to change.", ok: "Edit", danger: true })
    if (!sure) return
    try {
      const data = await window.fw.api("/api/chats/" + encodeURIComponent(S.chat.id) + "/rewind", "POST", { message_id: id, files: true })
      await FW.app.openChat(S.chat.id, true)
      FW.composer.fill(contentText(data.content || turn.dataset.raw || ""))
      U.toast(data.files_restored ? "Went back, files restored" : "Went back to that message")
    } catch (problem) {
      U.toast(problem.message || "Could not go back to that message", "bad")
    }
  }

  /* -------------------------------------------------------------- events */

  function closeText(state) {
    if (state.textEl) {
      state.textEl.classList.remove("streaming")
      state.textEl = null
    }
  }

  function handleEvent(event) {
    if (!event) return
    if (S.chat && event.chat_id && S.chat.id !== event.chat_id) return
    const type = event.type
    if (type === "start") {
      startLive(event.run_id)
      if (event.model) S.runModel = event.model
      return
    }
    if (type === "user_message") {
      // a message sent while the agent was busy is picked up now
      if (event.id && inner.querySelector('.turn-user[data-id="' + event.id + '"]')) return
      const state = ensureLive()
      closeText(state)
      if (state.think) finishThinking(state)
      dropQueued(event.content)
      appendUser(event.content, event.meta, event.id)
      const turn = newAgentTurn(true)
      state.turn = turn
      state.flow = turn.firstChild
      return
    }
    if (type === "queued") {
      showQueued(event.content || "")
      return
    }
    if (type === "step") return
    if (type === "text") {
      const state = ensureLive()
      if (state.think) finishThinking(state)
      const el = ensureText()
      el.dataset.raw = (el.dataset.raw || "") + (event.text || "")
      revealText(el)
      return
    }
    if (type === "reasoning") {
      const state = ensureLive()
      closeText(state)
      if (!state.think) state.think = addThinking(state.flow, "", true)
      state.think.raw += event.text || ""
      state.think.body.textContent = state.think.raw
      return
    }
    if (type === "assistant") {
      const state = ensureLive()
      if (state.think) finishThinking(state)
      if (typeof event.content === "string") {
        const el = state.textEl || (event.content.trim() ? ensureText() : null)
        if (el) {
          el.dataset.raw = event.content
          revealText(el)
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
      closeText(state)
      const row = addActivity(state.flow, { name: event.name, args: event.args || {}, finished: false, enter: true })
      if (!row.plan) row.row.classList.add("running")
      state.rows[event.id] = row
      return
    }
    if (type === "tool_output") {
      const state = ensureLive()
      const row = state.rows[event.id]
      if (!row || row.plan) return
      row.streamed = (row.streamed + (event.text || "")).slice(-20000)
      setOutput(row, row.streamed)
      if (!row.row.classList.contains("open")) row.row.classList.add("open", "auto")
      if (row.pre) row.pre.scrollTop = row.pre.scrollHeight
      return
    }
    if (type === "tool_end") {
      const state = ensureLive()
      const row = state.rows[event.id]
      if (!row) return
      const text = event.text || ""
      if (text.trim() && !row.plan) setOutput(row, text)
      finishRow(row, event.ok, Date.now() - row.started)
      if (event.meta && event.meta.files) {
        S.changedFiles = event.meta.files
        if (window.FW.panel) window.FW.panel.setChanges(event.meta.files)
      }
      return
    }
    if (type === "sub") {
      subEvent(event)
      return
    }
    if (type === "todos") {
      const state = ensureLive()
      const rows = Object.keys(state.rows).map(function (id) { return state.rows[id] }).filter(function (row) { return row.name === "todo_write" })
      const row = rows[rows.length - 1]
      if (row && Array.isArray(event.todos)) {
        const old = row.body.querySelector(".todos")
        const list = todoList(event.todos)
        if (old) old.replaceWith(list)
        else row.body.insertBefore(list, row.body.firstChild)
        refreshChevron(row)
      }
      return
    }
    if (type === "preview") {
      const state = ensureLive()
      const url = event.url || ""
      if (url) {
        state.flow.appendChild(h("div", { class: "turn-system enter" }, [
          h("span", { html: icon("globe", 13) }),
          h("span", { text: "Preview is running" }),
          h("button", { class: "link-btn", type: "button", text: "Open", onclick: function () { window.fw.openExternal(url) } })
        ]))
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
    if (type === "stopping") {
      note("Stopping…")
      return
    }
    if (type === "checkpoint") {
      return
    }
    if (type === "compacting" || type === "compacted") {
      const state = ensureLive()
      if (type === "compacting" || !state.compact) {
        closeText(state)
        state.compact = addActivity(state.flow, { name: "compact", args: {}, finished: false, enter: true })
        state.compact.label = "Compacted the context"
        state.compact.text.textContent = "Compacting the context"
        state.compact.row.classList.add("running")
      }
      if (type === "compacted") {
        finishRow(state.compact, true)
        state.compact = null
      }
      return
    }
    if (type === "done") {
      finishLive(event.status)
      return
    }
    if (type === "error") {
      const state = ensureLive()
      closeText(state)
      state.flow.appendChild(h("div", { class: "turn-error enter" }, [h("span", { html: icon("alert", 13) }), h("span", { dir: "auto", text: event.text || "Something went wrong." })]))
      setRunning(false)
      return
    }
  }

  // Helper agents report into the line of the task that started them.
  function subEvent(event) {
    const state = ensureLive()
    const row = state.rows[event.parent]
    if (!row || row.plan) {
      return
    }
    if (!row.subs) {
      row.subs = h("div", { class: "subs" })
      row.body.insertBefore(row.subs, row.body.firstChild)
    }
    const kind = event.kind
    if (kind === "start") {
      if (event.text) row.text.textContent = L.running("Started a helper") + ": " + L.shorten(event.text, 60)
      row.label = "Helper: " + L.shorten(event.text || "task", 60)
    } else if (kind === "tool") {
      const label = L.label(event.name || "", event.args || {})
      row.subs.appendChild(h("div", { class: "sub-line" }, [h("span", { html: icon(L.icon(event.name || "", event.args || {}), 11) }), h("span", { text: label })]))
    } else if (kind === "text" && event.text) {
      row.subs.appendChild(h("div", { class: "sub-text", dir: "auto", text: L.shorten(event.text, 400) }))
    } else if (kind === "end" && event.text) {
      row.subs.appendChild(h("div", { class: "sub-end", text: event.text }))
    }
    while (row.subs.childNodes.length > 40) row.subs.removeChild(row.subs.firstChild)
    refreshChevron(row)
    if (!row.row.classList.contains("open")) row.row.classList.add("open", "auto")
  }

  /* --------------------------------------------------------- queued text */

  function showQueued(text) {
    if (!text.trim()) return
    let box = stage.querySelector(".queued")
    if (!box) {
      box = h("div", { class: "queued" })
      const dock = document.getElementById("composerDock")
      stage.insertBefore(box, dock)
    }
    box.appendChild(h("div", { class: "queued-item", dataset: { text: text } }, [h("span", { class: "queued-tag", text: "Queued" }), h("span", { class: "queued-text", dir: "auto", text: L.shorten(text, 140) })]))
  }

  function dropQueued(text) {
    const box = stage.querySelector(".queued")
    if (!box) return
    const items = box.querySelectorAll(".queued-item")
    for (let index = 0; index < items.length; index += 1) {
      if (items[index].dataset.text === text) {
        items[index].remove()
        break
      }
    }
    if (!box.querySelector(".queued-item")) box.remove()
  }

  function clearQueued() {
    const box = stage.querySelector(".queued")
    if (box) box.remove()
  }

  function finishThinking(state) {
    if (!state.think) return
    const seconds = Math.max(1, Math.round((Date.now() - state.think.started) / 1000))
    state.think.head.classList.remove("live")
    state.think.word.textContent = "Thought for " + (seconds >= 60 ? Math.round(seconds / 60) + "m" : seconds + "s")
    state.think = null
  }

  /* ------------------------------------------------------------ approvals */

  function showWaiting(event) {
    const state = ensureLive()
    closeText(state)
    if (state.think) finishThinking(state)
    const isApproval = event.kind === "approval"
    const name = event.name || ""
    const args = event.args || {}
    const card = h("div", { class: "approve enter", dataset: { call: event.id } })
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
      card.appendChild(h("div", { class: "question-text", dir: "auto", text: question }))
      const options = event.options || []
      if (options.length) {
        const list = h("div", { class: "question-options" })
        options.forEach(function (option) {
          const label = typeof option === "string" ? option : option.label || option.text || JSON.stringify(option)
          list.appendChild(h("button", { class: "question-option", dataset: { answer: label } }, [h("span", { html: icon("chevron", 11) }), h("span", { dir: "auto", text: label })]))
        })
        card.appendChild(list)
      }
      const input = h("input", { placeholder: "Type an answer", type: "text", dir: "auto" })
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
    follow(true)
    FW.store.emit("waiting", event)
  }

  async function answer(card, id, value) {
    if (card.classList.contains("done")) return
    const runId = (live && live.runId) || S.runId
    card.classList.add("done")
    Array.prototype.forEach.call(card.querySelectorAll("button, input"), function (button) {
      button.disabled = true
    })
    try {
      await window.fw.respond(runId, id, value)
      const done = h("div", { class: "answer", dir: "auto", text: value === "deny" ? "Denied" : value === "always" ? "Allowed, and remembered" : value === "allow" ? "Allowed" : value })
      card.appendChild(done)
    } catch (problem) {
      U.toast(problem.message || "Could not send the answer", "bad")
      card.classList.remove("done")
      Array.prototype.forEach.call(card.querySelectorAll("button, input"), function (button) {
        button.disabled = false
      })
    }
  }

  function markAnswered(event) {
    const card = inner.querySelector('.approve[data-call="' + event.id + '"]')
    if (card) card.classList.add("done")
  }

  /* ---------------------------------------------------------------- done */

  function finishLive(status) {
    if (live && live.textEl) {
      flushText(live.textEl)
      live.textEl.classList.remove("streaming")
      live.textEl = null
    }
    if (live && live.think) finishThinking(live)
    setRunning(false)
    S.runId = ""
    clearQueued()
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
    live.flow.appendChild(h("div", { class: "turn-error enter" }, [h("span", { html: icon("alert", 13) }), h("span", { text: "Stopped everything on this computer." })]))
  }

  function note(text, kind) {
    const state = ensureLive()
    closeText(state)
    state.flow.appendChild(h("div", { class: (kind === "error" ? "turn-error" : "turn-system") + " enter" }, [h("span", { html: icon(kind === "error" ? "alert" : "dot", 13) }), h("span", { text: text })]))
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
      if (code) {
        U.copy(code.textContent)
        copy.textContent = "Copied"
        setTimeout(function () {
          copy.textContent = "Copy"
        }, 1200)
      }
      return
    }
    const action = event.target.closest("[data-act]")
    if (action) {
      const kind = action.dataset.act
      if (kind === "copy-user") {
        const turn = action.closest(".turn-user")
        if (turn) U.copy(turn.dataset.raw || "")
      } else if (kind === "copy-turn") {
        const turn = action.closest(".turn-agent")
        const text = turn ? turnText(turn) : ""
        if (text) U.copy(text)
        else U.toast("There is no text to copy in this answer")
      } else if (kind === "retry") {
        retry()
      } else if (kind === "edit") {
        const turn = action.closest(".turn-user")
        if (turn) editFrom(turn)
      } else if (kind === "plan-ok") {
        FW.composer.approvePlan()
      } else if (kind === "plan-more") {
        FW.composer.fill("Change the plan: ")
      }
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
    note: note,
    dropLastUser: function () {
      const turns = inner.querySelectorAll(".turn-user")
      const last = turns[turns.length - 1]
      if (last && !last.dataset.id && !last.nextElementSibling) last.remove()
      if (!inner.childNodes.length && !S.chat) showEmpty()
      addTurnActions()
    }
  }
})()
