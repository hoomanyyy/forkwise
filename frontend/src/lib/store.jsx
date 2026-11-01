import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { api } from "./api"

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const [usage, setUsage] = useState(null)
  const [ready, setReady] = useState(false)
  const [chatsReady, setChatsReady] = useState(false)
  const [hint, setHintState] = useState(() => readHint())
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
      writeHint(true)
      setHintState(true)
    } catch (problem) {
      setUser(null)
      if (problem.status === 401) {
        writeHint(false)
        setHintState(false)
      }
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
    setChatsReady(true)
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

  function signIn(nextUser) {
    setUser(nextUser)
    writeHint(true)
    setHintState(true)
  }

  function signOut() {
    setUser(null)
    setChats([])
    setChatsReady(false)
    writeHint(false)
    setHintState(false)
  }

  const value = {
    user, setUser, signIn, signOut, hint, models, usage, ready, loadMe,
    chats, chatsReady, loadChats, patchChat, addChat, removeChat,
    projects, loadProjects, setProjects,
    theme, setTheme: setThemeState,
    toasts, toast,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function readHint() {
  try {
    return localStorage.getItem("fw-auth") === "1"
  } catch (problem) {
    return false
  }
}

function writeHint(value) {
  try {
    if (value) localStorage.setItem("fw-auth", "1")
    else localStorage.removeItem("fw-auth")
  } catch (problem) {
    return
  }
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
