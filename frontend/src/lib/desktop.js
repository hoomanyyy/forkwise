import { api } from "./api"

export function desktopApp() {
  if (typeof window === "undefined") return null
  return window.forkwiseDesktop || null
}

let pending = null

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function link(app) {
  const status = await app.status()
  if (!status) throw new Error("The Forkwise app did not answer. Restart it and try again.")
  const list = await api.get("/api/desktop")
  let device = null
  for (const item of list.devices) {
    if (item.id === status.deviceId) device = item
  }
  if (!status.linked || !device) {
    const pair = await api.post("/api/desktop/pair", { name: status.hostname || "My computer" })
    await app.link({ token: pair.token, server: pair.server, id: pair.id })
    device = { id: pair.id, name: pair.name }
  }
  for (let i = 0; i < 40; i++) {
    const now = await app.status()
    if (now && now.online) return { id: device.id, name: device.name }
    await wait(250)
  }
  throw new Error("This computer could not connect to Forkwise. Check your internet connection.")
}

export function ensureLinked() {
  const app = desktopApp()
  if (!app) return Promise.resolve(null)
  if (!pending) {
    pending = link(app).finally(() => {
      pending = null
    })
  }
  return pending
}
