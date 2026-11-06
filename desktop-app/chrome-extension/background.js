const PORTS = [47321, 47322, 47323, 47324]
const GROUP_TITLE = "Forkwise"
const ASK_SECONDS = 180

let socket = null
let connected = false
let portIndex = 0
let retryTimer = null
let pingTimer = null
let attached = {}
let asks = {}
let askCount = 0
let askingSite = {}

function siteOf(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.hostname.replace(/^www\./, "")
    if (parsed.protocol === "file:") return "files on this computer"
    return ""
  } catch (problem) {
    return ""
  }
}

async function readList(area, key) {
  const data = await chrome.storage[area].get(key)
  return data[key] || []
}

async function addToList(area, key, value) {
  const list = await readList(area, key)
  if (list.indexOf(value) === -1) list.push(value)
  const data = {}
  data[key] = list
  await chrome.storage[area].set(data)
}

async function removeFromList(area, key, value) {
  const list = await readList(area, key)
  const kept = []
  for (let i = 0; i < list.length; i++) {
    if (list[i] !== value) kept.push(list[i])
  }
  const data = {}
  data[key] = kept
  await chrome.storage[area].set(data)
}

async function isPaused() {
  const data = await chrome.storage.local.get("paused")
  return !!data.paused
}

async function isAllowed(site) {
  if (!site) return true
  const always = await readList("local", "always")
  if (always.indexOf(site) >= 0) return true
  const once = await readList("session", "once")
  return once.indexOf(site) >= 0
}

function finishAsk(id, choice) {
  const ask = asks[id]
  if (!ask) return
  delete asks[id]
  clearTimeout(ask.timer)
  if (ask.windowId !== null) chrome.windows.remove(ask.windowId).catch(function () {})
  ask.resolve(choice)
}

function askUser(site, what) {
  askCount = askCount + 1
  const id = "ask" + Date.now() + "_" + askCount
  return new Promise(function (resolve) {
    asks[id] = {
      resolve: resolve,
      windowId: null,
      timer: setTimeout(function () {
        finishAsk(id, "deny")
      }, ASK_SECONDS * 1000)
    }
    const page = "approve.html?id=" + id + "&site=" + encodeURIComponent(site) + "&what=" + encodeURIComponent(what)
    chrome.windows.create({ url: page, type: "popup", width: 460, height: 430, focused: true }, function (win) {
      if (asks[id] && win) asks[id].windowId = win.id
    })
  })
}

async function checkSite(url, what, requestId) {
  const site = siteOf(url)
  if (await isAllowed(site)) return
  if (requestId !== undefined) send({ id: requestId, asking: true, site: site })
  if (!askingSite[site]) {
    askingSite[site] = askUser(site, what).finally(function () {
      delete askingSite[site]
    })
  }
  const choice = await askingSite[site]
  if (choice === "once") {
    await addToList("session", "once", site)
    return
  }
  if (choice === "always") {
    await addToList("local", "always", site)
    return
  }
  throw new Error("The user did not allow Forkwise on " + site + ". Ask them, or work on another site.")
}

async function agentGroups() {
  return chrome.tabGroups.query({ title: GROUP_TITLE })
}

async function agentTabs() {
  const groups = await agentGroups()
  let result = []
  for (let i = 0; i < groups.length; i++) {
    const tabs = await chrome.tabs.query({ groupId: groups[i].id })
    result = result.concat(tabs)
  }
  return result
}

async function addToGroup(tab) {
  const groups = await chrome.tabGroups.query({ title: GROUP_TITLE, windowId: tab.windowId })
  if (groups.length > 0) {
    await chrome.tabs.group({ tabIds: [tab.id], groupId: groups[0].id })
    return
  }
  const groupId = await chrome.tabs.group({ tabIds: [tab.id], createProperties: { windowId: tab.windowId } })
  await chrome.tabGroups.update(groupId, { title: GROUP_TITLE, color: "purple" })
}

async function agentTab(id) {
  let tab = null
  try {
    tab = await chrome.tabs.get(parseInt(id, 10))
  } catch (problem) {
    throw new Error("No such tab. It was closed.")
  }
  const groups = await agentGroups()
  let shared = false
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].id === tab.groupId) shared = true
  }
  if (!shared) throw new Error("This tab is not shared with Forkwise. Only tabs in the Forkwise tab group can be used.")
  return tab
}

async function attach(tabId) {
  if (attached[tabId]) return
  const targets = await chrome.debugger.getTargets()
  for (let i = 0; i < targets.length; i++) {
    if (targets[i].tabId === tabId && targets[i].attached && targets[i].extensionId === chrome.runtime.id) {
      attached[tabId] = true
      return
    }
  }
  try {
    await chrome.debugger.attach({ tabId: tabId }, "1.3")
  } catch (problem) {
    const text = String((problem && problem.message) || problem)
    if (text.indexOf("chrome://") >= 0 || text.indexOf("Cannot access") >= 0) throw new Error("Forkwise cannot work on browser pages like chrome:// or the Web Store. Open a normal site.")
    if (text.indexOf("Another debugger") >= 0) throw new Error("DevTools is open on this tab. Close DevTools and try again.")
    throw new Error(text)
  }
  attached[tabId] = true
}

async function detachAll() {
  const ids = Object.keys(attached)
  for (let i = 0; i < ids.length; i++) {
    try {
      await chrome.debugger.detach({ tabId: parseInt(ids[i], 10) })
    } catch (problem) {}
  }
  attached = {}
}

function describeMethod(method, params) {
  if (method === "Page.navigate") return "open " + ((params && params.url) || "a page")
  if (method === "Input.dispatchMouseEvent") return "click on the page"
  if (method === "Input.insertText" || method === "Input.dispatchKeyEvent") return "type on the page"
  if (method === "Page.captureScreenshot") return "take a screenshot of the page"
  return "read the page"
}

async function lastWindow() {
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] })
    if (win && win.type === "normal") return win
  } catch (problem) {}
  const list = await chrome.windows.getAll({ windowTypes: ["normal"] })
  if (list.length > 0) return list[0]
  return null
}

async function run(message) {
  if (await isPaused()) throw new Error("The user paused Forkwise in Chrome. Ask them to resume it from the Forkwise button in the toolbar.")
  const cmd = message.cmd
  if (cmd === "tabs") {
    const tabs = await agentTabs()
    const list = []
    for (let i = 0; i < tabs.length; i++) {
      list.push({ id: String(tabs[i].id), title: tabs[i].title || "", url: tabs[i].url || tabs[i].pendingUrl || "" })
    }
    return list
  }
  if (cmd === "newTab") {
    const url = message.url || "about:blank"
    if (siteOf(url)) await checkSite(url, "open " + url, message.id)
    let win = await lastWindow()
    let tab = null
    if (!win) {
      win = await chrome.windows.create({ url: url, focused: true })
      tab = win.tabs[0]
    } else {
      tab = await chrome.tabs.create({ url: url, windowId: win.id, active: true })
    }
    await addToGroup(tab)
    return { id: String(tab.id) }
  }
  if (cmd === "activate") {
    const tab = await agentTab(message.tab)
    await chrome.tabs.update(tab.id, { active: true })
    await chrome.windows.update(tab.windowId, { focused: true })
    return { ok: true }
  }
  if (cmd === "close") {
    const tab = await agentTab(message.tab)
    if (attached[tab.id]) {
      try {
        await chrome.debugger.detach({ tabId: tab.id })
      } catch (problem) {}
      delete attached[tab.id]
    }
    await chrome.tabs.remove(tab.id)
    return { ok: true }
  }
  if (cmd === "cdp") {
    const tab = await agentTab(message.tab)
    const params = message.params || {}
    await checkSite(tab.url || tab.pendingUrl || "", describeMethod(message.method, params), message.id)
    if (message.method === "Page.navigate") await checkSite(params.url || "", "open " + params.url, message.id)
    if (message.method === "Page.captureScreenshot" && !tab.active) {
      await chrome.tabs.update(tab.id, { active: true })
    }
    await attach(tab.id)
    return await chrome.debugger.sendCommand({ tabId: tab.id }, message.method, params)
  }
  if (cmd === "release") {
    await detachAll()
    return { ok: true }
  }
  throw new Error("Unknown command " + cmd)
}

function send(data) {
  if (socket && socket.readyState === 1) socket.send(JSON.stringify(data))
}

function browserName() {
  const data = navigator.userAgentData
  if (data && data.brands) {
    for (let i = 0; i < data.brands.length; i++) {
      const brand = data.brands[i].brand
      if (brand !== "Chromium" && brand.indexOf("Not") === -1) return brand + " " + data.brands[i].version
    }
  }
  return "Chrome"
}

function handle(raw) {
  let message = null
  try {
    message = JSON.parse(raw)
  } catch (problem) {
    return
  }
  if (message.id === undefined || message.id === null) return
  run(message).then(function (result) {
    send({ id: message.id, ok: true, result: result })
  }).catch(function (problem) {
    send({ id: message.id, ok: false, error: String((problem && problem.message) || problem).slice(0, 600) })
  })
}

function setBadge() {
  chrome.action.setBadgeText({ text: connected ? "" : "off" })
  chrome.action.setBadgeBackgroundColor({ color: "#6b6b76" })
  chrome.action.setTitle({ title: connected ? "Forkwise: connected to the Forkwise app" : "Forkwise: open the Forkwise app on this computer" })
}

function scheduleRetry(seconds) {
  clearTimeout(retryTimer)
  retryTimer = setTimeout(connect, seconds * 1000)
}

function connect() {
  if (socket && (socket.readyState === 0 || socket.readyState === 1)) return
  const port = PORTS[portIndex % PORTS.length]
  let ws = null
  let opened = false
  try {
    ws = new WebSocket("ws://127.0.0.1:" + port + "/forkwise-chrome")
  } catch (problem) {
    portIndex = portIndex + 1
    scheduleRetry(3)
    return
  }
  socket = ws
  ws.onopen = function () {
    opened = true
    connected = true
    ws.send(JSON.stringify({ type: "hello", version: chrome.runtime.getManifest().version, browser: browserName() }))
    clearInterval(pingTimer)
    pingTimer = setInterval(function () {
      send({ type: "ping" })
    }, 20000)
    setBadge()
  }
  ws.onmessage = function (event) {
    handle(event.data)
  }
  ws.onclose = function () {
    if (socket !== ws) return
    socket = null
    connected = false
    clearInterval(pingTimer)
    setBadge()
    if (!opened) portIndex = portIndex + 1
    scheduleRetry(opened ? 2 : 3)
  }
  ws.onerror = function () {}
}

chrome.debugger.onDetach.addListener(function (source) {
  if (source.tabId) delete attached[source.tabId]
})

chrome.windows.onRemoved.addListener(function (windowId) {
  const ids = Object.keys(asks)
  for (let i = 0; i < ids.length; i++) {
    if (asks[ids[i]].windowId === windowId) finishAsk(ids[i], "deny")
  }
})

chrome.runtime.onMessage.addListener(function (message, sender, reply) {
  if (message.type === "answer") {
    finishAsk(message.id, message.choice)
    reply({ ok: true })
    return false
  }
  if (message.type === "state") {
    Promise.all([readList("local", "always"), isPaused(), agentTabs()]).then(function (values) {
      reply({ connected: connected, always: values[0], paused: values[1], tabs: values[2].length, version: chrome.runtime.getManifest().version })
    })
    return true
  }
  if (message.type === "share") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(async function (tabs) {
      if (tabs.length === 0) return reply({ ok: false, text: "No tab is open." })
      const site = siteOf(tabs[0].url || "")
      if (!site) return reply({ ok: false, text: "Forkwise cannot work on this page. Open a normal site first." })
      await addToGroup(tabs[0])
      await addToList("session", "once", site)
      reply({ ok: true, text: "Forkwise can now use this tab." })
    })
    return true
  }
  if (message.type === "pause") {
    chrome.storage.local.set({ paused: !!message.value }).then(function () {
      if (message.value) detachAll()
      reply({ ok: true })
    })
    return true
  }
  if (message.type === "forget") {
    removeFromList("local", "always", message.site).then(function () {
      return removeFromList("session", "once", message.site)
    }).then(function () {
      reply({ ok: true })
    })
    return true
  }
  if (message.type === "stop") {
    detachAll().then(function () {
      reply({ ok: true })
    })
    return true
  }
  return false
})

chrome.alarms.create("forkwise-keep", { periodInMinutes: 0.5 })
chrome.alarms.onAlarm.addListener(function () {
  connect()
})
chrome.runtime.onStartup.addListener(connect)
chrome.runtime.onInstalled.addListener(connect)

setBadge()
connect()
