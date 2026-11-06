/* Model makers: models are grouped by who made them (Claude, OpenAI, DeepSeek...). */
(function () {
  const VENDORS = [
    { key: "anthropic", label: "Claude", color: "#d97757", words: ["claude", "anthropic/"] },
    { key: "openai", label: "OpenAI", color: "#10a37f", words: ["gpt", "openai/", "chatgpt", "codex", "davinci"] },
    { key: "google", label: "Gemini", color: "#4f8df5", words: ["gemini", "gemma", "google/", "palm"] },
    { key: "deepseek", label: "DeepSeek", color: "#4d6bfe", words: ["deepseek"] },
    { key: "xai", label: "Grok", color: "#a1a1aa", words: ["grok", "x-ai/", "xai/"] },
    { key: "qwen", label: "Qwen", color: "#8b5cf6", words: ["qwen", "qwq", "alibaba/"] },
    { key: "meta", label: "Llama", color: "#0668e1", words: ["llama", "meta-llama/", "meta/"] },
    { key: "mistral", label: "Mistral", color: "#fa520f", words: ["mistral", "mixtral", "codestral", "devstral", "magistral", "ministral", "pixtral"] },
    { key: "moonshot", label: "Kimi", color: "#16a34a", words: ["kimi", "moonshot"] },
    { key: "zhipu", label: "GLM", color: "#2563eb", words: ["glm", "z-ai/", "zhipu", "thudm/"] },
    { key: "minimax", label: "MiniMax", color: "#e11d48", words: ["minimax"] },
    { key: "nvidia", label: "NVIDIA", color: "#76b900", words: ["nemotron", "nvidia/"] },
    { key: "microsoft", label: "Phi", color: "#0ea5e9", words: ["phi-", "microsoft/"] },
    { key: "cohere", label: "Cohere", color: "#39594d", words: ["command-r", "command-a", "cohere/"] },
    { key: "amazon", label: "Amazon Nova", color: "#ff9900", words: ["nova-", "amazon/"] },
    { key: "other", label: "Other models", color: "#71717a", words: [] }
  ]

  function info(key) {
    for (let i = 0; i < VENDORS.length; i++) {
      if (VENDORS[i].key === key) return VENDORS[i]
    }
    return VENDORS[VENDORS.length - 1]
  }

  function of(model) {
    if (model.vendor) return model.vendor
    const name = String(model.key || "").toLowerCase()
    const base = name.split("/").pop().split(":").pop()
    const starts = ["o1", "o3", "o4"]
    for (let i = 0; i < starts.length; i++) {
      if (base === starts[i] || base.indexOf(starts[i] + "-") === 0) return "openai"
    }
    for (let i = 0; i < VENDORS.length; i++) {
      for (let j = 0; j < VENDORS[i].words.length; j++) {
        if (name.indexOf(VENDORS[i].words[j]) >= 0) return VENDORS[i].key
      }
    }
    return "other"
  }

  function group(models) {
    const groups = []
    for (let i = 0; i < VENDORS.length; i++) {
      const items = models.filter(function (model) {
        return of(model) === VENDORS[i].key
      })
      if (items.length) groups.push({ vendor: VENDORS[i], items: items })
    }
    return groups
  }

  function badge(vendorKey) {
    const item = info(vendorKey)
    const span = document.createElement("span")
    span.className = "vendor-badge"
    span.style.setProperty("--vendor", item.color)
    span.textContent = item.label.charAt(0)
    return span
  }

  function visible(models, prefs) {
    const hidden = (prefs && prefs.hiddenModels) || []
    const list = models.filter(function (model) {
      return hidden.indexOf(model.key) < 0
    })
    return list.length ? list : models
  }

  window.FW = window.FW || {}
  window.FW.vendors = { list: VENDORS, info: info, of: of, group: group, badge: badge, visible: visible }
})()
