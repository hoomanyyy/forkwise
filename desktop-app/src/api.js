/* Talks to the Forkwise API with the cookies of the app's own browser session,
   so the desktop app is signed in exactly like the website is. */

function create(options) {
  const session = options.session
  const base = String(options.base || "").replace(/\/+$/, "")
  let unauthorized = options.onUnauthorized || function () {}

  function url(path) {
    if (/^https?:/i.test(path)) return path
    return base + path
  }

  async function call(path, opts) {
    const settings = opts || {}
    const headers = Object.assign({ "x-forkwise": "1", accept: "application/json" }, settings.headers || {})
    let body
    if (settings.body !== undefined && !(settings.body instanceof FormData)) {
      headers["content-type"] = "application/json"
      body = JSON.stringify(settings.body)
    } else if (settings.body instanceof FormData) {
      body = settings.body
    }
    let response
    try {
      response = await session.fetch(url(path), {
        method: settings.method || "GET",
        headers: headers,
        body: body,
        credentials: "include",
        cache: "no-store",
        signal: settings.signal
      })
    } catch (problem) {
      const error = new Error("Cannot reach Forkwise. Check your internet connection.")
      error.offline = true
      throw error
    }
    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (problem) {
        data = { raw: text.slice(0, 800) }
      }
    }
    if (!response.ok) {
      const error = new Error((data && data.detail) || "Request failed (" + response.status + ")")
      error.status = response.status
      if (response.status === 401) unauthorized(error)
      throw error
    }
    return data
  }

  async function stream(path, onEvent, opts) {
    const settings = opts || {}
    const controller = new AbortController()
    const response = await session.fetch(url(path), {
      headers: { "x-forkwise": "1", accept: "text/event-stream", "cache-control": "no-cache" },
      credentials: "include",
      cache: "no-store",
      signal: controller.signal
    })
    if (!response.ok) {
      const text = await response.text().catch(function () {
        return ""
      })
      const error = new Error("The live stream failed (" + response.status + ") " + text.slice(0, 200))
      error.status = response.status
      if (response.status === 401) unauthorized(error)
      throw error
    }
    if (!response.body || typeof response.body.getReader !== "function") {
      throw new Error("This Electron build cannot stream events.")
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let closed = false
    ;(async function pump() {
      try {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          buffer += decoder.decode(chunk.value, { stream: true })
          let split = buffer.indexOf("\n\n")
          while (split >= 0) {
            const block = buffer.slice(0, split)
            buffer = buffer.slice(split + 2)
            const lines = block.split("\n")
            for (let index = 0; index < lines.length; index++) {
              const line = lines[index]
              if (line.indexOf("data:") !== 0) continue
              try {
                onEvent(JSON.parse(line.slice(5).trim()))
              } catch (problem) {}
            }
            split = buffer.indexOf("\n\n")
          }
        }
      } catch (problem) {
        if (!controller.signal.aborted && settings.onError) settings.onError(problem)
      } finally {
        closed = true
        if (settings.onClose) settings.onClose()
      }
    })()
    return {
      close: function () {
        if (closed) return
        try {
          controller.abort()
        } catch (problem) {}
        try {
          reader.cancel()
        } catch (problem) {}
      }
    }
  }

  return { call: call, stream: stream, url: url, base: base }
}

module.exports = { create: create }
