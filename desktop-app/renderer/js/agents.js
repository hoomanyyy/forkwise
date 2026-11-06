/* Agent Command Center: every agent on one board (working, needs you, ready
   for review, stopped, done), several running at once, each optionally in
   its own git worktree, with review, merge and discard. Also Spaces: groups
   of agents that share instructions (a Forkwise project). */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  let board = null
  let visible = false
  let pollTimer = null
  let lastSeen = {}
  let wtCache = {}
  let filterSpace = ""
  let query = ""

  /* ------------------------------------------------------------ helpers */

  function prefsMap(name) {
    return Object.assign({}, S.prefs[name] || {})
  }

  function savePrefsMap(name, value) {
    S.prefs[name] = value
    const patch = {}
    patch[name] = value
    FW.store.savePrefs(patch)
  }

  function worktreeOf(chatId) {
    return (S.prefs.worktrees || {})[chatId] || null
  }

  function archived(chatId) {
    return !!(S.prefs.doneAgents || {})[chatId]
  }

  function setArchived(chatId, value) {
    const map = prefsMap("doneAgents")
    if (value) map[chatId] = Date.now()
    else delete map[chatId]
    savePrefsMap("doneAgents", map)
  }

  function spaceName(id) {
    const found = (S.spaces || []).find(function (space) {
      return space.id === id
    })
    return found ? found.name : ""
  }

  function column(chat) {
    if (chat.running && chat.waiting) return "needs"
    if (chat.running) return "working"
    if (archived(chat.id)) return "done"
    if (chat.last_status === "done") return "review"
    if (chat.last_status === "error" || chat.last_status === "stopped") return "stopped"
    return ""
  }

  const COLUMNS = [
    { id: "working", label: "Working", hint: "Running right now" },
    { id: "needs", label: "Needs you", hint: "Waiting for your answer or approval" },
    { id: "review", label: "Ready for review", hint: "Finished; check the work" },
    { id: "stopped", label: "Stopped", hint: "Stopped or failed" },
    { id: "done", label: "Done", hint: "Reviewed and closed" }
  ]

  /* ----------------------------------------------------------- polling */

  // The board and the notifications for agents running in the background.
  async function poll() {
    try {
      const data = await window.fw.chats.list({})
      S.chats = data.chats || []
    } catch (problem) {
      return
    }
    S.chats.forEach(function (chat) {
      const before = lastSeen[chat.id]
      const state = column(chat)
      if (before && before !== state) {
        const open = S.chat && S.chat.id === chat.id
        if (state === "needs" && !open) {
          U.toast("“" + (chat.title || "An agent") + "” needs you", "warn", 5000)
          FW.app.notify("An agent needs you", chat.title || "Waiting for your answer", chat.id)
        }
        if (before === "working" && (state === "review" || state === "stopped") && !open) {
          U.toast("“" + (chat.title || "An agent") + "” " + (state === "review" ? "finished" : "stopped"), state === "review" ? "" : "bad", 4200)
          FW.app.notify(state === "review" ? "An agent finished" : "An agent stopped", chat.title || "", chat.id)
        }
      }
      lastSeen[chat.id] = state
    })
    if (FW.sidebar) FW.sidebar.render()
    if (visible) draw()
    const running = S.chats.some(function (chat) {
      return chat.running
    })
    schedule(running || visible ? 2500 : 15000)
  }

  function schedule(ms) {
    clearTimeout(pollTimer)
    pollTimer = setTimeout(poll, ms)
  }

  async function loadSpaces() {
    try {
      const data = await window.fw.api("/api/projects", "GET")
      S.spaces = data.projects || []
    } catch (problem) {
      S.spaces = S.spaces || []
    }
    if (FW.spaces) FW.spaces.render()
    if (visible) draw()
  }

  /* -------------------------------------------------------------- board */

  let panelBefore = null

  function show() {
    // the board gets the full width, like a command center
    if (!visible && S.panelOpen) {
      panelBefore = true
      S.panelOpen = false
      FW.app.applyLayout()
    }
    visible = true
    document.body.classList.add("board-open")
    board.hidden = false
    document.getElementById("work").hidden = true
    draw()
    poll()
    FW.wb.activity()
  }

  function hide() {
    if (visible && panelBefore) {
      panelBefore = null
      S.panelOpen = true
      FW.app.applyLayout()
      FW.panel.render()
    }
    visible = false
    document.body.classList.remove("board-open")
    board.hidden = true
    document.getElementById("work").hidden = false
    FW.wb.activity()
    if (FW.editor) FW.editor.layout()
  }

  function toggle() {
    if (visible) hide()
    else show()
  }

  function draw() {
    if (!board) return
    const scrollers = {}
    Array.prototype.forEach.call(board.querySelectorAll(".lane-body"), function (lane) {
      scrollers[lane.dataset.lane] = lane.scrollTop
    })
    board.innerHTML = ""
    const chats = (S.chats || []).filter(function (chat) {
      if (filterSpace && chat.project_id !== filterSpace) return false
      if (query && String(chat.title || "").toLowerCase().indexOf(query) < 0) return false
      return !!column(chat)
    })
    const counts = {}
    COLUMNS.forEach(function (item) {
      counts[item.id] = 0
    })
    chats.forEach(function (chat) {
      counts[column(chat)] += 1
    })
    const running = counts.working + counts.needs
    const head = h("div", { class: "board-head" }, [
      h("div", { class: "board-title" }, [h("span", { html: icon("app", 15) }), h("b", { text: "Agents" }), h("span", { class: "board-sub", text: running ? running + " running" : "Nothing running" })]),
      h("div", { class: "board-search" }, [h("span", { html: icon("search", 12) }), searchInput()]),
      spaceFilter(),
      h("button", { class: "btn sm", title: "Review the uncommitted changes in the open folder", html: icon("eye", 12) + "<span>Review changes</span>", onclick: function () { review(null) } }),
      h("button", { class: "btn primary sm", html: icon("plus", 12) + "<span>New agent</span>", onclick: function () { newAgent() } }),
      h("button", { class: "view-btn", title: "Back to the chat", html: icon("close", 14), onclick: hide })
    ])
    board.appendChild(head)
    const lanes = h("div", { class: "lanes" })
    COLUMNS.forEach(function (item) {
      const list = chats.filter(function (chat) {
        return column(chat) === item.id
      })
      if (item.id === "done") list.splice(30)
      const body = h("div", { class: "lane-body", dataset: { lane: item.id } })
      if (!list.length) body.appendChild(h("div", { class: "lane-empty", text: item.id === "working" ? "Start an agent with New agent. Several can run at once." : "Nothing here." }))
      list.forEach(function (chat) {
        body.appendChild(card(chat, item.id))
      })
      lanes.appendChild(h("section", { class: "lane lane-" + item.id }, [
        h("div", { class: "lane-head", title: item.hint }, [h("span", { class: "lane-dot" }), h("span", { text: item.label }), h("span", { class: "lane-count", text: String(counts[item.id]) })]),
        body
      ]))
    })
    board.appendChild(lanes)
    Array.prototype.forEach.call(board.querySelectorAll(".lane-body"), function (lane) {
      if (scrollers[lane.dataset.lane]) lane.scrollTop = scrollers[lane.dataset.lane]
    })
  }

  let searchNode = null
  function searchInput() {
    if (!searchNode) {
      searchNode = h("input", { type: "text", placeholder: "Filter agents", spellcheck: "false" })
      searchNode.addEventListener("input", function () {
        query = searchNode.value.trim().toLowerCase()
        draw()
        searchNode.focus()
      })
    }
    return searchNode
  }

  function spaceFilter() {
    const label = filterSpace ? spaceName(filterSpace) || "Space" : "All spaces"
    const button = h("button", { class: "pick", type: "button", title: "Show the agents of one space" }, [h("span", { class: "pick-icon", html: icon("layout", 12) }), h("span", { class: "pick-label", text: label }), h("span", { class: "pick-chev", html: icon("chevronDown", 11) })])
    button.addEventListener("click", function () {
      const items = [{ value: "", label: "All spaces", checked: !filterSpace }]
      ;(S.spaces || []).forEach(function (space) {
        items.push({ value: space.id, label: space.name, hint: (space.chats || 0) + " chats", checked: filterSpace === space.id })
      })
      U.menu(button, items, function (value) {
        filterSpace = value
        draw()
      })
    })
    return button
  }

  function card(chat, lane) {
    const tree = worktreeOf(chat.id)
    const folder = chat.local_path ? FW.wb.baseName(chat.local_path) : ""
    const badges = h("div", { class: "card-badges" })
    if (chat.project_id && spaceName(chat.project_id)) badges.appendChild(h("span", { class: "badge", html: icon("layout", 10) + "<span>" + U.escapeHtml(spaceName(chat.project_id)) + "</span>" }))
    if (tree) badges.appendChild(h("span", { class: "badge tree", title: tree.path, html: icon("branch", 10) + "<span>" + U.escapeHtml(tree.branch.replace(/^forkwise\//, "")) + "</span>" }))
    else if (folder) badges.appendChild(h("span", { class: "badge", title: chat.local_path, html: icon("folder", 10) + "<span>" + U.escapeHtml(folder) + "</span>" }))
    if (chat.mode && chat.mode !== "auto") badges.appendChild(h("span", { class: "badge", text: chat.mode === "plan" ? "Plan" : "Ask first" }))
    const node = h("div", { class: "agent-card lane-" + lane, tabindex: "0", dataset: { id: chat.id } }, [
      h("div", { class: "card-top" }, [
        h("span", { class: "card-state" }),
        h("span", { class: "card-title", dir: "auto", text: chat.title || "New agent" }),
        h("button", { class: "view-btn card-more", title: "More", html: icon("more", 12) })
      ]),
      badges
    ])
    if (lane === "working" || lane === "needs") {
      node.appendChild(h("div", { class: "card-activity" }, [h("span", { class: "spin-dot" }), h("span", { text: lane === "needs" ? "Waiting for you — open to answer" : activityText(chat.activity) })]))
      if (chat.todos_total) {
        node.appendChild(h("div", { class: "card-progress", title: chat.todos_done + " of " + chat.todos_total + " steps done" }, [h("span", { style: "width:" + Math.round((chat.todos_done / chat.todos_total) * 100) + "%" })]))
      }
    }
    const meta = h("div", { class: "card-meta" }, [h("span", { text: lane === "working" && chat.run_started ? "for " + since(chat.run_started) : U.timeAgo(chat.updated_at) })])
    if (tree) {
      const info = h("span", { class: "card-wt" })
      meta.appendChild(info)
      treeStatus(chat.id, tree, info)
    }
    node.appendChild(meta)
    const actions = h("div", { class: "card-actions" })
    if (lane === "working" || lane === "needs") actions.appendChild(cardButton("Stop", "square", function () { stop(chat) }))
    if (lane === "review" || lane === "stopped") {
      actions.appendChild(cardButton("Review", "eye", function () { review(chat) }))
      if (tree) actions.appendChild(cardButton("Merge", "check", function () { merge(chat, tree) }, "primary"))
      actions.appendChild(cardButton("Done", "check", function () { setArchived(chat.id, true); draw() }))
    }
    if (lane === "done") actions.appendChild(cardButton("Reopen", "refresh", function () { setArchived(chat.id, false); draw() }))
    actions.appendChild(cardButton("Open", "arrowRight", function () { openChat(chat) }))
    node.appendChild(actions)
    node.addEventListener("dblclick", function () {
      openChat(chat)
    })
    node.addEventListener("keydown", function (event) {
      if (event.key === "Enter") openChat(chat)
    })
    node.querySelector(".card-more").addEventListener("click", function (event) {
      event.stopPropagation()
      cardMenu(chat, tree, event.currentTarget)
    })
    return node
  }

  function cardButton(label, iconName, onclick, kind) {
    return h("button", { class: "card-btn" + (kind ? " " + kind : ""), type: "button", html: icon(iconName, 11) + "<span>" + label + "</span>", onclick: function (event) { event.stopPropagation(); onclick() } })
  }

  function activityText(text) {
    const clean = String(text || "").trim()
    if (!clean) return "Starting…"
    if (clean === "thinking") return "Thinking…"
    if (clean === "writing") return "Writing the answer…"
    const space = clean.indexOf(" ")
    const name = space > 0 ? clean.slice(0, space) : clean
    const rest = space > 0 ? clean.slice(space + 1) : ""
    const args = {}
    if (rest) {
      args.command = rest
      args.path = rest
      args.url = rest
      args.query = rest
      args.pattern = rest
    }
    return window.FWLabels.running(window.FWLabels.label(name, args))
  }

  function since(stamp) {
    const seconds = Math.max(0, Math.floor((Date.now() - U.stampMs(stamp)) / 1000))
    if (seconds < 60) return seconds + "s"
    if (seconds < 3600) return Math.floor(seconds / 60) + "m"
    return Math.floor(seconds / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m"
  }

  async function treeStatus(chatId, tree, node) {
    const cached = wtCache[chatId]
    if (cached && Date.now() - cached.at < 8000) {
      paintTree(node, cached.data)
      return
    }
    try {
      const data = await window.fw.wt.status(tree.path)
      wtCache[chatId] = { at: Date.now(), data: data }
      paintTree(node, data)
    } catch (problem) {}
  }

  function paintTree(node, data) {
    if (!data || !data.ok) {
      node.textContent = data && data.gone ? "worktree removed" : ""
      return
    }
    const parts = []
    if (data.changed) parts.push(data.changed + " changed")
    if (data.ahead) parts.push(data.ahead + (data.ahead === 1 ? " commit" : " commits"))
    node.textContent = parts.join(" · ") || "no changes yet"
  }

  function cardMenu(chat, tree, anchor) {
    const items = [
      { value: "open", label: "Open", icon: "arrowRight" },
      { value: "review", label: "Review the changes", icon: "eye" }
    ]
    if (tree) {
      items.push({ separator: true })
      items.push({ value: "folder", label: "Open the worktree folder", icon: "folder" })
      items.push({ value: "explore", label: "Browse it in the explorer", icon: "files" })
      items.push({ value: "terminal", label: "Terminal in the worktree", icon: "terminal" })
      items.push({ value: "merge", label: "Merge into " + FW.wb.baseName(tree.repo), icon: "check" })
      items.push({ value: "discard", label: "Discard the worktree", icon: "trash", danger: true })
    }
    items.push({ separator: true })
    items.push({ value: "space", label: "Move to a space", icon: "layout" })
    items.push({ value: archived(chat.id) ? "reopen" : "done", label: archived(chat.id) ? "Reopen" : "Mark as done", icon: "check" })
    items.push({ value: "delete", label: "Delete", icon: "trash", danger: true })
    U.menu(anchor, items, function (value) {
      if (value === "open") openChat(chat)
      if (value === "review") review(chat)
      if (value === "folder") window.fw.openPath(tree.path)
      if (value === "explore") {
        FW.wb.setRoot(tree.folder || tree.path, { force: true })
        hide()
        FW.wb.setView("explorer")
      }
      if (value === "terminal") FW.terminals.open({ cwd: tree.folder || tree.path, title: tree.branch.replace(/^forkwise\//, "") })
      if (value === "merge") merge(chat, tree)
      if (value === "discard") discard(chat, tree)
      if (value === "space") FW.spaces.moveChat(chat)
      if (value === "done") {
        setArchived(chat.id, true)
        draw()
      }
      if (value === "reopen") {
        setArchived(chat.id, false)
        draw()
      }
      if (value === "delete") removeChat(chat, tree)
    }, { alignRight: true })
  }

  function openChat(chat) {
    hide()
    FW.app.openChat(chat.id)
  }

  async function stop(chat) {
    if (!chat.run_id) return
    try {
      await window.fw.stopRun(chat.run_id)
      U.toast("Stopping “" + (chat.title || "agent") + "”")
      schedule(800)
    } catch (problem) {
      U.toast(problem.message || "Could not stop it", "bad")
    }
  }

  async function removeChat(chat, tree) {
    const sure = await U.dialog({ title: "Delete this agent?", text: "“" + (chat.title || "New agent") + "” and its messages are removed." + (tree ? " Its worktree is removed too." : ""), ok: "Delete", danger: true })
    if (!sure) return
    try {
      if (tree) await window.fw.wt.remove(tree.path, true).catch(function () {})
      await window.fw.chats.remove(chat.id)
      forgetTree(chat.id)
      if (S.chat && S.chat.id === chat.id) FW.app.newChat()
      poll()
    } catch (problem) {
      U.toast(problem.message || "Could not delete it", "bad")
    }
  }

  function forgetTree(chatId) {
    const map = prefsMap("worktrees")
    delete map[chatId]
    savePrefsMap("worktrees", map)
    delete wtCache[chatId]
  }

  /* ------------------------------------------------------ merge / discard */

  async function merge(chat, tree) {
    const sure = await U.dialog({ title: "Merge this agent's work?", text: "Its changes on " + tree.branch + " are committed and merged into " + FW.wb.baseName(tree.repo) + ". The main folder must have no uncommitted changes.", ok: "Merge" })
    if (!sure) return
    try {
      await window.fw.wt.merge(tree.path, chat.title || "Work from a Forkwise agent")
      const drop = await U.dialog({ title: "Merged", text: "Remove the worktree now? The branch is merged, so nothing is lost.", ok: "Remove it", cancel: "Keep it" })
      if (drop) {
        await window.fw.wt.remove(tree.path, true)
        forgetTree(chat.id)
      }
      setArchived(chat.id, true)
      U.toast("Merged into " + FW.wb.baseName(tree.repo))
      FW.wb.refreshBranch()
      poll()
    } catch (problem) {
      U.dialog({ title: "Could not merge", text: problem.message || "git refused the merge", ok: "OK" })
    }
  }

  async function discard(chat, tree) {
    const sure = await U.dialog({ title: "Discard this worktree?", text: "The folder and the branch " + tree.branch + " are deleted with everything the agent did there. This cannot be undone.", ok: "Discard", danger: true })
    if (!sure) return
    try {
      await window.fw.wt.remove(tree.path, true)
      forgetTree(chat.id)
      setArchived(chat.id, true)
      U.toast("Worktree discarded")
      draw()
    } catch (problem) {
      U.toast(problem.message || "Could not remove it", "bad")
    }
  }

  /* ------------------------------------------------------------- review */

  const REVIEW_PROMPT = [
    "Review the code change below like a senior engineer doing a careful pull request review.",
    "",
    "Report, most important first:",
    "1. Bugs and wrong behaviour (with the exact file and line from the diff).",
    "2. Security problems (injection, secrets, unsafe input, auth mistakes).",
    "3. Missing error handling, edge cases and race conditions.",
    "4. Missing or weak tests for what changed.",
    "5. Smaller things: naming, dead code, confusing parts.",
    "",
    "For each finding give: severity (high / medium / low), file:line, what is wrong, and a concrete fix.",
    "End with a one line verdict: ready to merge, or what must change first.",
    "Do not change any files; only review."
  ].join("\n")

  async function review(chat) {
    const tree = chat ? worktreeOf(chat.id) : null
    const folder = tree ? tree.path : (chat && chat.local_path) || FW.wb.root()
    if (!folder) {
      U.toast("Open a folder first, or start an agent in one")
      return
    }
    U.toast("Collecting the changes…")
    let diff = null
    try {
      diff = tree ? await window.fw.wt.diff(tree.path) : await window.fw.fullDiff(folder)
    } catch (problem) {
      U.toast(problem.message || "Could not read the changes", "bad")
      return
    }
    if (!diff || !diff.ok) {
      U.toast((diff && diff.reason) || "This folder is not a git repository", "bad")
      return
    }
    let text = diff.text || ""
    if (!text.trim()) {
      U.toast("There are no changes to review")
      return
    }
    const cut = text.length > 120000
    if (cut) text = text.slice(0, 120000)
    const title = "Review: " + (chat && chat.title ? chat.title : FW.wb.baseName(folder))
    try {
      const created = await window.fw.chats.create({ local_path: "", mode: "ask", model: FW.composer.model() || "", project_id: (chat && chat.project_id) || S.space || "" })
      await window.fw.chats.patch(created.chat.id, { title: title }).catch(function () {})
      const message = REVIEW_PROMPT + (cut ? "\n\nThe diff was cut at 120,000 characters; say which files you could not see." : "") + "\n\n```diff\n" + text + "\n```"
      const sent = await window.fw.send({ chatId: created.chat.id, content: message, model: FW.composer.model() || "", mode: "ask", attachments: [], skills: [], watch: false })
      if (chat) setArchived(chat.id, false)
      U.toast("A review agent is reading the changes")
      if (visible) poll()
      else FW.app.openChat(created.chat.id)
      return sent
    } catch (problem) {
      U.toast(problem.message || "Could not start the review", "bad")
    }
  }

  /* ---------------------------------------------------------- new agent */

  async function newAgent(start) {
    const settings = start || {}
    const root = settings.folder !== undefined ? settings.folder : FW.wb.root() || S.folder || ""
    let folder = root
    let isolate = !!root
    let mode = S.prefs.mode || "auto"
    let model = FW.composer.model() || ""
    let space = settings.space !== undefined ? settings.space : S.space || filterSpace || ""

    const back = h("div", { class: "modal-back fw-dialog" })
    const box = h("div", { class: "dialog agent-dialog" })
    const task = h("textarea", { class: "agent-task", placeholder: "What should this agent do? Be specific: the goal, where to look, how to check it works.", spellcheck: "false", dir: "auto" })
    if (settings.text) task.value = settings.text
    const folderLabel = h("span", { class: "mono grow" })
    const folderRow = h("div", { class: "agent-row" }, [h("span", { class: "agent-key", text: "Folder" }), folderLabel, h("button", { class: "btn ghost sm", text: "Change", onclick: async function () { const picked = await window.fw.pickFolder(); if (picked.folder) { folder = picked.folder; paint() } } }), h("button", { class: "btn ghost sm", text: "None", onclick: function () { folder = ""; isolate = false; paint() } })])
    const isolateSwitch = h("button", { class: "switch", role: "switch" })
    isolateSwitch.addEventListener("click", function () {
      if (!folder) return
      isolate = !isolate
      paint()
    })
    const isolateRow = h("div", { class: "agent-row" }, [h("span", { class: "agent-key", text: "Worktree" }), h("span", { class: "grow dim", text: "Work on a separate branch and folder, so agents never collide. Merge when it is good." }), isolateSwitch])
    const modeBtn = h("button", { class: "pick", type: "button" })
    const modelBtn = h("button", { class: "pick", type: "button" })
    const spaceBtn = h("button", { class: "pick", type: "button" })
    const optionsRow = h("div", { class: "agent-row" }, [h("span", { class: "agent-key", text: "How" }), modeBtn, modelBtn, spaceBtn])

    function paint() {
      folderLabel.textContent = folder || "No folder: the agent works on its own cloud computer"
      isolateSwitch.classList.toggle("on", isolate && !!folder)
      isolateSwitch.disabled = !folder
      isolateRow.style.opacity = folder ? "1" : "0.5"
      const modes = { auto: "Agent", ask: "Ask first", plan: "Plan" }
      modeBtn.innerHTML = icon("zap", 12) + "<span class='pick-label'>" + modes[mode] + "</span>" + icon("chevronDown", 11)
      const found = (S.models || []).find(function (item) { return item.key === model })
      modelBtn.innerHTML = icon("cpu", 12) + "<span class='pick-label'>" + U.escapeHtml(found ? found.label || found.key : "Default model") + "</span>" + icon("chevronDown", 11)
      spaceBtn.innerHTML = icon("layout", 12) + "<span class='pick-label'>" + U.escapeHtml(space ? spaceName(space) || "Space" : "No space") + "</span>" + icon("chevronDown", 11)
    }
    modeBtn.addEventListener("click", function () {
      U.menu(modeBtn, [{ value: "auto", label: "Agent", hint: "Works on its own", checked: mode === "auto" }, { value: "ask", label: "Ask first", hint: "Asks before changes", checked: mode === "ask" }, { value: "plan", label: "Plan", hint: "Plans, then waits", checked: mode === "plan" }], function (value) { mode = value; paint() })
    })
    modelBtn.addEventListener("click", function () {
      U.menu(modelBtn, (S.models || []).map(function (item) { return { value: item.key, label: item.label || item.key, checked: item.key === model } }), function (value) { model = value; paint() }, { search: (S.models || []).length > 7 ? "Search models" : "" })
    })
    spaceBtn.addEventListener("click", function () {
      const items = [{ value: "", label: "No space", checked: !space }]
      ;(S.spaces || []).forEach(function (item) { items.push({ value: item.id, label: item.name, checked: item.id === space }) })
      items.push({ separator: true })
      items.push({ value: "__new", label: "New space…", icon: "plus" })
      U.menu(spaceBtn, items, async function (value) {
        if (value === "__new") {
          const made = await FW.spaces.create()
          if (made) space = made.id
        } else space = value
        paint()
      })
    })

    const cancel = h("button", { class: "btn ghost sm", text: "Cancel" })
    const startOpen = h("button", { class: "btn sm", text: "Start and open" })
    const startBtn = h("button", { class: "btn primary sm", text: "Start agent" })
    box.appendChild(h("div", { class: "dialog-title", text: "New agent" }))
    box.appendChild(h("div", { class: "dialog-text", text: "It runs in the background; you can start several and watch them on the board." }))
    box.appendChild(task)
    box.appendChild(folderRow)
    box.appendChild(isolateRow)
    box.appendChild(optionsRow)
    box.appendChild(h("div", { class: "dialog-actions" }, [cancel, startOpen, startBtn]))
    back.appendChild(box)
    document.body.appendChild(back)
    paint()
    setTimeout(function () {
      task.focus()
    }, 30)

    function close() {
      document.removeEventListener("keydown", onKey, true)
      back.remove()
    }
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopImmediatePropagation()
        close()
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        go(false)
      }
    }
    document.addEventListener("keydown", onKey, true)
    cancel.addEventListener("click", close)
    back.addEventListener("mousedown", function (event) {
      if (event.target === back) close()
    })
    startBtn.addEventListener("click", function () {
      go(false)
    })
    startOpen.addEventListener("click", function () {
      go(true)
    })

    async function go(openAfter) {
      const text = task.value.trim()
      if (!text) {
        task.focus()
        return
      }
      startBtn.disabled = true
      startOpen.disabled = true
      try {
        const chatId = await launch({ text: text, folder: folder, isolate: isolate && !!folder, mode: mode, model: model, space: space, watch: openAfter })
        close()
        if (openAfter) {
          hide()
          FW.app.openChat(chatId)
        } else {
          U.toast("Agent started")
          if (!visible) show()
          else poll()
        }
      } catch (problem) {
        startBtn.disabled = false
        startOpen.disabled = false
        U.toast(problem.message || "Could not start the agent", "bad", 5000)
      }
    }
  }

  // Creates the chat (in a worktree when asked), sends the task, returns its id.
  async function launch(options) {
    let folder = options.folder || ""
    let tree = null
    if (options.isolate && folder) {
      tree = await window.fw.wt.create(folder, options.text.split("\n")[0].slice(0, 40))
      folder = tree.folder || tree.path
    }
    let created = null
    try {
      created = await window.fw.chats.create({ local_path: folder, model: options.model || "", mode: options.mode || "auto", project_id: options.space || "" })
    } catch (problem) {
      // no chat, so the fresh worktree would be left behind
      if (tree) await window.fw.wt.remove(tree.path, true).catch(function () {})
      throw problem
    }
    const chatId = created.chat.id
    const title = options.text.split("\n")[0].slice(0, 70)
    await window.fw.chats.patch(chatId, { title: title }).catch(function () {})
    if (tree) {
      const map = prefsMap("worktrees")
      map[chatId] = { path: tree.path, folder: tree.folder, branch: tree.branch, repo: tree.repo, base: tree.base }
      savePrefsMap("worktrees", map)
    }
    await window.fw.send({ chatId: chatId, content: options.text, model: options.model || "", mode: options.mode || "auto", attachments: [], skills: [], watch: !!options.watch })
    lastSeen[chatId] = "working"
    return chatId
  }

  /* --------------------------------------------------------------- init */

  function init() {
    board = h("section", { id: "board", class: "board", hidden: true })
    document.getElementById("main").appendChild(board)
    loadSpaces()
    poll()
    FW.store.on("running", function () {
      schedule(1200)
    })
  }

  window.FW = window.FW || {}
  window.FW.agents = {
    init: init,
    show: show,
    hide: hide,
    toggle: toggle,
    visible: function () {
      return visible
    },
    newAgent: newAgent,
    launch: launch,
    review: review,
    poll: poll,
    loadSpaces: loadSpaces,
    worktreeOf: worktreeOf,
    merge: merge,
    discard: discard
  }
})()
