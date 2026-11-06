/* The composer: model, mode, folder, attachments, send and stop. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  let dock = null
  let box = null
  let textarea = null
  let chips = null
  let modelBtn = null
  let modeBtn = null
  let sendBtn = null
  let hint = null
  let dropZone = null
  let currentModel = ""
  let currentMode = "auto"
  let lastSent = ""

  const MODES = [
    { value: "auto", label: "Agent", hint: "Works on its own until the task is done", icon: "zap" },
    { value: "ask", label: "Ask first", hint: "Asks before it changes anything", icon: "shield" },
    { value: "plan", label: "Plan", hint: "Writes a plan for you to approve first", icon: "list" }
  ]

  function init() {
    dock = document.getElementById("composerDock")
    textarea = h("textarea", { id: "prompt", rows: "1", placeholder: "Ask, build, or run something on this computer\u2026", spellcheck: "true" })
    chips = h("div", { class: "chips", id: "chips" })
    modeBtn = h("button", { class: "pick", id: "modePick", type: "button", title: "How the agent should act", "aria-haspopup": "menu", "aria-expanded": "false" })
    modelBtn = h("button", { class: "pick", id: "modelPick", type: "button", title: "Model", "aria-haspopup": "menu", "aria-expanded": "false" })
    const folderBtn = h("button", { class: "icon-btn", id: "btnFolder", title: "Work in a folder", html: icon("folderPlus", 15) })
    const attachBtn = h("button", { class: "icon-btn", id: "btnAttach", title: "Attach files", html: icon("clip", 15) })
    hint = h("span", { class: "hint", id: "composerHint" })
    sendBtn = h("button", { class: "send", id: "btnSend", title: "Send", html: icon("arrowUp", 15) })

    const bar = h("div", { class: "composer-bar" }, [
      h("div", { class: "composer-left" }, [modeBtn, modelBtn, folderBtn, attachBtn]),
      h("div", { class: "composer-right" }, [hint, sendBtn])
    ])
    box = h("div", { class: "composer", id: "composer" }, [chips, textarea, bar])
    dock.appendChild(box)

    textarea.addEventListener("input", function () {
      autoGrow()
      updateSend()
      FW.store.setDraft(draftOwner, textarea.value)
      updateMention()
    })
    textarea.addEventListener("blur", function () {
      setTimeout(closeMention, 150)
    })
    textarea.addEventListener("click", updateMention)
    window.addEventListener("resize", U.debounce(autoGrow, 120))
    textarea.addEventListener("keydown", function (event) {
      if (mentionKeys(event)) return
      const ctrlSend = S.prefs.sendKey === "mod-enter"
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing && (!ctrlSend || event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        send()
        return
      }
      if (event.key === "ArrowUp" && !textarea.value && lastSent) {
        // like a shell: the arrow brings back the last message
        event.preventDefault()
        fill(lastSent)
      }
    })
    textarea.addEventListener("paste", onPaste)
    sendBtn.addEventListener("click", function () {
      if (S.running && sendBtn.classList.contains("stop")) stop()
      else send()
    })
    modeBtn.addEventListener("click", function () {
      U.menu(modeBtn, MODES.map(function (item) {
        return { value: item.value, label: item.label, hint: item.hint, icon: item.icon, checked: item.value === currentMode }
      }), function (value) {
        setMode(value, true)
        focus()
      }, { up: true, className: "pick-menu", onClose: focus })
    })
    modelBtn.addEventListener("click", function () {
      const models = S.models || []
      if (!models.length) {
        U.toast("The server has no models set up yet")
        return
      }
      U.menu(modelBtn, models.map(function (model) {
        return { value: model.key, label: model.label || model.key, hint: modelHint(model), checked: model.key === currentModel }
      }), function (value) {
        setModel(value, true)
        focus()
      }, { up: true, search: models.length > 7 ? "Search models" : "", className: "pick-menu model-menu", onClose: focus })
    })
    folderBtn.addEventListener("click", chooseFolder)
    attachBtn.addEventListener("click", pickAttachments)
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return
      if (event.defaultPrevented || U.overlayOpen()) return
      if (event.target && event.target.id === "chatSearch") return
      if (event.target && event.target.closest && event.target.closest(".xterm, .monaco-editor")) return
      if (S.running) {
        event.preventDefault()
        stop()
      }
    })
    wireDrop()

    refreshModels()
    syncMode()
    renderChips()
    updateSend()
  }

  function autoGrow() {
    const most = Math.max(120, Math.min(320, Math.round(window.innerHeight * 0.35)))
    textarea.style.height = "auto"
    const height = Math.min(textarea.scrollHeight, most)
    textarea.style.height = height + "px"
    textarea.style.overflowY = textarea.scrollHeight > most ? "auto" : "hidden"
  }

  function modelHint(model) {
    const parts = []
    if (model.context) parts.push(model.context >= 1000000 ? Math.round(model.context / 100000) / 10 + "M context" : Math.round(model.context / 1000) + "k context")
    if (model.vision) parts.push("reads images")
    return parts.join(" \u00b7 ")
  }

  function setModel(value, save) {
    const models = S.models || []
    const found = models.find(function (model) {
      return model.key === value
    })
    currentModel = found ? found.key : models.length ? models[0].key : ""
    const label = found ? found.label || found.key : models.length ? models[0].label || models[0].key : "Default model"
    modelBtn.innerHTML = ""
    modelBtn.appendChild(h("span", { class: "pick-icon", html: icon("cpu", 12) }))
    modelBtn.appendChild(h("span", { class: "pick-label", text: label }))
    modelBtn.appendChild(h("span", { class: "pick-chev", html: icon("chevronDown", 11) }))
    modelBtn.title = "Model: " + label
    if (save) {
      FW.store.savePrefs({ model: currentModel })
      S.prefs.model = currentModel
    }
    updateSend()
  }

  function setMode(value, save) {
    const found = MODES.find(function (item) {
      return item.value === value
    }) || MODES[0]
    currentMode = found.value
    modeBtn.innerHTML = ""
    modeBtn.appendChild(h("span", { class: "pick-icon", html: icon(found.icon, 12) }))
    modeBtn.appendChild(h("span", { class: "pick-label", text: found.label }))
    modeBtn.appendChild(h("span", { class: "pick-chev", html: icon("chevronDown", 11) }))
    modeBtn.dataset.mode = found.value
    modeBtn.title = found.label + " \u2014 " + found.hint
    if (save) {
      FW.store.savePrefs({ mode: currentMode })
      S.prefs.mode = currentMode
      if (S.chat) {
        S.chat.mode = currentMode
        window.fw.chats.patch(S.chat.id, { mode: currentMode }).catch(function () {})
      }
    }
  }

  const PLACEHOLDER = "Ask, build, or run something on this computer\u2026"
  const PLACEHOLDER_BUSY = "Add a follow-up \u2014 it runs after the current step\u2026"

  function updateSend() {
    const ready = textarea.value.trim().length > 0 || S.attachments.length > 0
    textarea.placeholder = S.running ? PLACEHOLDER_BUSY : PLACEHOLDER
    hint.title = ""
    if (S.running && !ready) {
      sendBtn.classList.add("stop")
      sendBtn.innerHTML = icon("square", 11)
      sendBtn.title = "Stop (Esc)"
      sendBtn.setAttribute("aria-label", "Stop")
      sendBtn.disabled = false
      hint.textContent = "Esc to stop"
      return
    }
    sendBtn.classList.remove("stop")
    sendBtn.innerHTML = icon("arrowUp", 15)
    sendBtn.title = S.running ? "Send after this step (Enter)" : "Send (Enter)"
    sendBtn.setAttribute("aria-label", "Send")
    sendBtn.disabled = !ready
    if (S.running) {
      hint.textContent = "Queues after the current step"
      return
    }
    const parts = []
    if (S.context && S.context.tokens) {
      parts.push(Math.round(S.context.tokens / 1000) + "k" + (S.context.limit ? "/" + Math.round(S.context.limit / 1000) + "k" : ""))
      hint.title = "Context used: " + S.context.tokens.toLocaleString() + (S.context.limit ? " of " + S.context.limit.toLocaleString() : "") + " tokens"
    }
    hint.textContent = parts.join("  \u00b7  ")
  }

  function refreshModels() {
    const models = S.models || []
    const wanted = S.prefs.model && models.some(function (model) { return model.key === S.prefs.model }) ? S.prefs.model : models.length ? models[0].key : ""
    setModel(wanted, false)
    if (!S.prefs.model && wanted) S.prefs.model = wanted
  }

  function syncMode() {
    const value = (S.chat && S.chat.mode) || S.prefs.mode || "auto"
    setMode(value, false)
  }

  function renderChips() {
    chips.innerHTML = ""
    const folder = (S.chat && S.chat.local_path) || S.folder
    if (folder) {
      const name = folder.split(/[\\/]/).filter(Boolean).pop() || folder
      chips.appendChild(
        h("span", { class: "chip", title: folder }, [
          h("b", { text: name }),
          h("button", { class: "x", html: icon("close", 10), title: "Stop using this folder", onclick: clearFolder })
        ])
      )
    }
    const spaceId = (S.chat && S.chat.project_id) || (!S.chat ? S.space : "")
    const space = spaceId && (S.spaces || []).find(function (item) { return item.id === spaceId })
    if (space) {
      chips.appendChild(h("span", { class: "chip", title: "Space: everything here shares its instructions" }, [h("span", { html: icon("layout", 11) }), h("b", { text: space.name }), !S.chat ? h("button", { class: "x", html: icon("close", 10), title: "Leave the space for this chat", onclick: function () { FW.spaces.select("") } }) : null]))
    }
    S.attachments.forEach(function (file, index) {
      const kind = String(file.kind || "")
      chips.appendChild(
        h("span", { class: "chip file", title: file.path || file.name }, [
          h("span", { html: icon(kind === "image" ? "image" : "file", 11) }),
          h("b", { text: file.name }),
          file.size ? h("span", { class: "chip-size", text: window.FWLabels.bytes(file.size) }) : null,
          h("button", { class: "x", html: icon("close", 10), title: "Remove", onclick: function () { S.attachments.splice(index, 1); renderChips() } })
        ])
      )
    })
    if (!folder) {
      chips.appendChild(h("button", { class: "chip action", onclick: chooseFolder, title: "Let the agent work in a folder on this computer" }, [h("span", { html: icon("folderPlus", 12) }), h("span", { text: "Work in a folder" })]))
    }
    updateSend()
  }

  function clearFolder() {
    if (S.chat && S.chat.local_path) {
      U.toast("This chat is already attached to " + S.chat.local_path + ". Start a new chat to change it.")
      return
    }
    S.folder = ""
    FW.store.savePrefs({ folder: "" })
    renderChips()
  }

  async function chooseFolder() {
    const result = await window.fw.pickFolder()
    if (!result.folder) return
    const hasChat = S.chat && (S.messages.length > 0 || S.running)
    if (hasChat) {
      S.folder = result.folder
      FW.store.savePrefs({ folder: result.folder })
      const created = await window.fw.chats.create({ local_path: result.folder, model: currentModel || "", mode: currentMode || "auto" })
      await FW.app.refreshChats()
      await FW.app.openChat(created.chat.id)
      U.toast("Now working in " + result.folder)
      return
    }
    S.folder = result.folder
    if (S.chat) {
      try {
        await window.fw.chats.patch(S.chat.id, {})
      } catch (problem) {}
    }
    renderChips()
    focus()
  }

  async function ensureChat() {
    if (S.chat && S.chat.id) return S.chat.id
    const body = { local_path: S.folder || "", model: currentModel || "", mode: currentMode || "auto", project_id: S.space || "" }
    const created = await window.fw.chats.create(body)
    const chat = created.chat
    // what was typed into the new chat stays in the box
    FW.store.setDraft(chat.id, textarea.value)
    FW.store.setDraft("new", "")
    S.chat = chat
    await FW.app.refreshChats()
    await FW.app.openChat(chat.id)
    return chat.id
  }

  function addUploaded(result) {
    ;(result.files || []).forEach(function (file) {
      S.attachments.push(file)
    })
    if (result.skipped && result.skipped.length) U.toast("Skipped " + result.skipped.join(", ") + " (folders and files over 25 MB are left out)", "warn", 4200)
    renderChips()
  }

  async function pickAttachments() {
    try {
      const chatId = await ensureChat()
      const result = await window.fw.attachFiles(chatId)
      addUploaded(result)
    } catch (problem) {
      U.toast(problem.message || "Could not attach that file", "bad")
    }
  }

  async function attachPaths(paths) {
    if (!paths.length) return
    U.toast(paths.length === 1 ? "Attaching the file\u2026" : "Attaching " + paths.length + " files\u2026")
    try {
      const chatId = await ensureChat()
      addUploaded(await window.fw.attachPaths(chatId, paths))
    } catch (problem) {
      U.toast(problem.message || "Could not attach those files", "bad")
    }
  }

  async function attachImage(file) {
    try {
      const chatId = await ensureChat()
      const buffer = new Uint8Array(await file.arrayBuffer())
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
      const type = (file.type.split("/")[1] || "png").replace("jpeg", "jpg")
      addUploaded(await window.fw.attachData(chatId, "pasted-" + stamp + "." + type, buffer))
    } catch (problem) {
      U.toast(problem.message || "Could not attach the image", "bad")
    }
  }

  // Large pastes go in at the cursor (not at the end), pasted images become attachments.
  function onPaste(event) {
    const data = event.clipboardData
    if (!data) return
    const images = Array.prototype.filter.call(data.files || [], function (file) {
      return /^image\//.test(file.type)
    })
    const text = data.getData("text")
    if (images.length && !text) {
      event.preventDefault()
      images.slice(0, 4).forEach(attachImage)
      return
    }
    if (text && text.length > 4000) {
      event.preventDefault()
      textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, "end")
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    }
  }

  // Files dragged from the desktop onto the chat become attachments.
  function wireDrop() {
    const area = document.getElementById("main") || dock
    dropZone = h("div", { class: "drop-zone", hidden: true }, [h("div", { class: "drop-box" }, [h("span", { html: icon("clip", 18) }), h("b", { text: "Drop files to attach them" })])])
    area.appendChild(dropZone)
    let depth = 0
    function hasFiles(event) {
      const types = event.dataTransfer && event.dataTransfer.types
      return !!types && Array.prototype.indexOf.call(types, "Files") >= 0
    }
    area.addEventListener("dragenter", function (event) {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth += 1
      dropZone.hidden = false
    })
    area.addEventListener("dragover", function (event) {
      if (!hasFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    })
    area.addEventListener("dragleave", function (event) {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (!depth) dropZone.hidden = true
    })
    area.addEventListener("drop", function (event) {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth = 0
      dropZone.hidden = true
      const paths = []
      Array.prototype.forEach.call(event.dataTransfer.files || [], function (file) {
        const where = window.fw.pathFor ? window.fw.pathFor(file) : ""
        if (where) paths.push(where)
      })
      attachPaths(paths)
    })
    // a file dropped anywhere else must not replace the app with that file
    document.addEventListener("dragover", function (event) {
      event.preventDefault()
    })
    document.addEventListener("drop", function (event) {
      event.preventDefault()
    })
  }

  async function send() {
    const text = textarea.value.trim()
    if (S.running && !text && S.attachments.length === 0) return stop()
    // a new message while running is queued by the backend
    if (!text && S.attachments.length === 0) return
    if (text) lastSent = text
    const attachments = S.attachments.slice()
    const draftKey = draftOwner
    textarea.value = ""
    autoGrow()
    FW.store.setDraft(draftKey, "")
    S.attachments = []
    renderChips()
    updateSend()

    const queued = S.running
    try {
      const chatId = await ensureChat()
      // a message sent while the agent works is shown when the agent picks it up
      if (!queued) {
        FW.chat.appendUser(text, { attachments: attachments })
        U.el("#stage").classList.remove("is-empty")
      }
      const data = await window.fw.send({
        chatId: chatId,
        content: text,
        model: currentModel || "",
        mode: currentMode || "",
        attachments: attachments,
        skills: []
      })
      if (data && data.queued) {
        updateSend()
        return
      }
      if (data && data.run_id) {
        S.runId = data.run_id
        FW.chat.setRunning(true)
        FW.store.emit("run:start", { runId: data.run_id })
      }
      updateSend()
      setTimeout(function () {
        FW.app.refreshChats()
      }, 1200)
    } catch (problem) {
      // the message did not go out: take its bubble back and return the text
      if (!queued) FW.chat.dropLastUser()
      textarea.value = text
      autoGrow()
      S.attachments = attachments
      renderChips()
      U.toast(problem.message || "Could not send that message", "bad", 4200)
    }
  }

  async function stop() {
    try {
      sendBtn.disabled = true
      await window.fw.stopRun(S.runId || "")
    } catch (problem) {
      U.toast(problem.message || "Could not stop the run", "bad")
    } finally {
      sendBtn.disabled = false
    }
  }

  // Retry: the same words (and files) again, after the old answer was removed.
  function resend(text, attachments) {
    S.attachments = (attachments || []).slice()
    renderChips()
    textarea.value = text || ""
    autoGrow()
    send()
  }

  async function approvePlan() {
    setMode("auto", true)
    textarea.value = "The plan is approved. Build it now, following the plan, and verify the result."
    autoGrow()
    send()
  }

  /* ------------------------------------------------------- @ mentions */

  // Typing @ lists files of the open folder; picking one writes @path.
  let mention = null
  let mentionToken = 0

  function mentionQuery() {
    const at = textarea.selectionStart
    const before = textarea.value.slice(0, at)
    const found = before.match(/(^|\s)@([^\s@]{0,120})$/)
    if (!found) return null
    return { start: at - found[2].length - 1, end: at, query: found[2] }
  }

  async function updateMention() {
    const query = mentionQuery()
    if (!query || !FW.wb || !FW.wb.root()) {
      closeMention()
      return
    }
    const mine = ++mentionToken
    const files = await FW.wb.allFiles()
    if (mine !== mentionToken) return
    const scored = []
    files.forEach(function (file) {
      const match = FW.wb.fuzzy(file, query.query)
      if (match) scored.push({ file: file, score: match.score })
    })
    scored.sort(function (a, b) {
      return b.score - a.score
    })
    const items = scored.slice(0, 12).map(function (item) {
      return item.file
    })
    if (!items.length) {
      closeMention()
      return
    }
    if (!mention) {
      mention = { box: h("div", { class: "mention-box" }), items: [], active: 0, query: query }
      box.appendChild(mention.box)
    }
    mention.items = items
    mention.query = query
    mention.active = Math.min(mention.active, items.length - 1)
    drawMention()
  }

  function drawMention() {
    mention.box.innerHTML = ""
    mention.items.forEach(function (file, index) {
      const name = file.split("/").pop()
      const row = h("button", { class: "mention-item" + (index === mention.active ? " active" : ""), type: "button" }, [
        h("span", { class: "file-ico", html: FW.explorer.fileIcon(name) }),
        h("span", { text: name }),
        h("span", { class: "dim", text: file.slice(0, file.length - name.length).replace(/\/$/, "") })
      ])
      row.addEventListener("mousedown", function (event) {
        event.preventDefault()
        pickMention(file)
      })
      mention.box.appendChild(row)
    })
    const current = mention.box.children[mention.active]
    if (current) current.scrollIntoView({ block: "nearest" })
  }

  function closeMention() {
    if (!mention) return
    mention.box.remove()
    mention = null
  }

  function pickMention(file) {
    const query = mention ? mention.query : mentionQuery()
    if (!query) return
    const text = "@" + file + " "
    textarea.setRangeText(text, query.start, query.end, "end")
    closeMention()
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    textarea.focus()
  }

  function mentionKeys(event) {
    if (!mention) return false
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      mention.active = (mention.active + (event.key === "ArrowDown" ? 1 : -1) + mention.items.length) % mention.items.length
      drawMention()
      return true
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault()
      pickMention(mention.items[mention.active])
      return true
    }
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      closeMention()
      return true
    }
    return false
  }

  // Puts text where the cursor is (or at the end) and focuses the box.
  function insertText(text) {
    const at = document.activeElement === textarea ? textarea.selectionStart : textarea.value.length
    const end = document.activeElement === textarea ? textarea.selectionEnd : textarea.value.length
    const before = textarea.value.slice(0, at)
    const glue = before && !/\s$/.test(before) ? " " : ""
    textarea.setRangeText(glue + text, at, end, "end")
    textarea.dispatchEvent(new Event("input", { bubbles: true }))
    textarea.focus()
    if (document.body.classList.contains("chat-hidden")) FW.wb.toggleChat()
  }

  function insertMention(rel) {
    insertText("@" + rel + " ")
  }

  function sendText(text) {
    if (document.body.classList.contains("chat-hidden")) FW.wb.toggleChat()
    textarea.value = text
    autoGrow()
    send()
  }

  function fill(text) {
    if (document.body.classList.contains("chat-hidden")) FW.wb.toggleChat()
    textarea.value = text
    autoGrow()
    updateSend()
    textarea.focus()
    textarea.setSelectionRange(text.length, text.length)
  }

  function focus() {
    textarea.focus()
  }

  let draftOwner = "new"

  function setChat(chat) {
    renderChips()
    syncMode()
    const owner = chat ? chat.id : "new"
    if (owner !== draftOwner) {
      // each chat keeps its own unsent text
      draftOwner = owner
      textarea.value = FW.store.draftFor(owner) || ""
      autoGrow()
    }
    lastSent = lastUserText()
    updateSend()
  }

  function lastUserText() {
    const messages = S.messages || []
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "user" && typeof messages[index].content === "string") return messages[index].content
    }
    return ""
  }

  function refresh() {
    refreshModels()
    renderChips()
    updateSend()
  }

  window.FW = window.FW || {}
  window.FW.composer = { init: init, fill: fill, focus: focus, refresh: refresh, setChat: setChat, update: updateSend, renderChips: renderChips, attachPaths: attachPaths, resend: resend, approvePlan: approvePlan, sendText: sendText, insertText: insertText, insertMention: insertMention, stopNow: function () { if (S.running) stop() }, model: function () { return currentModel }, mode: function () { return currentMode } }
})()
