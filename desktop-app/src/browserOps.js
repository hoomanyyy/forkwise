const util = require("./util")

const LIST_SCRIPT = "(() => {" +
  "const query = 'a[href], button, input, textarea, select, summary, [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=option], [contenteditable=true], [onclick]';" +
  "document.querySelectorAll('[data-fw-ref]').forEach((node) => node.removeAttribute('data-fw-ref'));" +
  "const lines = []; let count = 0;" +
  "for (const node of document.querySelectorAll(query)) {" +
  "const box = node.getBoundingClientRect(); const style = getComputedStyle(node);" +
  "if (box.width < 4 || box.height < 4 || style.visibility === 'hidden' || style.display === 'none') continue;" +
  "if (box.bottom < 0 || box.top > innerHeight * 3) continue;" +
  "count += 1; if (count > 150) break;" +
  "node.setAttribute('data-fw-ref', String(count));" +
  "const label = (node.innerText || node.value || node.placeholder || node.getAttribute('aria-label') || node.title || node.alt || '').trim().replace(/\\s+/g, ' ').slice(0, 70);" +
  "const kind = node.tagName.toLowerCase() + (node.type ? ':' + node.type : '');" +
  "lines.push(count + ' [' + kind + '] ' + label + (node.href ? ' -> ' + node.href.slice(0, 80) : ''));" +
  "} return lines.join('\\n'); })()"

const KEYS = {
  enter: ["Enter", "Enter", 13, "\r"],
  tab: ["Tab", "Tab", 9, ""],
  escape: ["Escape", "Escape", 27, ""],
  esc: ["Escape", "Escape", 27, ""],
  backspace: ["Backspace", "Backspace", 8, ""],
  delete: ["Delete", "Delete", 46, ""],
  arrowdown: ["ArrowDown", "ArrowDown", 40, ""],
  arrowup: ["ArrowUp", "ArrowUp", 38, ""],
  arrowleft: ["ArrowLeft", "ArrowLeft", 37, ""],
  arrowright: ["ArrowRight", "ArrowRight", 39, ""],
  pagedown: ["PageDown", "PageDown", 34, ""],
  pageup: ["PageUp", "PageUp", 33, ""],
  home: ["Home", "Home", 36, ""],
  end: ["End", "End", 35, ""],
  space: [" ", "Space", 32, " "]
}

function create(getDriver) {
  const current = { builtin: "", chrome: "" }

  async function evaluate(driver, tab, expression, timeout) {
    const result = await driver.send(tab.id, "Runtime.evaluate", { expression: expression, returnByValue: true, awaitPromise: true }, timeout || 25000)
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails
      const text = (detail.exception && detail.exception.description) || detail.text || "script error"
      throw new Error(text.slice(0, 500))
    }
    return result.result ? result.result.value : undefined
  }

  async function waitLoaded(driver, tab) {
    await util.sleep(350)
    const end = Date.now() + 20000
    while (Date.now() < end) {
      try {
        const state = await evaluate(driver, tab, "document.readyState", 5000)
        if (state === "complete" || state === "interactive") {
          await util.sleep(400)
          return
        }
      } catch (problem) {}
      await util.sleep(300)
    }
  }

  async function header(driver, tab) {
    try {
      const title = await evaluate(driver, tab, "document.title", 5000)
      const link = await evaluate(driver, tab, "location.href", 5000)
      return "Page: " + String(title).slice(0, 80) + " (" + String(link).slice(0, 150) + ")"
    } catch (problem) {
      return ""
    }
  }

  async function describeTabs(driver) {
    const items = await driver.tabs()
    if (items.length === 0) return "No tabs are open. Use new_tab with a url."
    const lines = []
    for (let i = 0; i < items.length; i++) {
      const mark = items[i].id === current[driver.name] ? "* " : "  "
      lines.push(mark + i + ": [" + items[i].id.slice(0, 8) + "] " + items[i].title.slice(0, 70) + " - " + items[i].url.slice(0, 110))
    }
    return "Tabs (* is the one you are working in):\n" + lines.join("\n")
  }

  async function pickTab(driver, wanted) {
    const items = await driver.tabs()
    if (items.length === 0) return null
    const text = String(wanted === undefined || wanted === null ? "" : wanted).trim()
    if (text !== "") {
      if (/^\d+$/.test(text) && parseInt(text, 10) < items.length) return items[parseInt(text, 10)]
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === text || items[i].id.startsWith(text)) return items[i]
      }
      return null
    }
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === current[driver.name]) return items[i]
    }
    return items[0]
  }

  async function centerOf(driver, tab, ref) {
    const script = "(() => { const n = document.querySelector('[data-fw-ref=\"" + parseInt(ref, 10) + "\"]'); if (!n) return null; n.scrollIntoView({block: 'center', inline: 'center'}); const b = n.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()"
    const point = await evaluate(driver, tab, script, 10000)
    if (!point) throw new Error("No element with ref " + ref + ". Run elements again, the page changed.")
    return point
  }

  async function mouseClick(driver, tab, x, y, count) {
    await driver.send(tab.id, "Input.dispatchMouseEvent", { type: "mouseMoved", x: x, y: y })
    for (let i = 0; i < count; i++) {
      await driver.send(tab.id, "Input.dispatchMouseEvent", { type: "mousePressed", x: x, y: y, button: "left", clickCount: i + 1 })
      await driver.send(tab.id, "Input.dispatchMouseEvent", { type: "mouseReleased", x: x, y: y, button: "left", clickCount: i + 1 })
    }
  }

  async function press(driver, tab, combo) {
    const parts = String(combo || "enter").split("+").map(function (p) {
      return p.trim().toLowerCase()
    }).filter(Boolean)
    let modifiers = 0
    const main = parts.length ? parts[parts.length - 1] : "enter"
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i] === "alt") modifiers = modifiers | 1
      if (parts[i] === "ctrl" || parts[i] === "control") modifiers = modifiers | 2
      if (parts[i] === "meta" || parts[i] === "cmd" || parts[i] === "command" || parts[i] === "win") modifiers = modifiers | 4
      if (parts[i] === "shift") modifiers = modifiers | 8
    }
    let entry = KEYS[main]
    if (!entry) entry = [main, "Key" + main.toUpperCase(), main.toUpperCase().charCodeAt(0), main]
    let text = entry[3]
    if (modifiers & 6) text = ""
    const down = { type: text ? "keyDown" : "rawKeyDown", key: entry[0], code: entry[1], windowsVirtualKeyCode: entry[2], modifiers: modifiers }
    if (text) down.text = text
    await driver.send(tab.id, "Input.dispatchKeyEvent", down)
    await driver.send(tab.id, "Input.dispatchKeyEvent", { type: "keyUp", key: entry[0], code: entry[1], windowsVirtualKeyCode: entry[2], modifiers: modifiers })
  }

  async function run(message) {
    try {
      return await runOp(message)
    } catch (problem) {
      return { ok: false, text: "Browser problem: " + String(problem.message || problem).slice(0, 600) }
    }
  }

  async function runOp(message) {
    const driver = getDriver(message.browser === "chrome" ? "chrome" : "builtin")
    const op = String(message.op || "tabs").trim()
    if (op === "start") {
      const started = await driver.ensure(message.url || "about:blank")
      return started
    }
    const ready = await driver.ensure()
    if (!ready.ok) return ready
    if (op === "tabs") return { ok: true, text: await describeTabs(driver) }
    if (op === "new_tab") {
      const url = message.url || "about:blank"
      const id = await driver.newTab(url)
      current[driver.name] = id
      const tab = await pickTab(driver, id)
      if (tab && url !== "about:blank") await waitLoaded(driver, tab)
      return { ok: true, text: "Opened a new tab.\n" + (tab ? await header(driver, tab) : "") + "\n" + await describeTabs(driver) }
    }
    const tab = await pickTab(driver, message.tab)
    if (!tab) return { ok: false, text: "No such tab.\n" + await describeTabs(driver) }
    if (op === "switch_tab") {
      current[driver.name] = tab.id
      await driver.activate(tab.id)
      return { ok: true, text: "Switched.\n" + await header(driver, tab) }
    }
    if (op === "close_tab") {
      await driver.close(tab.id)
      if (current[driver.name] === tab.id) current[driver.name] = ""
      return { ok: true, text: "Closed the tab.\n" + await describeTabs(driver) }
    }
    current[driver.name] = tab.id
    if (op === "goto") {
      await driver.send(tab.id, "Page.navigate", { url: message.url || "about:blank" })
      await waitLoaded(driver, tab)
      return { ok: true, text: "Opened.\n" + await header(driver, tab) }
    }
    if (op === "read") {
      const body = (await evaluate(driver, tab, "document.body ? document.body.innerText : ''")) || ""
      return { ok: true, text: await header(driver, tab) + "\n\n" + String(body).slice(0, 20000) }
    }
    if (op === "html") {
      const body = (await evaluate(driver, tab, "document.documentElement.outerHTML")) || ""
      return { ok: true, text: await header(driver, tab) + "\n\n" + String(body).slice(0, 40000) }
    }
    if (op === "elements") {
      const body = (await evaluate(driver, tab, LIST_SCRIPT)) || "(no clickable elements found)"
      return { ok: true, text: await header(driver, tab) + "\nClickable elements, use the number as ref:\n" + body }
    }
    if (op === "click") {
      if (message.ref === undefined || message.ref === null) return { ok: false, text: "click needs a ref from elements." }
      const point = await centerOf(driver, tab, message.ref)
      await mouseClick(driver, tab, point[0], point[1], message.double ? 2 : 1)
      await util.sleep(600)
      return { ok: true, text: "Clicked ref " + message.ref + ".\n" + await header(driver, tab) }
    }
    if (op === "type") {
      const value = message.text || ""
      if (message.ref !== undefined && message.ref !== null) {
        const point = await centerOf(driver, tab, message.ref)
        await mouseClick(driver, tab, point[0], point[1], 1)
        await evaluate(driver, tab, "(() => { const n = document.querySelector('[data-fw-ref=\"" + parseInt(message.ref, 10) + "\"]'); if (n && 'select' in n) n.select(); })()", 5000)
      }
      await driver.send(tab.id, "Input.insertText", { text: value })
      if (message.submit) {
        await press(driver, tab, "enter")
        await util.sleep(600)
      }
      return { ok: true, text: "Typed " + value.length + " characters." }
    }
    if (op === "press") {
      await press(driver, tab, message.keys || "enter")
      await util.sleep(400)
      return { ok: true, text: "Pressed " + (message.keys || "enter") + "." }
    }
    if (op === "scroll") {
      const amount = util.toInt(message.amount, -5)
      await evaluate(driver, tab, "window.scrollBy(0, " + (-amount * 120) + ")", 5000)
      return { ok: true, text: "Scrolled." }
    }
    if (op === "back" || op === "forward") {
      await evaluate(driver, tab, op === "back" ? "history.back()" : "history.forward()", 5000)
      await waitLoaded(driver, tab)
      return { ok: true, text: await header(driver, tab) }
    }
    if (op === "reload") {
      await driver.send(tab.id, "Page.reload", {})
      await waitLoaded(driver, tab)
      return { ok: true, text: await header(driver, tab) }
    }
    if (op === "eval") {
      const value = await evaluate(driver, tab, message.expression || "null")
      let text = JSON.stringify(value === undefined ? null : value)
      if (text === undefined) text = "null"
      return { ok: true, text: text.slice(0, 20000) }
    }
    if (op === "wait") {
      const wanted = String(message.text || "")
      const seconds = util.clamp(util.toInt(message.amount, 10), 1, 60)
      const end = Date.now() + seconds * 1000
      while (Date.now() < end) {
        const found = await evaluate(driver, tab, "document.body ? document.body.innerText.indexOf(" + JSON.stringify(wanted) + ") >= 0 : false", 5000)
        if (found) return { ok: true, text: "The text appeared.\n" + await header(driver, tab) }
        await util.sleep(500)
      }
      return { ok: false, text: "The text did not appear within " + seconds + " seconds." }
    }
    if (op === "screenshot") {
      const shot = await driver.send(tab.id, "Page.captureScreenshot", { format: "png" })
      return { ok: true, text: await header(driver, tab), image: shot.data }
    }
    return { ok: false, text: "Unknown browser op " + op }
  }

  return { run }
}

module.exports = { create }
