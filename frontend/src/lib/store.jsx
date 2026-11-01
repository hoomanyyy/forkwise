import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { api } from "./api"

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const [usage, setUsage] = useState(null)
  const [ready, setReady] = useState(false)
  const [chats, setChats] = useState([])
  const [projects, setProjects] = useState([])
  const [theme, setThemeState] = useState(() => readTheme())
  const [toasts, setToasts] = useState([])

  const loadMe = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/me")
      setUser(data.user)
      setModels(data.models)
      setUsage(data.usage)
    } catch (problem) {
      setUser(null)
    }
    setReady(true)
  }, [])

  const loadChats = useCallback(async () => {
    try {
      const data = await api.get("/api/chats")
      setChats(data.chats)
    } catch (problem) {
      setChats([])
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.get("/api/projects")
      setProjects(data.projects)
    } catch (problem) {
      setProjects([])
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  useEffect(() => {
    if (user) {
      loadChats()
      loadProjects()
    }
  }, [user, loadChats, loadProjects])

  useEffect(() => {
    try {
      localStorage.setItem("fw-theme", theme)
    } catch (problem) {
      return
    }
  }, [theme])

  function patchChat(id, values) {
    setChats((list) => list.map((chat) => (chat.id === id ? { ...chat, ...values } : chat)))
  }

  function addChat(chat) {
    setChats((list) => [chat, ...list.filter((item) => item.id !== chat.id)])
  }

  function removeChat(id) {
    setChats((list) => list.filter((chat) => chat.id !== id))
  }

  function toast(text, kind) {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, text, kind: kind || "info" }])
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 4200)
  }

  const value = {
    user, setUser, models, usage, ready, loadMe,
    chats, loadChats, patchChat, addChat, removeChat,
    projects, loadProjects, setProjects,
    theme, setTheme: setThemeState,
    toasts, toast,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function readTheme() {
  try {
    return localStorage.getItem("fw-theme") || "dark"
  } catch (problem) {
    return "dark"
  }
}

export function useStore() {
  return useContext(StoreContext)
}
