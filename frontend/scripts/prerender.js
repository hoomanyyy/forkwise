const http = require("http")
const fs = require("fs")
const path = require("path")
const puppeteer = require("puppeteer")

const BUILD = path.join(__dirname, "..", "build")
const PORT = 4567

const pages = [
    { url: "/", file: "index.html" },
    { url: "/product", file: "product.html" },
    { url: "/product/assistant", file: "product/assistant.html" },
    { url: "/product/results", file: "product/results.html" },
    { url: "/use-cases", file: "use-cases.html" },
    { url: "/compare", file: "compare.html" },
    { url: "/pricing", file: "pricing.html" },
    { url: "/docs", file: "docs.html" },
    { url: "/changelog", file: "changelog.html" },
    { url: "/status", file: "status.html" },
    { url: "/security", file: "security.html" },
    { url: "/research", file: "research.html" },
    { url: "/glossary", file: "glossary.html" },
    { url: "/about", file: "about.html" },
    { url: "/how-it-works", file: "how-it-works.html" },
    { url: "/faq", file: "faq.html" },
    { url: "/contact", file: "contact.html" },
    { url: "/privacy", file: "privacy.html" },
    { url: "/download", file: "download.html" },
    { url: "/learn", file: "learn.html" },
    { url: "/learn/multiverse-analysis", file: "learn/multiverse-analysis.html" },
    { url: "/learn/specification-curve", file: "learn/specification-curve.html" },
    { url: "/examples/coffee-and-heart-risk", file: "examples/coffee-and-heart-risk.html" },
    { url: "/solutions/students", file: "solutions/students.html" },
    { url: "/solutions/researchers", file: "solutions/researchers.html" },
    { url: "/solutions/journalists", file: "solutions/journalists.html" },
    { url: "/solutions/business", file: "solutions/business.html" },
    { url: "/docs/quickstart", file: "docs/quickstart.html" },
    { url: "/docs/preparing-data", file: "docs/preparing-data.html" },
    { url: "/docs/writing-questions", file: "docs/writing-questions.html" },
    { url: "/docs/verdicts", file: "docs/verdicts.html" },
    { url: "/docs/reading-results", file: "docs/reading-results.html" },
    { url: "/docs/analysts", file: "docs/analysts.html" },
    { url: "/docs/statistics", file: "docs/statistics.html" },
    { url: "/docs/assistant", file: "docs/assistant.html" },
    { url: "/docs/export", file: "docs/export.html" },
    { url: "/docs/plans-limits", file: "docs/plans-limits.html" },
    { url: "/docs/account", file: "docs/account.html" },
    { url: "/docs/android", file: "docs/android.html" },
    { url: "/docs/limitations", file: "docs/limitations.html" },
    { url: "/page-that-does-not-exist", file: "404.html" }
]

function contentType(file) {
    if (file.endsWith(".html")) return "text/html"
    if (file.endsWith(".js")) return "application/javascript"
    if (file.endsWith(".css")) return "text/css"
    if (file.endsWith(".png")) return "image/png"
    if (file.endsWith(".svg")) return "image/svg+xml"
    if (file.endsWith(".ico")) return "image/x-icon"
    if (file.endsWith(".json")) return "application/json"
    if (file.endsWith(".csv")) return "text/csv"
    if (file.endsWith(".apk")) return "application/vnd.android.package-archive"
    return "text/plain"
}

const shell = fs.readFileSync(path.join(BUILD, "index.html"), "utf8")
fs.writeFileSync(path.join(BUILD, "app.html"), shell)

const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split("?")[0])
    const file = path.join(BUILD, clean)
    if (clean !== "/" && file.startsWith(BUILD) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { "Content-Type": contentType(file) })
        res.end(fs.readFileSync(file))
    } else {
        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(shell)
    }
})

async function run() {
    await new Promise((resolve) => server.listen(PORT, resolve))

    let browser
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox"],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        })
    } catch (e) {
        server.close()
        if (process.env.PRERENDER_REQUIRED === "true") {
            throw e
        }
        fs.writeFileSync(path.join(BUILD, "404.html"), shell)
        console.log("Chrome is not available, so pages were not prerendered. The site still works as a normal React app.")
        return
    }
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    for (const p of pages) {
        await page.goto("http://localhost:" + PORT + p.url, { waitUntil: "networkidle0", timeout: 30000 })
        await page.waitForSelector("#root > *", { timeout: 10000 })
        let html = await page.content()
        html = html.replace("<html lang=\"en\">", "<html lang=\"en\" data-prerendered=\"true\">")
        const start = html.indexOf("<noscript>")
        const end = html.indexOf("</noscript>")
        if (start !== -1 && end !== -1) {
            html = html.slice(0, start) + html.slice(end + "</noscript>".length)
        }
        const target = path.join(BUILD, p.file)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, html)
        console.log("prerendered", p.url, "->", p.file)
    }

    await browser.close()
    server.close()
}

run().catch((e) => {
    console.error("Prerender failed:", e)
    server.close()
    process.exit(1)
})