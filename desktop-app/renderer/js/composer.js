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
  let modelWrap = null
  let modelSel = null
  let modeWrap = null
  let modeSel = null
  let sendBtn = null
  let hint = null

  const MODES = [
    { value: "auto", label: "Agent" },
    { value: "ask", label: "Ask first" },
    { value: "plan", label: "Plan" }
  ]

  function init() {
    dock = document.getElementById("composerDock")
    textarea = h("textarea", { id: "prompt", rows: "1", placeholder: "Ask, build, or run something on this computer\u2026", spellcheck: "true" })
    chips = h("div", { class: "chips", id: "chips" })
    modelSel = h("select", { id: "modelPick", title: "Model" })
    modelWrap = h("span", { class: "select-wrap" }, [modelSel])
    modeSel = h("select", { id: "modePick", title: "How the agent should act" })
    MODES.forEach(function (item) {
      modeSel.appendChild(h("option", { value: item.value, text: item.label }))
    })
    modeWrap = h("span", { class: "select-wrap" }, [modeSel])
    const folderBtn = h("button", { class: "icon-btn", id: "btnFolder", title: "Work in a folder", html: icon("folderPlus", 15) })
    const attachBtn = h("button", { class: "icon-btn", id: "btnAttach", title: "Attach files", html: icon("clip", 15) })
    hint = h("span", { class: "hint", id: "composerHint" })
    sendBtn = h("button", { class: "send", id: "btnSend", title: "Send", html: icon("arrowUp", 15) })

    const bar = h("div", { class: "composer-bar" }, [
      h("div", { class: "composer-left" }, [modeWrap, modelWrap, folderBtn, attachBtn]),
      h("div", { class: "composer-right" }, [hint, sendBtn])
    ])
    box = h("div", { class: "composer", id: "composer" }, [chips, textarea, bar])
    dock.appendChild(box)

    textarea.addEventListener("input", function () {
      autoGrow()
      updateSend()
      FW.store.setDraft(S.chat ? S.chat.id : "new", textarea.value)
    })
    textarea.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        if (event.metaKey || event.ctrlKey || !event.isComposing) {
          event.preventDefault()
          send()
        }
      }
    })
    textarea.addEventListener("paste", function (event) {
      const text = event.clipboardData && event.clipboardData.getData("text")
      if (text && text.length > 4000) {
        event.preventDefault()
        textarea.value += text
        autoGrow()
      }
    })
    sendBtn.addEventListener("click", function () {
      if (S.running && sendBtn.classList.contains("stop")) stop()
      else send()
    })
    modelSel.addEventListener("change", function () {
      FW.store.savePrefs({ model: modelSel.value })
      updateSend()
    })
    modeSel.addEventListener("change", function () {
      FW.store.savePrefs({ mode: modeSel.value })
      if (S.chat) {
        window.fw.chats.patch(S.chat.id, { mode: modeSel.value }).catch(function () {})
      }
    })
    folderBtn.addEventListener("click", chooseFolder)
    attachBtn.addEventListener("click", pickAttachments)
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && S.running) stop()
    })

    refreshModels()
    syncMode()
    renderChips()
    updateSend()
  }

  function autoGrow() {
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
  }

  function updateSend() {
    const ready = textarea.value.trim().length > 0 || S.attachments.length > 0
    if (S.running) {
      sendBtn.classList.add("stop")
      sendBtn.innerHTML = icon("square", 13)
      sendBtn.title = "Stop (Esc)"
      sendBtn.disabled = false
      hint.textContent = "Esc to stop"
      return
    }
    sendBtn.classList.remove("stop")
    sendBtn.innerHTML = icon("arrowUp", 15)
    sendBtn.title = "Send"
    sendBtn.disabled = !ready
    const parts = []
    if (S.context && S.context.tokens) {
      parts.push(Math.round(S.context.tokens / 1000) + "k" + (S.context.limit ? "/" + Math.round(S.context.limit / 1000) + "k" : ""))
    }
    hint.textContent = parts.join("  \u00b7  ")
  }

  function refreshModels() {
    modelSel.innerHTML = ""
    const models = S.models || []
    if (!models.length) {
      modelSel.appendChild(h("option", { value: "", text: "Default model" }))
      return
    }
    models.forEach(function (model) {
      modelSel.appendChild(h("option", { value: model.key, text: model.label || model.key }))
    })
    const wanted = S.prefs.model && models.some(function (m) { return m.key === S.prefs.model }) ? S.prefs.model : models[0].key
    modelSel.value = wanted
    if (!S.prefs.model) S.prefs.model = wanted
  }

  function syncMode() {
    const value = (S.chat && S.chat.mode) || S.prefs.mode || "auto"
    modeSel.value = MODES.some(function (item) { return item.value === value }) ? value : "auto"
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
    S.attachments.forEach(function (file, index) {
      chips.appendChild(
        h("span", { class: "chip", title: file.name }, [
          h("b", { text: file.name }),
          h("button", { class: "x", html: icon("close", 10), onclick: function () { S.attachments.splice(index, 1); renderChips() } })
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
      const created = await window.fw.chats.create({ local_path: result.folder, model: modelSel.value || "", mode: modeSel.value || "auto" })
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
    const body = { local_path: S.folder || "", model: modelSel.value || "", mode: modeSel.value || "auto" }
    const created = await window.fw.chats.create(body)
    const chat = created.chat
    S.chat = chat
    await FW.app.refreshChats()
    await FW.app.openChat(chat.id)
    return chat.id
  }

  async function pickAttachments() {
    try {
      const chatId = await ensureChat()
      const result = await window.fw.attachFiles(chatId)
      ;(result.files || []).forEach(function (file) {
        S.attachments.push(file)
      })
      renderChips()
    } catch (problem) {
      U.toast(problem.message || "Could not attach that file", "bad")
    }
  }

  async function send() {
    const text = textarea.value.trim()
    if (S.running) {
      if (!text) return stop()
      // A new message while running is queued by the backend.
    }
    if (!text && S.attachments.length === 0) return
    const attachments = S.attachments.slice()
    const draftKey = S.chat ? S.chat.id : "new"
    textarea.value = ""
    autoGrow()
    FW.store.setDraft(draftKey, "")
    S.attachments = []
    renderChips()
    updateSend()

    try {
      const chatId = await ensureChat()
      FW.chat.appendUser(text, { attachments: attachments })
      U.el("#stage").classList.remove("is-empty")
      const data = await window.fw.send({
        chatId: chatId,
        content: text,
        model: modelSel.value || "",
        mode: modeSel.value || "",
        attachments: attachments,
        skills: []
      })
      if (data && data.queued) U.toast("Queued for when the agent is free")
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
      textarea.value = text
      autoGrow()
      S.attachments = attachments
      renderChips()
      U.toast(problem.message || "Could not send that message", "bad", 4200)
    }
  }

  async function stop() {
    try {
      await window.fw.stopRun(S.runId || "")
      FW.chat.note("Stopping\u2026")
    } catch (problem) {
      U.toast(problem.message || "Could not stop the run", "bad")
    }
  }

  function fill(text) {
    textarea.value = text
    autoGrow()
    updateSend()
    textarea.focus()
    textarea.setSelectionRange(text.length, text.length)
  }

  function focus() {
    textarea.focus()
  }

  function setChat(chat) {
    renderChips()
    syncMode()
    if (chat) {
      const draft = FW.store.draftFor(chat.id)
      if (draft && !textarea.value) {
        textarea.value = draft
        autoGrow()
      }
    }
    updateSend()
  }

  function refresh() {
    refreshModels()
    renderChips()
    updateSend()
  }

  window.FW = window.FW || {}
  window.FW.composer = { init: init, fill: fill, focus: focus, refresh: refresh, setChat: setChat, update: updateSend, renderChips: renderChips }
})()
