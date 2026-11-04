const util = require("./util")

const MAX_WIDTH = 1366
let nut = null

function loadNut() {
  if (nut) return nut
  try {
    nut = require("@nut-tree-fork/nut-js")
  } catch (problem) {
    throw new Error("Mouse and keyboard control is not available here (" + problem.message + "). On Linux use an X11 session.")
  }
  nut.keyboard.config.autoDelayMs = 15
  nut.mouse.config.autoDelayMs = 20
  return nut
}

function keyNames() {
  const k = loadNut().Key
  const map = {
    enter: k.Enter, return: k.Enter, tab: k.Tab, escape: k.Escape, esc: k.Escape, space: k.Space,
    backspace: k.Backspace, delete: k.Delete, del: k.Delete, insert: k.Insert,
    up: k.Up, down: k.Down, left: k.Left, right: k.Right,
    arrowup: k.Up, arrowdown: k.Down, arrowleft: k.Left, arrowright: k.Right,
    home: k.Home, end: k.End, pageup: k.PageUp, pagedown: k.PageDown,
    ctrl: k.LeftControl, control: k.LeftControl, shift: k.LeftShift, alt: k.LeftAlt, option: k.LeftAlt,
    win: k.LeftSuper, windows: k.LeftSuper, super: k.LeftSuper, meta: k.LeftSuper, cmd: k.LeftSuper, command: k.LeftSuper,
    "-": k.Minus, "=": k.Equal, ",": k.Comma, ".": k.Period, "/": k.Slash, ";": k.Semicolon
  }
  const letters = "abcdefghijklmnopqrstuvwxyz"
  for (let i = 0; i < letters.length; i++) map[letters[i]] = k[letters[i].toUpperCase()]
  for (let d = 0; d <= 9; d++) map[String(d)] = k["Num" + d]
  for (let f = 1; f <= 12; f++) map["f" + f] = k["F" + f]
  return map
}

function create(host) {
  const state = { scale: 1, left: 0, top: 0 }

  async function refresh() {
    const shot = await host.capture(MAX_WIDTH)
    const box = host.inputBounds()
    state.scale = box.width / shot.width
    state.left = box.left
    state.top = box.top
    return shot
  }

  async function screenshot() {
    const shot = await refresh()
    return { ok: true, text: "Screenshot " + shot.width + "x" + shot.height + ". Use these pixel positions for click.", image: shot.base64 }
  }

  function toReal(x, y) {
    return { x: Math.round(Number(x) * state.scale) + state.left, y: Math.round(Number(y) * state.scale) + state.top }
  }

  function toImage(x, y) {
    return { x: Math.round((x - state.left) / state.scale), y: Math.round((y - state.top) / state.scale) }
  }

  async function move(x, y) {
    const lib = loadNut()
    const point = toReal(x, y)
    await lib.mouse.setPosition(new lib.Point(point.x, point.y))
  }

  async function click(x, y, button, double) {
    const lib = loadNut()
    await move(x, y)
    await util.sleep(60)
    let which = lib.Button.LEFT
    if (button === "right") which = lib.Button.RIGHT
    if (button === "middle") which = lib.Button.MIDDLE
    if (double) await lib.mouse.doubleClick(which)
    else await lib.mouse.click(which)
  }

  async function drag(x, y, x2, y2, button) {
    const lib = loadNut()
    await move(x, y)
    await util.sleep(80)
    const which = button === "right" ? lib.Button.RIGHT : lib.Button.LEFT
    await lib.mouse.pressButton(which)
    await util.sleep(80)
    const target = toReal(x2, y2)
    await lib.mouse.setPosition(new lib.Point(Math.round((target.x + toReal(x, y).x) / 2), Math.round((target.y + toReal(x, y).y) / 2)))
    await util.sleep(80)
    await lib.mouse.setPosition(new lib.Point(target.x, target.y))
    await util.sleep(80)
    await lib.mouse.releaseButton(which)
  }

  async function scroll(x, y, amount) {
    const lib = loadNut()
    if (x !== undefined && x !== null && y !== undefined && y !== null) await move(x, y)
    const n = util.toInt(amount, -5)
    if (n >= 0) await lib.mouse.scrollUp(n)
    else await lib.mouse.scrollDown(-n)
  }

  async function typeText(text) {
    const lib = loadNut()
    let plain = true
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 126 || text.charCodeAt(i) < 9) plain = false
    }
    if (plain) {
      await lib.keyboard.type(text)
      return
    }
    const before = host.clipboardRead()
    host.clipboardWrite(text)
    const paste = process.platform === "darwin" ? lib.Key.LeftSuper : lib.Key.LeftControl
    await lib.keyboard.pressKey(paste, lib.Key.V)
    await lib.keyboard.releaseKey(paste, lib.Key.V)
    await util.sleep(150)
    host.clipboardWrite(before)
  }

  async function pressKeys(combo) {
    const lib = loadNut()
    const names = keyNames()
    const parts = String(combo || "enter").split("+")
    const codes = []
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i].trim().toLowerCase()
      if (!names[name]) throw new Error("Unknown key: " + name)
      codes.push(names[name])
    }
    await lib.keyboard.pressKey.apply(lib.keyboard, codes)
    await lib.keyboard.releaseKey.apply(lib.keyboard, codes.slice().reverse())
    return parts.join("+")
  }

  return { screenshot, refresh, toReal, toImage, move, click, drag, scroll, typeText, pressKeys, state }
}

module.exports = { create }
