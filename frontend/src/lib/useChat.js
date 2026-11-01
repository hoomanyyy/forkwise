import { useCallback, useEffect, useReducer, useRef } from "react"
import { api, openEvents } from "./api"

const emptyLive = {
  running: false,
  runId: null,
  seq: 0,
  text: "",
  reasoning: "",
  drafts: {},
  tools: {},
  waiting: {},
  subs: {},
  context: null,
  notices: [],
  error: "",
  compacting: false,
  queued: [],
}

const start = { loading: true, notFound: false, chat: null, project: null, messages: [], preview: null, todos: [], live: emptyLive, checkpoint: "", changes: [] }

function hasMessage(messages, id) {
  for (const message of messages) if (message.id === id) return true
  return false
}

function hasToolResult(messages, callId) {
  for (const message of messages) if (message.role === "tool" && message.tool_call_id === callId) return true
  return false
}

function reducer(state, action) {
  if (action.type === "loaded") {
    const data = action.data
    return {
      ...state,
      loading: false,
      notFound: false,
      chat: data.chat,
      project: data.project,
      messages: data.messages,
      preview: data.preview,
      todos: data.chat.todos || [],
      checkpoint: (data.run && data.run.checkpoint_before) || state.checkpoint,
      live: action.keepLive ? state.live : { ...emptyLive, running: Boolean(data.run && data.run.active), runId: data.run && data.run.active ? data.run.id : null },
    }
  }
  if (action.type === "reset") return start
  if (action.type === "notFound") return { ...state, loading: false, notFound: true }
  if (action.type === "chat") return { ...state, chat: { ...state.chat, ...action.values } }
  if (action.type === "optimistic") {
    return { ...state, messages: [...state.messages, action.message], live: { ...emptyLive, running: true, context: state.live.context } }
  }
  if (action.type === "runStarted") return { ...state, live: { ...state.live, running: true, runId: action.runId } }
  if (action.type === "queued") return { ...state, live: { ...state.live, queued: [...state.live.queued, action.text] } }
  if (action.type === "failed") {
    return { ...state, messages: state.messages.filter((message) => message.id !== action.tempId), live: { ...state.live, running: false, error: action.error } }
  }
  if (action.type === "clearError") return { ...state, live: { ...state.live, error: "" } }
  if (action.type === "event") return applyEvent(state, action.event)
  return state
}

function applyEvent(state, event) {
  const live = { ...state.live, seq: Math.max(state.live.seq, event.seq + 1) }
  const kind = event.type
  if (kind === "start") {
    live.running = true
    live.runId = event.run_id
    const messages = state.messages.map((message) => (message.temp ? { ...message, id: event.message_id, temp: false } : message))
    return { ...state, messages, live }
  }
  if (kind === "checkpoint") return { ...state, checkpoint: event.commit, live }
  if (kind === "step") {
    live.text = ""
    live.reasoning = ""
    live.drafts = {}
    return { ...state, live }
  }
  if (kind === "text") return { ...state, live: { ...live, text: live.text + event.text } }
  if (kind === "reasoning") return { ...state, live: { ...live, reasoning: live.reasoning + event.text } }
  if (kind === "tool_draft") {
    const drafts = { ...live.drafts }
    drafts[event.index] = { ...(drafts[event.index] || { args: "" }), name: event.name }
    return { ...state, live: { ...live, drafts } }
  }
  if (kind === "tool_args") {
    const drafts = { ...live.drafts }
    const old = drafts[event.index] || { name: "", args: "" }
    drafts[event.index] = { ...old, args: old.args + event.delta }
    return { ...state, live: { ...live, drafts } }
  }
  if (kind === "assistant") {
    live.text = ""
    live.reasoning = ""
    live.drafts = {}
    if (hasMessage(state.messages, event.id)) return { ...state, live }
    const message = { id: event.id, role: "assistant", content: event.content, reasoning: event.reasoning, tool_calls: event.tool_calls || [], meta: {} }
    return { ...state, messages: [...state.messages, message], live }
  }
  if (kind === "tool_start") {
    const tools = { ...live.tools }
    tools[event.id] = { status: "running", name: event.name, args: event.args, output: "" }
    return { ...state, live: { ...live, tools } }
  }
  if (kind === "tool_output") {
    const tools = { ...live.tools }
    const old = tools[event.id] || { status: "running", output: "" }
    tools[event.id] = { ...old, output: (old.output + event.text).slice(-40000) }
    return { ...state, live: { ...live, tools } }
  }
  if (kind === "tool_end") {
    const tools = { ...live.tools }
    tools[event.id] = { ...(tools[event.id] || {}), status: "done" }
    if (hasToolResult(state.messages, event.id)) return { ...state, live: { ...live, tools } }
    const message = { id: "t" + event.id, role: "tool", tool_call_id: event.id, content: event.text, meta: event.meta || {} }
    return { ...state, messages: [...state.messages, message], live: { ...live, tools } }
  }
  if (kind === "sub") {
    const subs = { ...live.subs }
    subs[event.parent] = [...(subs[event.parent] || []), event]
    return { ...state, live: { ...live, subs } }
  }
  if (kind === "waiting") {
    const waiting = { ...live.waiting }
    waiting[event.id] = event
    return { ...state, live: { ...live, waiting } }
  }
  if (kind === "answered") {
    const waiting = { ...live.waiting }
    delete waiting[event.id]
    return { ...state, live: { ...live, waiting } }
  }
  if (kind === "user_message") {
    live.queued = live.queued.slice(1)
    if (hasMessage(state.messages, event.id)) return { ...state, live }
    return { ...state, messages: [...state.messages, { id: event.id, role: "user", content: event.content, meta: event.meta || {} }], live }
  }
  if (kind === "todos") return { ...state, todos: event.todos, live }
  if (kind === "preview") return { ...state, preview: { url: event.url, port: event.port }, live }
  if (kind === "title") return { ...state, chat: { ...state.chat, title: event.title }, live }
  if (kind === "context") return { ...state, live: { ...live, context: { tokens: event.tokens, limit: event.limit } } }
  if (kind === "compacting") return { ...state, live: { ...live, compacting: true } }
  if (kind === "compacted") return { ...state, live: { ...live, compacting: false, notices: [...live.notices, "Older messages were summarized to keep the context small."] } }
  if (kind === "changes") return { ...state, changes: event.files, live }
  if (kind === "notice") return { ...state, live: { ...live, notices: [...live.notices, event.text] } }
  if (kind === "error") return { ...state, live: { ...live, error: event.text } }
  if (kind === "done") return { ...state, live: { ...live, running: false, waiting: {}, drafts: {}, text: "", reasoning: "", status: event.status } }
  return { ...state, live }
}

export function useChat(chatId, handlers) {
  const [state, dispatch] = useReducer(reducer, start)
  const closeRef = useRef(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const seqRef = useRef(0)

  const load = useCallback(async (keepLive) => {
    try {
      const data = await api.get("/api/chats/" + chatId)
      dispatch({ type: "loaded", data, keepLive })
      return data
    } catch (problem) {
      dispatch({ type: "notFound" })
      return null
    }
  }, [chatId])

  const listen = useCallback((runId, after) => {
    if (closeRef.current) closeRef.current()
    seqRef.current = after
    closeRef.current = openEvents(runId, after, (event) => {
      seqRef.current = event.seq + 1
      dispatch({ type: "event", event })
      if (handlersRef.current && handlersRef.current.onEvent) handlersRef.current.onEvent(event)
      if (event.type === "done") load(true)
    }, (finished) => {
      if (!finished) {
        setTimeout(async () => {
          const data = await load(true)
          if (data && data.run && data.run.active) listen(runId, seqRef.current)
        }, 1500)
      }
    })
  }, [load])

  useEffect(() => {
    let alive = true
    dispatch({ type: "reset" })
    load(false).then((data) => {
      if (alive && data && data.run && data.run.active) listen(data.run.id, 0)
    })
    return () => {
      alive = false
      if (closeRef.current) closeRef.current()
    }
  }, [chatId, load, listen])

  async function send(content, extra) {
    const tempId = "temp" + Date.now()
    const options = extra || {}
    const running = state.live.running
    if (!running) {
      dispatch({ type: "optimistic", message: { id: tempId, temp: true, role: "user", content, meta: options.attachments && options.attachments.length ? { attachments: options.attachments } : {} } })
    }
    try {
      const data = await api.post("/api/chats/" + chatId + "/messages", { content, attachments: options.attachments || [], model: options.model || "", mode: options.mode || "" })
      if (data.queued) {
        dispatch({ type: "queued", text: content })
        return
      }
      dispatch({ type: "runStarted", runId: data.run_id })
      listen(data.run_id, 0)
    } catch (problem) {
      dispatch({ type: "failed", tempId, error: problem.message })
    }
  }

  async function stop() {
    if (!state.live.runId) return
    try {
      await api.post("/api/runs/" + state.live.runId + "/stop")
    } catch (problem) {
      return
    }
  }

  async function respond(id, value) {
    if (!state.live.runId) return
    await api.post("/api/runs/" + state.live.runId + "/respond", { id, value })
  }

  function setChat(values) {
    dispatch({ type: "chat", values })
  }

  function clearError() {
    dispatch({ type: "clearError" })
  }

  return { state, send, stop, respond, reload: load, setChat, clearError }
}
