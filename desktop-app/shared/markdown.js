/* Small, safe markdown renderer shared by the desktop renderer and the tests.
   It never injects raw HTML from the model: everything is escaped first. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory()
  else root.FWMarkdown = factory()
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function safeUrl(url) {
    const value = String(url || "").trim()
    if (/^(https?:|mailto:)/i.test(value)) return value
    if (value.startsWith("#")) return value
    return ""
  }

  function inline(text) {
    let out = escapeHtml(text)
    const codes = []
    out = out.replace(/`([^`\n]+)`/g, function (all, code) {
      codes.push(code)
      return "\u0000C" + (codes.length - 1) + "\u0000"
    })
    out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, function (all, label, url) {
      const href = safeUrl(url.replace(/&amp;/g, "&"))
      if (!href) return label
      return '<a href="' + escapeHtml(href) + '" data-external="1" rel="noreferrer">' + label + "</a>"
    })
    out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function (all, before, url) {
      const href = safeUrl(url.replace(/&amp;/g, "&"))
      if (!href) return all
      return before + '<a href="' + escapeHtml(href) + '" data-external="1" rel="noreferrer">' + escapeHtml(url) + "</a>"
    })
    out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    out = out.replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
    out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    out = out.replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>")
    out = out.replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
    out = out.replace(/\u0000C(\d+)\u0000/g, function (all, index) {
      return "<code>" + codes[Number(index)] + "</code>"
    })
    return out
  }

  function render(text) {
    const source = String(text == null ? "" : text).replace(/\r\n/g, "\n")
    const lines = source.split("\n")
    const html = []
    let index = 0

    while (index < lines.length) {
      const line = lines[index]

      if (/^\s*```/.test(line)) {
        const lang = line.replace(/^\s*```/, "").trim().slice(0, 24)
        const body = []
        index += 1
        while (index < lines.length && !/^\s*```/.test(lines[index])) {
          body.push(lines[index])
          index += 1
        }
        index += 1
        html.push(
          '<div class="md-code"><div class="md-code-head"><span>' +
            escapeHtml(lang || "text") +
            '</span><button class="md-copy" data-copy="1" type="button">Copy</button></div><pre><code>' +
            escapeHtml(body.join("\n")) +
            "</code></pre></div>"
        )
        continue
      }

      if (/^\s*$/.test(line)) {
        index += 1
        continue
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/)
      if (heading) {
        const level = Math.min(heading[1].length + 2, 6)
        html.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">")
        index += 1
        continue
      }

      if (/^\s*>/.test(line)) {
        const body = []
        while (index < lines.length && /^\s*>/.test(lines[index])) {
          body.push(lines[index].replace(/^\s*>\s?/, ""))
          index += 1
        }
        html.push("<blockquote>" + inline(body.join(" ")) + "</blockquote>")
        continue
      }

      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
        html.push("<hr />")
        index += 1
        continue
      }

      const bullet = line.match(/^\s*[-*+]\s+(.*)$/)
      const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/)
      if (bullet || ordered) {
        const orderedList = !!ordered
        const items = []
        while (index < lines.length) {
          const current = lines[index]
          const match = orderedList ? current.match(/^\s*\d+[.)]\s+(.*)$/) : current.match(/^\s*[-*+]\s+(.*)$/)
          if (!match) break
          items.push("<li>" + inline(match[1]) + "</li>")
          index += 1
        }
        html.push((orderedList ? "<ol>" : "<ul>") + items.join("") + (orderedList ? "</ol>" : "</ul>"))
        continue
      }

      const body = []
      while (index < lines.length) {
        const current = lines[index]
        if (/^\s*$/.test(current)) break
        if (/^\s*```/.test(current)) break
        if (/^#{1,6}\s+/.test(current)) break
        if (/^\s*[-*+]\s+/.test(current) || /^\s*\d+[.)]\s+/.test(current)) break
        if (/^\s*>/.test(current)) break
        body.push(current)
        index += 1
      }
      html.push("<p>" + inline(body.join("\n")).replace(/\n/g, "<br />") + "</p>")
    }

    return html.join("")
  }

  function plain(text) {
    return String(text == null ? "" : text)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_~]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  return { render: render, escapeHtml: escapeHtml, plain: plain }
})
