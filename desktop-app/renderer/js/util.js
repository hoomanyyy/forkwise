/* DOM helpers, icons and small utilities. */
(function () {
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.11A1.7 1.7 0 0 0 4.67 8.7a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1z"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>',
    spark: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    terminal: '<path d="M4 17l6-5-6-5"/><path d="M12 19h8"/>',
    folder: '<path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2.4h8a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.3 8.7 12S9.8 5.8 12 3.5z"/>',
    cursor: '<path d="M5 3l14 8.5-6.4 1.6-3 6.3z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M20.5 16l-4.7-4.5L7 20"/>',
    brain: '<path d="M9 4.5A2.5 2.5 0 0 0 6.5 7v.4A2.6 2.6 0 0 0 5 9.9c0 .9.4 1.7 1 2.2A2.7 2.7 0 0 0 5.4 14c0 1.2.8 2.3 1.9 2.6A2.5 2.5 0 0 0 9.8 19c.8 0 1.5-.4 2-1V5.9A2.4 2.4 0 0 0 9 4.5z"/><path d="M15 4.5A2.5 2.5 0 0 1 17.5 7v.4A2.6 2.6 0 0 1 19 9.9c0 .9-.4 1.7-1 2.2A2.7 2.7 0 0 1 18.6 14c0 1.2-.8 2.3-1.9 2.6A2.5 2.5 0 0 1 14.2 19c-.8 0-1.5-.4-2-1V5.9a2.4 2.4 0 0 1 2.8-1.4z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    branch: '<circle cx="6.5" cy="5.5" r="2.2"/><circle cx="6.5" cy="18.5" r="2.2"/><circle cx="17.5" cy="8.5" r="2.2"/><path d="M6.5 7.7v8.6M17.5 10.7c0 3.4-3 4.3-6 4.6"/>',
    eye: '<path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12 17.9 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    tool: '<path d="M14.5 6.5a4 4 0 0 0 5.3 5.3L11 20.6a2.4 2.4 0 0 1-3.4-3.4z"/><path d="M14.5 6.5L18 3l3 3-3.5 3.5"/>',
    app: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    dot: '<circle cx="12" cy="12" r="3.2"/>',
    chat: '<path d="M20.5 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 20.5 12z"/>',
    bookmark: '<path d="M6 4h12v17l-6-4.2L6 21z"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    alert: '<path d="M12 3.5l9 16H3z"/><path d="M12 9.5v4.5M12 17h.01"/>',
    close: '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
    more: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    trash: '<path d="M4 7h16M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7"/><path d="M6.5 7l1 12.2a1.8 1.8 0 0 0 1.8 1.8h5.4a1.8 1.8 0 0 0 1.8-1.8L17.5 7"/>',
    pin: '<path d="M9 3.5h6l-1 5 3 3v1.5h-4v7l-1 1-1-1v-7H7V11.5l3-3z"/>',
    arrowUp: '<path d="M12 19.5V5M6 11l6-6 6 6"/>',
    square: '<rect x="7" y="7" width="10" height="10" rx="1.4"/>',
    chevron: '<path d="M9.5 6l6 6-6 6"/>',
    chevronDown: '<path d="M6 9.5l6 6 6-6"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9.5 4v16"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14.5 4v16"/>',
    folderPlus: '<path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2.4h8a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
    clip: '<path d="M20 11.5l-7.8 7.8a4.6 4.6 0 0 1-6.5-6.5L13.5 5a3 3 0 1 1 4.3 4.3l-7.8 7.8a1.6 1.6 0 1 1-2.2-2.2l7-7"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4.5V11h-6"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M18.5 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5h4.5"/>',
    play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
    stopCircle: '<circle cx="12" cy="12" r="8.5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    wand: '<path d="M4 20l9-9M13.5 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/><path d="M18 12.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
    copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2"/><path d="M6.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v1.5"/>',
    cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    logout: '<path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    shield: '<path d="M12 3l7.5 3v6c0 4.4-3.1 7.9-7.5 9-4.4-1.1-7.5-4.6-7.5-9V6z"/>',
    zap: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'
  }

  function icon(name, size, extraClass) {
    const body = ICONS[name] || ICONS.dot
    const px = size || 14
    return (
      '<svg class="ico' +
      (extraClass ? " " + extraClass : "") +
      '" width="' +
      px +
      '" height="' +
      px +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body +
      "</svg>"
    )
  }

  function h(tag, props, children) {
    const node = document.createElement(tag)
    if (props) {
      Object.keys(props).forEach(function (key) {
        const value = props[key]
        if (value === undefined || value === null || value === false) return
        if (key === "class") node.className = value
        else if (key === "html") node.innerHTML = value
        else if (key === "text") node.textContent = value
        else if (key.indexOf("on") === 0 && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value)
        else if (key === "dataset") Object.keys(value).forEach(function (name) { node.dataset[name] = value[name] })
        else node.setAttribute(key, value === true ? "" : value)
      })
    }
    ;(children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child)
    })
    return node
  }

  function el(selector, root) {
    return (root || document).querySelector(selector)
  }

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector))
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function debounce(fn, wait) {
    let timer = null
    return function () {
      const args = arguments
      clearTimeout(timer)
      timer = setTimeout(function () {
        fn.apply(null, args)
      }, wait)
    }
  }

  function timeAgo(stamp) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(stamp).getTime()) / 1000))
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return minutes + "m ago"
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return hours + "h ago"
    const days = Math.floor(hours / 24)
    if (days === 1) return "yesterday"
    if (days < 7) return days + "d ago"
    return new Date(stamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  function clock(stamp) {
    return new Date(stamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(String(text || ""))
      toast("Copied")
    } catch (problem) {
      toast("Could not copy", "bad")
    }
  }

  let toastHost = null
  function toast(text, kind, ms) {
    if (!toastHost) {
      toastHost = h("div", { class: "toasts" })
      document.body.appendChild(toastHost)
    }
    const node = h("div", { class: "toast" + (kind ? " " + kind : "") }, [h("span", { class: "dot" }), h("span", { text: text })])
    toastHost.appendChild(node)
    setTimeout(function () {
      node.style.transition = "opacity 180ms ease, transform 180ms ease"
      node.style.opacity = "0"
      node.style.transform = "translateY(4px)"
      setTimeout(function () {
        node.remove()
      }, 200)
    }, ms || 2600)
  }

  function initials(name) {
    const clean = String(name || "F").trim()
    const parts = clean.split(/[\s@._-]+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return clean.slice(0, 2).toUpperCase()
  }

  function platformKey(event) {
    return (navigator.platform || "").toLowerCase().indexOf("mac") >= 0 ? "meta" : "ctrl"
  }

  const isMac = (navigator.platform || "").toLowerCase().indexOf("mac") >= 0
  function key(text) {
    return isMac ? text.replace("Mod", "\u2318").replace("Shift", "\u21e7").replace("Alt", "\u2325") : text.replace("Mod", "Ctrl").replace("Shift", "Shift").replace("Alt", "Alt")
  }

  window.FW = window.FW || {}
  window.FW.util = {
    icon: icon,
    h: h,
    el: el,
    all: all,
    escapeHtml: escapeHtml,
    debounce: debounce,
    timeAgo: timeAgo,
    clock: clock,
    copy: copy,
    toast: toast,
    initials: initials,
    key: key,
    isMac: isMac
  }
})()
