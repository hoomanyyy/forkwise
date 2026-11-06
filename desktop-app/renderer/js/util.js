/* DOM helpers, icons and small utilities. */
(function () {
  const ICONS = {
    filePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11.5v6M9 14.5h6"/>',
    files: '<path d="M15 3H9a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7z"/><path d="M15 3v4h4"/><path d="M4 8v11a2 2 0 0 0 2 2h8"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    save: '<path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 1-2z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    collapse: '<path d="M7 9l5-5 5 5M7 15l5 5 5-5"/>',
    replace: '<path d="M4 7h11l-3-3M20 17H9l3 3"/>',
    regex: '<path d="M17 3v8M13.5 5l7 4M20.5 5l-7 4"/><rect x="3" y="15" width="6" height="6" rx="1"/>',
    caseSense: '<path d="M3 18l4.5-12L12 18M4.6 14h5.8"/><path d="M15 13.5a2.5 2.5 0 1 1 5 0V18M20 15.6c-3.4-.6-5 .3-5 1.3s.9 1.6 2 1.6 3-.7 3-2.9"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c5.9 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.4 6.5C3.9 8.2 2.5 12 2.5 12S6.1 18.5 12 18.5a9 9 0 0 0 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
    command: '<path d="M9 6v12M15 6v12M6 9h12M6 15h12"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17h.01"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
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
    zap: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    cloud: '<path d="M17.5 19H8a5.5 5.5 0 1 1 1.2-10.87A6 6 0 0 1 20.6 10.6 4.25 4.25 0 0 1 17.5 19z"/>',
    sparkles: '<path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6zM18 14l.8 2.2 2.2.8-2.2.8L18 20l-.8-2.2-2.2-.8 2.2-.8z"/>',
    thumbUp: '<path d="M7 10.5v10M7 10.5l4-7.5a2.2 2.2 0 0 1 2.5 2.6L13 9h5.3a2 2 0 0 1 2 2.3l-1.2 7.5a2 2 0 0 1-2 1.7H7m0-10H4.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1H7"/>',
    thumbDown: '<path d="M17 13.5v-10M17 13.5l-4 7.5a2.2 2.2 0 0 1-2.5-2.6L11 15H5.7a2 2 0 0 1-2-2.3l1.2-7.5a2 2 0 0 1 2-1.7H17m0 10h2.5a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H17"/>',
    retry: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4.5H8"/>',
    archive: '<rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12.5h4"/>'
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

  // The server sends times in seconds, the browser works in milliseconds.
  function stampMs(stamp) {
    if (stamp === undefined || stamp === null || stamp === "") return Date.now()
    const number = Number(stamp)
    if (!isNaN(number)) return number < 100000000000 ? number * 1000 : number
    const parsed = new Date(stamp).getTime()
    return isNaN(parsed) ? Date.now() : parsed
  }

  function timeAgo(stamp) {
    const seconds = Math.max(0, Math.floor((Date.now() - stampMs(stamp)) / 1000))
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return minutes + "m ago"
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return hours + "h ago"
    const days = Math.floor(hours / 24)
    if (days === 1) return "yesterday"
    if (days < 7) return days + "d ago"
    return new Date(stampMs(stamp)).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  function clock(stamp) {
    return new Date(stampMs(stamp)).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  }

  /* ------------------------------------------------------------- menus */

  // True while a menu, a dialog or the settings window is open, so keys like
  // Esc close that first instead of stopping the agent.
  function overlayOpen() {
    return !!document.querySelector(".modal-back:not(.leaving), .pop:not(.leaving)")
  }

  let openMenu = null

  function closeMenu() {
    if (!openMenu) return
    const current = openMenu
    openMenu = null
    current.cleanup()
    current.node.classList.add("leaving")
    if (current.anchor) {
      current.anchor.classList.remove("open")
      current.anchor.setAttribute("aria-expanded", "false")
    }
    setTimeout(function () {
      current.node.remove()
    }, 90)
  }

  // A themed dropdown in place of the native <select>.
  // items: [{ value, label, hint, icon, checked, danger, header }]
  function menu(anchor, items, onPick, options) {
    const settings = options || {}
    if (openMenu && openMenu.anchor === anchor) {
      closeMenu()
      return null
    }
    closeMenu()
    const node = h("div", { class: "pop menu" + (settings.className ? " " + settings.className : ""), role: "menu" })
    let search = null
    const list = h("div", { class: "menu-list" })
    if (settings.search) {
      search = h("input", { class: "menu-search", type: "text", placeholder: settings.search, spellcheck: "false" })
      node.appendChild(search)
    }
    node.appendChild(list)
    let buttons = []
    let active = -1

    function draw(query) {
      list.innerHTML = ""
      buttons = []
      const needle = String(query || "").trim().toLowerCase()
      const withIcons = items.some(function (item) {
        return !!item.icon || !!item.color
      })
      items.forEach(function (item) {
        if (item.header) {
          if (!needle) list.appendChild(h("div", { class: "menu-head", text: item.header }))
          return
        }
        if (item.separator) {
          if (!needle && list.lastChild && !list.lastChild.classList.contains("menu-sep")) list.appendChild(h("div", { class: "menu-sep" }))
          return
        }
        const words = (String(item.label || "") + " " + String(item.hint || "") + " " + String(item.words || "")).toLowerCase()
        if (needle && words.indexOf(needle) < 0) return
        const button = h("button", { class: "pop-item menu-item" + (item.checked ? " checked" : "") + (item.danger ? " danger" : ""), type: "button", role: "menuitemradio", "aria-checked": item.checked ? "true" : "false", title: item.title || "" }, [
          item.color ? h("span", { class: "menu-icon menu-dot", style: "--vendor:" + item.color, text: item.letter || "" }) : item.icon ? h("span", { class: "menu-icon", html: icon(item.icon, 13) }) : withIcons ? h("span", { class: "menu-icon", style: "width:13px" }) : null,
          h("span", { class: "menu-text" }, [h("span", { class: "menu-label", text: item.label }), item.hint ? h("span", { class: "menu-hint", text: item.hint }) : null]),
          item.key ? h("span", { class: "menu-key", text: item.key }) : h("span", { class: "menu-check", html: item.checked ? icon("check", 12) : "" })
        ])
        button.addEventListener("click", function (event) {
          event.stopPropagation()
          closeMenu()
          onPick(item.value, item)
        })
        button.addEventListener("mousemove", function () {
          setActive(buttons.indexOf(button), false)
        })
        buttons.push(button)
        list.appendChild(button)
      })
      if (list.lastChild && list.lastChild.classList.contains("menu-sep")) list.lastChild.remove()
      if (!buttons.length) list.appendChild(h("div", { class: "menu-empty", text: "Nothing matches." }))
      const checked = buttons.findIndex(function (button) {
        return button.classList.contains("checked")
      })
      setActive(needle ? 0 : checked, true)
    }

    function setActive(index, reveal) {
      buttons.forEach(function (button) {
        button.classList.remove("active")
      })
      active = index
      const button = buttons[index]
      if (!button) return
      button.classList.add("active")
      if (reveal) button.scrollIntoView({ block: "nearest" })
    }

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeMenu()
        if (settings.onClose) settings.onClose()
        return
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!buttons.length) return
        const step = event.key === "ArrowDown" ? 1 : -1
        let next = active + step
        if (next < 0) next = buttons.length - 1
        if (next >= buttons.length) next = 0
        setActive(next, true)
        return
      }
      if (event.key === "Enter") {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (buttons[active]) buttons[active].click()
        return
      }
      if (event.key === "Tab") {
        closeMenu()
      }
    }

    function onDown(event) {
      if (node.contains(event.target)) return
      if (anchor && anchor.contains(event.target)) {
        // the anchor's own click closes or reopens the menu
        event.stopPropagation()
        closeMenu()
        return
      }
      closeMenu()
    }

    function onResize() {
      closeMenu()
    }

    document.body.appendChild(node)
    draw("")
    place(node, anchor, settings)
    if (search) {
      search.addEventListener("input", function () {
        draw(search.value)
      })
      setTimeout(function () {
        search.focus()
      }, 10)
    }
    document.addEventListener("keydown", onKey, true)
    document.addEventListener("mousedown", onDown, true)
    window.addEventListener("resize", onResize)
    window.addEventListener("blur", onResize)
    if (anchor) {
      anchor.classList.add("open")
      anchor.setAttribute("aria-expanded", "true")
    }
    openMenu = {
      node: node,
      anchor: anchor,
      cleanup: function () {
        document.removeEventListener("keydown", onKey, true)
        document.removeEventListener("mousedown", onDown, true)
        window.removeEventListener("resize", onResize)
        window.removeEventListener("blur", onResize)
      }
    }
    return node
  }

  // Puts a floating box next to its anchor and keeps it inside the window.
  function place(node, anchor, settings) {
    const margin = 8
    const box = anchor ? anchor.getBoundingClientRect() : { left: settings.x || 0, right: settings.x || 0, top: settings.y || 0, bottom: settings.y || 0, width: 0 }
    node.style.position = "fixed"
    node.style.visibility = "hidden"
    node.style.maxHeight = ""
    const roomBelow = window.innerHeight - box.bottom - margin
    const roomAbove = box.top - margin
    const wantUp = settings.up === true || (settings.up !== false && roomBelow < Math.min(node.offsetHeight, 320) && roomAbove > roomBelow)
    const room = Math.max(120, (wantUp ? roomAbove : roomBelow) - 4)
    node.style.maxHeight = room + "px"
    const height = Math.min(node.offsetHeight, room)
    const width = node.offsetWidth
    let left = settings.alignRight ? box.right - width : box.left
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
    const top = wantUp ? box.top - height - 4 : box.bottom + 4
    node.style.left = left + "px"
    node.style.top = Math.max(margin, top) + "px"
    node.classList.toggle("up", wantUp)
    node.style.visibility = ""
  }

  /* ----------------------------------------------------------- dialogs */

  // Electron does not support window.prompt, so the app has its own.
  // Returns a promise: the typed text (or true for a confirm), or null.
  function dialog(settings) {
    return new Promise(function (resolve) {
      closeMenu()
      const back = h("div", { class: "modal-back fw-dialog" })
      const box = h("div", { class: "dialog", role: "dialog", "aria-modal": "true" })
      const title = h("div", { class: "dialog-title", text: settings.title || "" })
      box.appendChild(title)
      if (settings.text) box.appendChild(h("div", { class: "dialog-text", text: settings.text }))
      let input = null
      if (settings.input !== undefined) {
        input = h("input", { class: "dialog-input", type: "text", value: settings.input || "", spellcheck: "false", dir: "auto" })
        box.appendChild(input)
      }
      const cancel = h("button", { class: "btn ghost sm", type: "button", text: settings.cancel || "Cancel" })
      const extra = settings.extra ? h("button", { class: "btn sm", type: "button", text: settings.extra }) : null
      const ok = h("button", { class: "btn sm " + (settings.danger ? "danger-solid" : "primary"), type: "button", text: settings.ok || "OK" })
      box.appendChild(h("div", { class: "dialog-actions" }, [extra, cancel, ok]))
      back.appendChild(box)
      document.body.appendChild(back)
      let done = false
      function finish(value) {
        if (done) return
        done = true
        document.removeEventListener("keydown", onKey, true)
        back.classList.add("leaving")
        setTimeout(function () {
          back.remove()
        }, 120)
        resolve(value)
      }
      function onKey(event) {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopImmediatePropagation()
          finish(null)
        } else if (event.key === "Enter") {
          event.preventDefault()
          event.stopImmediatePropagation()
          ok.click()
        }
      }
      cancel.addEventListener("click", function () {
        finish(null)
      })
      if (extra) {
        extra.addEventListener("click", function () {
          finish("extra")
        })
      }
      ok.addEventListener("click", function () {
        if (input) {
          const value = input.value.trim()
          if (!value) {
            input.focus()
            return
          }
          finish(value)
        } else {
          finish(true)
        }
      })
      back.addEventListener("mousedown", function (event) {
        if (event.target === back) finish(null)
      })
      document.addEventListener("keydown", onKey, true)
      setTimeout(function () {
        if (input) {
          input.focus()
          input.select()
        } else {
          ok.focus()
        }
      }, 20)
    })
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
    // messages from the main process arrive wrapped in Electron's IPC wording
    text = String(text == null ? "" : text).replace(/^Error invoking remote method '[^']+': (Error: )?/, "")
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
    stampMs: stampMs,
    clock: clock,
    menu: menu,
    closeMenu: closeMenu,
    place: place,
    dialog: dialog,
    overlayOpen: overlayOpen,
    copy: copy,
    toast: toast,
    initials: initials,
    key: key,
    isMac: isMac
  }
})()
