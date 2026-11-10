import fs from "node:fs"
import path from "node:path"
import { SEO, SITE_URL, fullTitle } from "./src/content/seo.js"
import { DOCS, DOC_GROUPS } from "./src/content/docs.js"
import { POSTS } from "./src/content/posts.js"

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function allPages() {
  const pages = []
  Object.keys(SEO).forEach(function (route) {
    pages.push({ route: route, title: SEO[route].title, description: SEO[route].description, h1: SEO[route].h1 })
  })
  DOC_GROUPS.forEach(function (group) {
    group.slugs.forEach(function (slug) {
      const doc = DOCS[slug]
      if (doc) pages.push({ route: "/docs/" + slug, title: doc.title + " · Forkwise Docs", description: doc.summary, h1: doc.title })
    })
  })
  POSTS.forEach(function (post) {
    pages.push({ route: "/blog/" + post.slug, title: post.title + " · Forkwise Blog", description: post.summary, h1: post.title, article: post })
  })
  return pages
}

const LINKS = [
  ["/", "Home"],
  ["/product", "Product"],
  ["/use-cases", "Use cases"],
  ["/pricing", "Pricing"],
  ["/developers", "API"],
  ["/download", "Download"],
  ["/docs", "Docs"],
  ["/blog", "Blog"],
  ["/register", "Get started free"],
]

function fallback(page) {
  let links = ""
  LINKS.forEach(function (item) {
    links += '<a href="' + item[0] + '" style="color:#5c5b56;margin:0 10px">' + escapeHtml(item[1]) + "</a>"
  })
  return '<div style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:96px 24px;text-align:center;color:#1c1c1a">' +
    "<h1 style=\"font-size:40px;line-height:1.1;margin:0 0 16px\">" + escapeHtml(page.h1) + "</h1>" +
    '<p style="font-size:18px;color:#5c5b56;line-height:1.6;margin:0 0 28px">' + escapeHtml(page.description) + "</p>" +
    "<nav>" + links + "</nav></div>"
}

function render(template, page) {
  const url = SITE_URL + (page.route === "/" ? "/" : page.route)
  const title = escapeHtml(fullTitle(page.title))
  const description = escapeHtml(page.description)
  let html = template
  html = html.replace(/<title>[^<]*<\/title>/, "<title>" + title + "</title>")
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, "$1" + description + "$2")
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, "$1" + url + "$2")
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, "$1" + title + "$2")
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, "$1" + description + "$2")
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, "$1" + url + "$2")
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, "$1" + title + "$2")
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, "$1" + description + "$2")
  if (page.article) {
    html = html.replace(/(<meta property="og:type" content=")[^"]*(")/, "$1article$2")
  }
  if (page.route === "/login" || page.route === "/register") {
    html = html.replace("</head>", '    <meta name="robots" content="noindex, follow" />\n  </head>')
  }
  html = html.replace('<div id="root"></div>', '<div id="root">' + fallback(page) + "</div>")
  return html
}

function sitemap(pages) {
  const today = new Date().toISOString().slice(0, 10)
  let body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  pages.forEach(function (page) {
    if (page.route === "/login" || page.route === "/register") return
    const priority = page.route === "/" ? "1.0" : page.route.split("/").length > 2 ? "0.6" : "0.8"
    body += "  <url><loc>" + SITE_URL + page.route + "</loc><lastmod>" + today + "</lastmod><priority>" + priority + "</priority></url>\n"
  })
  return body + "</urlset>\n"
}

export default function seoPlugin() {
  let outDir = "dist"
  return {
    name: "forkwise-seo",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const indexFile = path.join(outDir, "index.html")
      if (!fs.existsSync(indexFile)) return
      const template = fs.readFileSync(indexFile, "utf8")
      fs.writeFileSync(path.join(outDir, "shell.html"), template)
      const pages = allPages()
      pages.forEach(function (page) {
        const html = render(template, page)
        if (page.route === "/") {
          fs.writeFileSync(indexFile, html)
          return
        }
        const folder = path.join(outDir, page.route)
        fs.mkdirSync(folder, { recursive: true })
        fs.writeFileSync(path.join(folder, "index.html"), html)
      })
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap(pages))
    },
  }
}
