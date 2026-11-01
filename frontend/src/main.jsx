import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import "./styles/base.css"
import "./styles/site.css"
import "./styles/app.css"
import "highlight.js/styles/github-dark.css"
import { StoreProvider, useStore } from "./lib/store"
import { SiteLayout } from "./components/site/parts"
import Home from "./pages/site/Home"
import { Product, Computer, Abilities, Control } from "./pages/site/Product"
import { Pricing, UseCases, UseCase, Templates, Teams, Compare } from "./pages/site/Solutions"
import { Docs, DocPage, Blog, BlogPost, Changelog, Faq, Status } from "./pages/site/Resources"
import { About, Brand, Contact, Security, Legal, NotFound } from "./pages/site/Company"
import { Login, Register, Forgot, Reset } from "./pages/auth/Auth"
import AppShell from "./pages/app/AppShell"
import AppHome from "./pages/app/Home"
import Chat from "./pages/app/Chat"
import Settings from "./pages/app/Settings"
import { Projects, Project } from "./pages/app/Projects"
import { Billing, Admin, AppTemplates } from "./pages/app/More"

function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" role="status">
      {toasts.map((item) => <div key={item.id} className={"toast " + item.kind}>{item.text}</div>)}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<Product />} />
          <Route path="/product/computer" element={<Computer />} />
          <Route path="/product/abilities" element={<Abilities />} />
          <Route path="/product/control" element={<Control />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/use-cases/:slug" element={<UseCase />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:slug" element={<DocPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/status" element={<Status />} />
          <Route path="/about" element={<About />} />
          <Route path="/brand" element={<Brand />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/security" element={<Security />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset/:token" element={<Reset />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<AppHome />} />
          <Route path="c/:chatId" element={<Chat />} />
          <Route path="templates" element={<AppTemplates />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<Project />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/:tab" element={<Settings />} />
          <Route path="billing" element={<Billing />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
      <Toasts />
    </BrowserRouter>
  )
}

createRoot(document.getElementById("root")).render(
  <StoreProvider>
    <App />
  </StoreProvider>
)
