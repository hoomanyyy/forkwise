/* Small state container. Everything the UI needs lives here. */
(function () {
  const state = {
    ready: false,
    user: null,
    models: [],
    plan: null,
    usage: null,
    chats: [],
    projects: [],
    chat: null,
    messages: [],
    running: false,
    runId: "",
    panel: "changes",
    panelOpen: false,
    sidebarOpen: true,
    prefs: {},
    device: { state: "off", name: "", note: "" },
    feed: [],
    folder: "",
    draft: {},
    attachments: [],
    skillNames: [],
    search: "",
    context: { tokens: 0, limit: 0 },
    offline: false,
    version: "",
    bootedAt: Date.now()
  }

  const listeners = {}
  function on(name, fn) {
    listeners[name] = listeners[name] || []
    listeners[name].push(fn)
  }
  function emit(name, payload) {
    ;(listeners[name] || []).forEach(function (fn) {
      try {
        fn(payload)
      } catch (problem) {
        console.error(problem)
      }
    })
  }

  let saveTimer = null
  function savePrefs(patch) {
    Object.assign(state.prefs, patch || {})
    clearTimeout(saveTimer)
    saveTimer = setTimeout(function () {
      const pick = {}
      ;["theme", "panel", "panelOpen", "sidebarOpen", "lastChat", "model", "mode", "folder", "background", "autoApprove", "showThinking", "panelWidth", "termHistory"].forEach(function (key) {
        if (key in state.prefs) pick[key] = state.prefs[key]
      })
      window.fw.prefs.set(pick).catch(function () {})
    }, 250)
  }

  function defaultModel() {
    const wanted = state.prefs.model
    const found = state.models.find(function (item) {
      return (item.key || item.id) === wanted
    })
    return found || state.models[0] || null
  }

  function modelId() {
    const value = state.prefs.model || ""
    return value
  }

  function modelName(id) {
    const found = state.models.find(function (item) {
      return (item.key || item.id) === id
    })
    return found ? found.label || found.key : id || "Model"
  }

  function draftFor(chatId) {
    return state.draft[chatId || "new"] || ""
  }
  function setDraft(chatId, text) {
    state.draft[chatId || "new"] = text
  }

  window.FW = window.FW || {}
  window.FW.store = { state: state, on: on, emit: emit, savePrefs: savePrefs, defaultModel: defaultModel, modelId: modelId, modelName: modelName, draftFor: draftFor, setDraft: setDraft }
})()
