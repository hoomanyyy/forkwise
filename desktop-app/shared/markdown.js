/* Small, safe markdown renderer shared by the desktop renderer and the tests.
   It never injects raw HTML from the model: everything is escaped first. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory()
  else root.FWMarkdown = factory()
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const COPY_ICON = '<svg class="i-copy" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11.5" height="11.5" rx="2"/><path d="M6.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v1.5"/></svg>'
  const CHECK_ICON = '<svg class="i-done" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  const RUN_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5l11 7-11 7z"/></svg>'
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

  function isTableRow(line) {
    return /^\s*\|.*\|\s*$/.test(line) || (/\|/.test(line) && /\S\s*\|\s*\S/.test(line))
  }

  function isTableRule(line) {
    return /\|/.test(line) && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)
  }

  function cells(line) {
    let clean = String(line).trim()
    if (clean.charAt(0) === "|") clean = clean.slice(1)
    if (clean.charAt(clean.length - 1) === "|") clean = clean.slice(0, -1)
    return clean.split("|").map(function (cell) {
      return cell.trim()
    })
  }

  function table(head, rule, rows) {
    const aligns = cells(rule).map(function (cell) {
      const left = cell.charAt(0) === ":"
      const right = cell.charAt(cell.length - 1) === ":"
      if (left && right) return "center"
      if (right) return "right"
      return ""
    })
    function cellHtml(tag, value, index) {
      const align = aligns[index] ? ' style="text-align:' + aligns[index] + '"' : ""
      return "<" + tag + align + ">" + inline(value) + "</" + tag + ">"
    }
    const titles = cells(head)
    let html = '<div class="md-table"><table dir="auto"><thead><tr>'
    titles.forEach(function (value, index) {
      html += cellHtml("th", value, index)
    })
    html += "</tr></thead><tbody>"
    rows.forEach(function (row) {
      const values = cells(row)
      html += "<tr>"
      for (let index = 0; index < titles.length; index += 1) {
        html += cellHtml("td", values[index] || "", index)
      }
      html += "</tr>"
    })
    return html + "</tbody></table></div>"
  }

  const BULLET = /^(\s*)[-*+]\s+(.*)$/
  const NUMBER = /^(\s*)(\d+)[.)]\s+(.*)$/

  function listItem(line) {
    const bullet = line.match(BULLET)
    if (bullet) return { indent: bullet[1].length, ordered: false, text: bullet[2], number: 1 }
    const number = line.match(NUMBER)
    if (number) return { indent: number[1].length, ordered: true, text: number[3], number: Number(number[2]) }
    return null
  }

  function itemText(value) {
    const task = value.match(/^\[([ xX])\]\s+(.*)$/)
    if (task) {
      const done = task[1] !== " "
      return '<span class="md-task' + (done ? " done" : "") + '">' + (done ? "☑" : "☐") + "</span> " + inline(task[2])
    }
    return inline(value)
  }

  // Reads one list (and the lists nested in it) starting at lines[index].
  function list(lines, index) {
    const first = listItem(lines[index])
    const ordered = first.ordered
    const indent = first.indent
    const items = []
    let current = null
    while (index < lines.length) {
      const line = lines[index]
      if (/^\s*$/.test(line)) {
        // a blank line ends the list unless the next line carries it on
        let next = index + 1
        while (next < lines.length && /^\s*$/.test(lines[next])) next += 1
        const after = next < lines.length ? listItem(lines[next]) : null
        const indented = next < lines.length && /^\s{2,}\S/.test(lines[next])
        if ((after && after.indent >= indent && after.ordered === ordered) || (after && after.indent > indent) || (indented && current && !after)) {
          index = next
          continue
        }
        break
      }
      const item = listItem(line)
      if (item && item.indent > indent && current) {
        const nested = list(lines, index)
        current.children += nested.html
        index = nested.index
        continue
      }
      if (item && item.indent <= indent + 1) {
        if (item.ordered !== ordered || item.indent < indent) break
        current = { text: itemText(item.text), children: "" }
        items.push(current)
        index += 1
        continue
      }
      if (current && !item && /^\s+\S/.test(line) && !/^\s*```/.test(line)) {
        current.text += "<br />" + inline(line.trim())
        index += 1
        continue
      }
      if (current && !item && !/^\s*(```|#{1,6}\s|>)/.test(line) && !isTableRule(lines[index + 1] || "")) {
        // a lazy continuation line right under an item
        current.text += " " + inline(line.trim())
        index += 1
        continue
      }
      break
    }
    const start = ordered && first.number !== 1 ? ' start="' + first.number + '"' : ""
    let html = ordered ? "<ol dir=\"auto\"" + start + ">" : "<ul dir=\"auto\">"
    items.forEach(function (item) {
      html += "<li>" + item.text + item.children + "</li>"
    })
    html += ordered ? "</ol>" : "</ul>"
    return { html: html, index: index }
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
        const name = (lang || "text").split(/[\s{:]/)[0].toLowerCase()
        const shell = ["sh", "bash", "zsh", "shell", "console", "powershell", "ps1", "pwsh", "cmd", "bat"].indexOf(name) >= 0
        html.push(
          '<div class="md-code" dir="ltr" data-lang="' +
            escapeHtml(name) +
            '"><div class="md-code-head"><span class="md-lang">' +
            escapeHtml(name) +
            '</span><span class="md-code-tools">' +
            (shell ? '<button class="md-tool" data-run="1" type="button" title="Run in a terminal" aria-label="Run in a terminal">' + RUN_ICON + "<span>Run</span></button>" : "") +
            '<button class="md-tool md-copy" data-copy="1" type="button" title="Copy" aria-label="Copy code">' +
            COPY_ICON +
            CHECK_ICON +
            '</button></span></div><pre><code data-lang="' +
            escapeHtml(name) +
            '">' +
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
        const level = heading[1].length
        html.push("<h" + level + ' dir="auto">' + inline(heading[2].replace(/\s+#+\s*$/, "")) + "</h" + level + ">")
        index += 1
        continue
      }

      if (/^\s*>/.test(line)) {
        const body = []
        while (index < lines.length && /^\s*>/.test(lines[index])) {
          body.push(lines[index].replace(/^\s*>\s?/, ""))
          index += 1
        }
        html.push('<blockquote dir="auto">' + inline(body.join("\n")).replace(/\n/g, "<br />") + "</blockquote>")
        continue
      }

      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        html.push("<hr />")
        index += 1
        continue
      }

      if (isTableRow(line) && index + 1 < lines.length && isTableRule(lines[index + 1])) {
        const head = line
        const rule = lines[index + 1]
        const rows = []
        index += 2
        while (index < lines.length && /\|/.test(lines[index]) && !/^\s*$/.test(lines[index])) {
          rows.push(lines[index])
          index += 1
        }
        html.push(table(head, rule, rows))
        continue
      }

      if (listItem(line)) {
        const result = list(lines, index)
        html.push(result.html)
        index = result.index
        continue
      }

      const body = []
      while (index < lines.length) {
        const current = lines[index]
        if (/^\s*$/.test(current)) break
        if (/^\s*```/.test(current)) break
        if (/^#{1,6}\s+/.test(current)) break
        if (body.length && listItem(current)) break
        if (/^\s*>/.test(current)) break
        if (isTableRow(current) && index + 1 < lines.length && isTableRule(lines[index + 1])) break
        body.push(current)
        index += 1
      }
      if (!body.length) {
        body.push(lines[index])
        index += 1
      }
      html.push('<p dir="auto">' + inline(body.join("\n")).replace(/\n/g, "<br />") + "</p>")
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
