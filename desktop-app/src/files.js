const fs = require("fs")
const path = require("path")
const https = require("https")
const os = require("os")
const util = require("./util")

const MAX_READ = 300000
const MAX_WRITE = 3000000
const MAX_DOWNLOAD = 200 * 1024 * 1024

function listDir(p) {
  const folder = util.expand(p || "~")
  let names
  try {
    names = fs.readdirSync(folder)
  } catch (problem) {
    return { ok: false, text: "Not a folder: " + folder + " (" + problem.message + ")" }
  }
  names.sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })
  const lines = []
  const shown = names.slice(0, 400)
  for (let i = 0; i < shown.length; i++) {
    const full = path.join(folder, shown[i])
    try {
      const info = fs.statSync(full)
      if (info.isDirectory()) lines.push("[dir]  " + shown[i])
      else lines.push("       " + shown[i] + "  (" + info.size + " bytes)")
    } catch (problem) {
      lines.push("       " + shown[i])
    }
  }
  if (names.length > 400) lines.push("... " + (names.length - 400) + " more")
  return { ok: true, text: folder + "\n" + lines.join("\n") }
}

function readFile(p) {
  const full = util.expand(p)
  let info
  try {
    info = fs.statSync(full)
  } catch (problem) {
    return { ok: false, text: "Not a file: " + full }
  }
  if (!info.isFile()) return { ok: false, text: "Not a file: " + full }
  const fd = fs.openSync(full, "r")
  const buffer = Buffer.alloc(Math.min(info.size, MAX_READ + 1))
  fs.readSync(fd, buffer, 0, buffer.length, 0)
  fs.closeSync(fd)
  if (buffer.slice(0, 4000).includes(0)) return { ok: false, text: full + " is a binary file." }
  let text = buffer.slice(0, MAX_READ).toString("utf8")
  if (buffer.length > MAX_READ) text = text + "\n[cut at " + MAX_READ + " bytes]"
  return { ok: true, text: text }
}

function writeFile(p, content) {
  const full = util.expand(p)
  if (!full) return { ok: false, text: "path is missing." }
  const data = Buffer.from(content || "", "utf8")
  if (data.length > MAX_WRITE) return { ok: false, text: "The content is too large." }
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, data)
  return { ok: true, text: "Wrote " + data.length + " bytes to " + full }
}

function download(link, target, depth) {
  const level = depth || 0
  return new Promise(function (resolve) {
    if (!link || !link.toLowerCase().startsWith("https://")) {
      resolve({ ok: false, text: "Only https links are allowed." })
      return
    }
    if (level > 5) {
      resolve({ ok: false, text: "Too many redirects." })
      return
    }
    let full = util.expand(target || "")
    if (!full) full = path.join(os.homedir(), "Downloads", path.basename(new URL(link).pathname) || "download")
    https.get(link, { headers: { "User-Agent": "ForkwiseDesktop" } }, function (reply) {
      if (reply.statusCode >= 300 && reply.statusCode < 400 && reply.headers.location) {
        reply.resume()
        resolve(download(new URL(reply.headers.location, link).toString(), full, level + 1))
        return
      }
      if (reply.statusCode !== 200) {
        reply.resume()
        resolve({ ok: false, text: "The server answered " + reply.statusCode })
        return
      }
      fs.mkdirSync(path.dirname(full), { recursive: true })
      const out = fs.createWriteStream(full)
      let size = 0
      reply.on("data", function (chunk) {
        size = size + chunk.length
        if (size > MAX_DOWNLOAD) {
          reply.destroy()
          out.destroy()
          resolve({ ok: false, text: "The file is larger than 200 MB." })
        }
      })
      reply.pipe(out)
      out.on("finish", function () {
        resolve({ ok: true, text: "Saved " + size + " bytes to " + full })
      })
      out.on("error", function (problem) {
        resolve({ ok: false, text: problem.message })
      })
    }).on("error", function (problem) {
      resolve({ ok: false, text: "Download failed: " + problem.message })
    })
  })
}

module.exports = { listDir, readFile, writeFile, download }
