import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const dist = path.resolve(root, process.env.DIST_DIR || "dist")
const site = (process.env.SITE_URL || "https://forkwiseai.com").replace(/\/$/, "")

async function load(name) {
  return import(pathToFileURL(path.join(root, "src", "content", name)).href)
}

const catalog = await load("catalog.js")
const docs = await load("docs.js")
const posts = await load("posts.js")

const stash = path.join(dist, "_template.html")
if (!fs.existsSync(stash)) fs.copyFileSync(path.join(dist, "index.html"), stash)
const base = fs.readFileSync(stash, "utf8")

const pages = [
  { path: "/", title: "", description: "Forkwise is a chat assistant with its own computer. It answers, researches, remembers, and builds real websites, apps and reports you can see live.", priority: "1.0" },
  { path: "/product", title: "Product", description: "One chat that answers questions, researches the web, remembers you and builds real software on its own computer.", priority: "0.9" },
  { path: "/product/computer", title: "The computer", description: "Every Forkwise chat has a private Linux computer with live preview, a code editor, diffs and a terminal.", priority: "0.7" },
  { path: "/product/abilities", title: "Memory and abilities", description: "Forkwise remembers what matters to you and writes permanent tools for itself.", priority: "0.7" },
  { path: "/product/control", title: "Plan and control", description: "Choose Auto, Ask first or Plan, and undo anything with checkpoints.", priority: "0.7" },
  { path: "/pricing", title: "Pricing", description: "Start free. Upgrade when Forkwise becomes part of your work.", priority: "0.9" },
  { path: "/use-cases", title: "Use cases", description: "What people build with Forkwise: websites, data reports, automation and media edits.", priority: "0.7" },
  { path: "/templates", title: "Templates", description: "Ready prompts for websites, data, automation and media.", priority: "0.6" },
  { path: "/teams", title: "For teams", description: "Run Forkwise for your company on your own server, with your own models.", priority: "0.6" },
  { path: "/compare", title: "Compare", description: "How Forkwise differs from chat assistants and code editors.", priority: "0.6" },
  { path: "/docs", title: "Documentation", description: "Guides for every part of Forkwise.", priority: "0.8" },
  { path: "/blog", title: "Blog", description: "Product news, engineering notes and guides from the Forkwise team.", priority: "0.7" },
  { path: "/changelog", title: "Changelog", description: "Every Forkwise release and what changed.", priority: "0.5" },
  { path: "/faq", title: "FAQ", description: "Answers to common questions about Forkwise.", priority: "0.6" },
  { path: "/status", title: "Status", description: "Live health of the Forkwise platform.", priority: "0.4" },
  { path: "/about", title: "About", description: "Forkwise builds an AI engineer that does the work and shows it.", priority: "0.5" },
  { path: "/brand", title: "Brand", description: "The Forkwise logo, colors and typefaces.", priority: "0.3" },
  { path: "/contact", title: "Contact", description: "Talk to the Forkwise team.", priority: "0.5" },
  { path: "/security", title: "Security", description: "How Forkwise isolates your work and protects your data.", priority: "0.6" },
  { path: "/privacy", title: "Privacy policy", description: "How Forkwise handles your data.", priority: "0.3" },
  { path: "/terms", title: "Terms of service", description: "The terms for using Forkwise.", priority: "0.3" },
]

for (const item of catalog.USE_CASES) {
  pages.push({ path: "/use-cases/" + item.slug, title: item.title, description: item.short, priority: "0.6" })
}
for (const key of Object.keys(docs.DOCS)) {
  const item = docs.DOCS[key]
  pages.push({ path: "/docs/" + key, title: item.title + " — Docs", description: item.summary, priority: "0.6" })
}
for (const post of posts.POSTS) {
  pages.push({ path: "/blog/" + post.slug, title: post.title, description: post.summary, priority: "0.6", article: post })
}

const hidden = [
  { path: "/login", title: "Sign in" },
  { path: "/register", title: "Create your account" },
  { path: "/forgot", title: "Reset your password" },
]

function fontLinks() {
  const css = base.match(/href="(\/assets\/index-[^"]+\.css)"/)
  if (!css) return []
  const text = fs.readFileSync(path.join(dist, css[1].slice(1)), "utf8")
  const links = []
  for (const name of ["unbounded-latin-wght-normal", "onest-latin-wght-normal"]) {
    const found = text.match(new RegExp("/assets/" + name + "-[A-Za-z0-9_-]+\\.woff2"))
    if (found) links.push('<link rel="preload" as="font" type="font/woff2" href="' + found[0] + '" crossorigin />')
  }
  return links
}

const preloads = fontLinks()

function escape(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function jsonLd(page) {
  const list = []
  if (page.path === "/") {
    list.push({ "@context": "https://schema.org", "@type": "Organization", name: "Forkwise", url: site, logo: site + "/logo.svg" })
    list.push({ "@context": "https://schema.org", "@type": "WebSite", name: "Forkwise", url: site })
    list.push({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Forkwise", applicationCategory: "DeveloperApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } })
  }
  if (page.article) {
    list.push({ "@context": "https://schema.org", "@type": "Article", headline: page.article.title, description: page.article.summary, datePublished: new Date(page.article.date).toISOString().slice(0, 10), author: { "@type": "Organization", name: "Forkwise" }, mainEntityOfPage: site + page.path })
  }
  if (page.path === "/faq") {
    const questions = []
    for (const group of catalog.FAQ) {
      for (const row of group.items) {
        questions.push({ "@type": "Question", name: row[0], acceptedAnswer: { "@type": "Answer", text: row[1] } })
      }
    }
    list.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: questions })
  }
  return list.map((item) => '<script type="application/ld+json">' + JSON.stringify(item).replace(/</g, "\\u003c") + "</script>").join("\n    ")
}

function render(page, hide) {
  const title = page.title ? page.title + " — Forkwise" : "Forkwise — the AI engineer with its own computer"
  const url = site + (page.path === "/" ? "/" : page.path)
  let html = base
  html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + escape(title) + "</title>")
  if (page.description) {
    html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + escape(page.description) + '" />')
    html = html.replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + escape(page.description) + '" />')
  }
  html = html.replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + escape(title) + '" />')
  html = html.replace(/<meta property="og:image"[^>]*>/, '<meta property="og:image" content="' + site + '/og.png" />')
  const extra = preloads.concat([
    '<link rel="canonical" href="' + url + '" />',
    '<meta property="og:type" content="' + (page.article ? "article" : "website") + '" />',
    '<meta property="og:url" content="' + url + '" />',
    '<meta property="og:site_name" content="Forkwise" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + escape(title) + '" />',
    '<meta name="twitter:image" content="' + site + '/og.png" />',
  ])
  if (hide) extra.push('<meta name="robots" content="noindex, nofollow" />')
  const data = jsonLd(page)
  if (data) extra.push(data)
  html = html.replace("</head>", "    " + extra.join("\n    ") + "\n  </head>")
  const heading = page.title || "Forkwise"
  const noscript = "<noscript><h1>" + escape(heading) + "</h1><p>" + escape(page.description || "") + '</p><p><a href="/">Forkwise</a> needs JavaScript to run.</p></noscript>'
  html = html.replace('<div id="root"></div>', '<div id="root"></div>\n    ' + noscript)
  return html
}

function write(page, hide) {
  const folder = page.path === "/" ? dist : path.join(dist, page.path)
  fs.mkdirSync(folder, { recursive: true })
  fs.writeFileSync(path.join(folder, "index.html"), render(page, hide))
}

for (const page of pages) write(page, false)
for (const page of hidden) write({ path: page.path, title: page.title, description: "" }, true)

const today = new Date().toISOString().slice(0, 10)
const entries = pages.map((page) => "  <url><loc>" + site + (page.path === "/" ? "/" : page.path) + "</loc><lastmod>" + today + "</lastmod><priority>" + page.priority + "</priority></url>")
fs.writeFileSync(path.join(dist, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.join("\n") + "\n</urlset>\n")
fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /reset/\nDisallow: /verify\n\nSitemap: " + site + "/sitemap.xml\n")
console.log("SEO pages written: " + (pages.length + hidden.length))
