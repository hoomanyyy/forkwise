export const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

export function apiUrl(path) {
  return API + path
}

async function request(method, url, body) {
  const options = { method, headers: { "x-forkwise": "1" }, credentials: "include" }
  if (body !== undefined && !(body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json"
    options.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    options.body = body
  }
  let response = null
  try {
    response = await fetch(API + url, options)
  } catch (problem) {
    const error = new Error("Cannot reach the Forkwise server. Check your connection and try again.")
    error.status = 0
    throw error
  }
  let data = null
  const text = await response.text()
  try {
    data = text ? JSON.parse(text) : {}
  } catch (problem) {
    data = { detail: text }
  }
  if (!response.ok) {
    const error = new Error(readable(data && data.detail) || "Something went wrong (" + response.status + ").")
    error.status = response.status
    throw error
  }
  return data
}

function readable(detail) {
  if (!detail) return ""
  if (typeof detail === "string") return detail
  if (Array.isArray(detail) && detail.length > 0) return detail[0].msg || "Check the form."
  return String(detail)
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body === undefined ? {} : body),
  put: (url, body) => request("PUT", url, body),
  patch: (url, body) => request("PATCH", url, body),
  del: (url) => request("DELETE", url),
}

export function openEvents(runId, after, onEvent, onClose) {
  const source = new EventSource(API + "/api/runs/" + runId + "/events?after=" + after, { withCredentials: true })
  let closed = false
  source.onmessage = (message) => {
    let event = null
    try {
      event = JSON.parse(message.data)
    } catch (problem) {
      return
    }
    onEvent(event)
    if (event.type === "done") {
      closed = true
      source.close()
      onClose && onClose(true)
    }
  }
  source.onerror = () => {
    if (closed) return
    source.close()
    onClose && onClose(false)
  }
  return () => {
    closed = true
    source.close()
  }
}

export function rawUrl(wid, path, download) {
  return API + "/api/ws/" + wid + "/raw?path=" + encodeURIComponent(path) + (download ? "&download=1" : "")
}

export async function upload(wid, files) {
  const form = new FormData()
  for (const file of files) form.append("files", file)
  return request("POST", "/api/ws/" + wid + "/upload", form)
}

export function socketUrl(path) {
  if (API) return API.replace(/^http/, "ws") + path
  const scheme = window.location.protocol === "https:" ? "wss://" : "ws://"
  return scheme + window.location.host + path
}
