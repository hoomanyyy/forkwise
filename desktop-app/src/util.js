const os = require("os")
const path = require("path")

function expand(p) {
  if (!p) return ""
  if (p === "~") return os.homedir()
  if (p.startsWith("~/") || p.startsWith("~\\")) return path.join(os.homedir(), p.slice(2))
  return p
}

function tail(text, limit) {
  if (text.length <= limit) return text
  return "[cut]\n" + text.slice(text.length - limit)
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

function toInt(value, fallback) {
  const n = parseInt(value, 10)
  if (isNaN(n)) return fallback
  return n
}

// os.userInfo() throws when the uid has no passwd entry (containers, LDAP hiccups).
function userName() {
  try {
    return os.userInfo().username
  } catch (problem) {
    return process.env.USER || process.env.USERNAME || "user"
  }
}

function clamp(value, low, high) {
  if (value < low) return low
  if (value > high) return high
  return value
}

module.exports = { expand, tail, sleep, toInt, clamp, userName }
