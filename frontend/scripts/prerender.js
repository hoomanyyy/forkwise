const http = require("http")
const fs = require("fs")
const path = require("path")
const puppeteer = require("puppeteer")

const BUILD = path.join(__dirname, "..", "build")
const PORT = 4567

const pages = [
    { url: "/", file: "index.html" },
    { url: "/how-it-works", file: "how-it-works.html" },
    { url: "/about", file: "about.html" },
    { url: "/faq", file: "faq.html" },
    { url: "/contact", file: "contact.html" },
    { url: "/privacy", file: "privacy.html" },
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
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] })
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
        fs.writeFileSync(path.join(BUILD, p.file), html)
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