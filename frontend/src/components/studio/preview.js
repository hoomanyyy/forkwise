function cleanPath(path) {
    let p = path.trim()
    while (p.startsWith("./")) {
        p = p.slice(2)
    }
    while (p.startsWith("/")) {
        p = p.slice(1)
    }
    return p
}

export function newFilesFromPatch(patch) {
    const files = {}
    if (!patch) {
        return files
    }
    const lines = patch.split("\n")
    let current = null
    let isNew = false
    let inHunk = false
    for (const line of lines) {
        if (line.startsWith("diff --git ")) {
            const parts = line.split(" b/")
            current = parts.length > 1 ? parts[parts.length - 1] : null
            isNew = false
            inHunk = false
            continue
        }
        if (current === null) {
            continue
        }
        if (line.startsWith("new file mode")) {
            isNew = true
            files[current] = []
            continue
        }
        if (line.startsWith("@@")) {
            inHunk = true
            continue
        }
        if (!isNew || !inHunk) {
            continue
        }
        if (line.startsWith("+") && !line.startsWith("+++")) {
            files[current].push(line.slice(1))
        }
    }
    const result = {}
    for (const name of Object.keys(files)) {
        result[name] = files[name].join("\n")
    }
    return result
}

function folderOf(path) {
    const index = path.lastIndexOf("/")
    if (index === -1) {
        return ""
    }
    return path.slice(0, index + 1)
}

function findFile(files, folder, link) {
    if (/^(https?:)?\/\//.test(link) || link.startsWith("data:")) {
        return null
    }
    const clean = cleanPath(link.split("?")[0].split("#")[0])
    if (files[folder + clean] !== undefined) {
        return files[folder + clean]
    }
    if (files[clean] !== undefined) {
        return files[clean]
    }
    return null
}

export function buildPreview(patch) {
    const files = newFilesFromPatch(patch)
    const pages = []
    for (const name of Object.keys(files)) {
        if (name.toLowerCase().endsWith(".html") || name.toLowerCase().endsWith(".htm")) {
            pages.push(name)
        }
    }
    if (pages.length === 0) {
        return { page: null, pages: [], html: "" }
    }
    let page = pages[0]
    for (const name of pages) {
        if (name.toLowerCase().endsWith("index.html")) {
            page = name
        }
    }
    return { page: page, pages: pages, html: inlinePage(files, page) }
}

export function inlinePage(files, page) {
    const folder = folderOf(page)
    let html = files[page] || ""
    html = html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
        if (!/stylesheet/i.test(tag)) {
            return tag
        }
        const css = findFile(files, folder, href)
        if (css === null) {
            return tag
        }
        return "<style>\n" + css + "\n</style>"
    })
    html = html.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, before, src, after) => {
        const js = findFile(files, folder, src)
        if (js === null) {
            return tag
        }
        return "<script" + before + after + ">\n" + js.replace(/<\/script/gi, "<\\/script") + "\n</script>"
    })
    return html
}

export function previewFiles(patch) {
    return newFilesFromPatch(patch)
}
