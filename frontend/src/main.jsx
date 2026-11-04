import { lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import "./styles/base.css"
import "./styles/site.css"
import "./styles/app.css"
import "./styles/polish.css"
import "./styles/flat.css"
import { StoreProvider, useStore } from "./lib/store"
import { ConfirmProvider } from "./components/ui/Modal"
import { SiteLayout } from "./components/site/parts"
import { AppSkeleton, PageSkeleton } from "./components/ui/Skeleton"

function named(loader, name) {
  return lazy(() => loader().then((module) => ({ default: module[name] })))
}

const Home = lazy(() => import("./pages/site/Home"))
const Product = named(() => import("./pages/site/Product"), "Product")
const Download = named(() => import("./pages/site/Product"), "Download")
const Pricing = named(() => import("./pages/site/Solutions"), "Pricing")
const Docs = named(() => import("./pages/site/Resources"), "Docs")
const DocPage = named(() => import("./pages/site/Resources"), "DocPage")
const Blog = named(() => import("./pages/site/Resources"), "Blog")
const BlogPost = named(() => import("./pages/site/Resources"), "BlogPost")
const Changelog = named(() => import("./pages/site/Resources"), "Changelog")
const Contact = named(() => import("./pages/site/Company"), "Contact")
const Security = named(() => import("./pages/site/Company"), "Security")
const Legal = named(() => import("./pages/site/Company"), "Legal")
const NotFound = named(() => import("./pages/site/Company"), "NotFound")
const Login = named(() => import("./pages/auth/Auth"), "Login")
const Register = named(() => import("./pages/auth/Auth"), "Register")
const Verify = named(() => import("./pages/auth/Auth"), "Verify")
const Forgot = named(() => import("./pages/auth/Auth"), "Forgot")
const Reset = named(() => import("./pages/auth/Auth"), "Reset")
const Welcome = named(() => import("./pages/auth/Auth"), "Welcome")
const AppShell = lazy(() => import("./pages/app/AppShell"))
const AppHome = lazy(() => import("./pages/app/Home"))
const Chat = lazy(() => import("./pages/app/Chat"))
const Settings = lazy(() => import("./pages/app/Settings"))
const Projects = named(() => import("./pages/app/Projects"), "Projects")
const Project = named(() => import("./pages/app/Projects"), "Project")
const Billing = named(() => import("./pages/app/More"), "Billing")
const Customize = lazy(() => import("./pages/app/Customize"))
const Admin = named(() => import("./pages/app/Admin"), "Admin")
const AppTemplates = named(() => import("./pages/app/More"), "AppTemplates")

function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" role="status">
      {toasts.map((item) => <div key={item.id} className={"toast " + item.kind}>{item.text}</div>)}
    </div>
  )
}

function Page({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

function Bare({ children }) {
  return <Suspense fallback={<div className="auth-loading" />}>{children}</Suspense>
}

function InApp({ children }) {
  return <Suspense fallback={<div className="app-pane-loading"><span className="skel w30 h24" /><span className="skel block h320" /></div>}>{children}</Suspense>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/product" element={<Page><Product /></Page>} />
          <Route path="/download" element={<Page><Download /></Page>} />
          <Route path="/pricing" element={<Page><Pricing /></Page>} />
          <Route path="/docs" element={<Page><Docs /></Page>} />
          <Route path="/docs/:slug" element={<Page><DocPage /></Page>} />
          <Route path="/blog" element={<Page><Blog /></Page>} />
          <Route path="/blog/:slug" element={<Page><BlogPost /></Page>} />
          <Route path="/changelog" element={<Page><Changelog /></Page>} />
          <Route path="/contact" element={<Page><Contact /></Page>} />
          <Route path="/security" element={<Page><Security /></Page>} />
          <Route path="/privacy" element={<Page><Legal kind="privacy" /></Page>} />
          <Route path="/terms" element={<Page><Legal kind="terms" /></Page>} />
          <Route path="/product/computer" element={<Navigate to="/download" replace />} />
          <Route path="/product/abilities" element={<Navigate to="/product" replace />} />
          <Route path="/product/control" element={<Navigate to="/product" replace />} />
          <Route path="/use-cases" element={<Navigate to="/product" replace />} />
          <Route path="/use-cases/:slug" element={<Navigate to="/product" replace />} />
          <Route path="/templates" element={<Navigate to="/product" replace />} />
          <Route path="/teams" element={<Navigate to="/pricing" replace />} />
          <Route path="/compare" element={<Navigate to="/product" replace />} />
          <Route path="/faq" element={<Navigate to="/pricing" replace />} />
          <Route path="/status" element={<Navigate to="/" replace />} />
          <Route path="/about" element={<Navigate to="/contact" replace />} />
          <Route path="/brand" element={<Navigate to="/contact" replace />} />
          <Route path="*" element={<Page><NotFound /></Page>} />
        </Route>
        <Route path="/login" element={<Bare><Login /></Bare>} />
        <Route path="/register" element={<Bare><Register /></Bare>} />
        <Route path="/verify" element={<Bare><Verify /></Bare>} />
        <Route path="/forgot" element={<Bare><Forgot /></Bare>} />
        <Route path="/reset/:token" element={<Bare><Reset /></Bare>} />
        <Route path="/welcome" element={<Bare><Welcome /></Bare>} />
        <Route path="/app" element={<Suspense fallback={<AppSkeleton />}><AppShell /></Suspense>}>
          <Route index element={<InApp><AppHome kind="chat" /></InApp>} />
          <Route path="code" element={<InApp><AppHome kind="code" /></InApp>} />
          <Route path="design" element={<InApp><AppHome kind="design" /></InApp>} />
          <Route path="customize" element={<InApp><Customize /></InApp>} />
          <Route path="customize/:tab" element={<InApp><Customize /></InApp>} />
          <Route path="c/:chatId" element={<InApp><Chat /></InApp>} />
          <Route path="templates" element={<InApp><AppTemplates /></InApp>} />
          <Route path="projects" element={<InApp><Projects /></InApp>} />
          <Route path="projects/:projectId" element={<InApp><Project /></InApp>} />
          <Route path="settings" element={<InApp><Settings /></InApp>} />
          <Route path="settings/:tab" element={<InApp><Settings /></InApp>} />
          <Route path="billing" element={<InApp><Billing /></InApp>} />
          <Route path="admin" element={<InApp><Admin /></InApp>} />
        </Route>
      </Routes>
      <Toasts />
    </BrowserRouter>
  )
}

createRoot(document.getElementById("root")).render(
  <StoreProvider>
  <ConfirmProvider>
    <App />
  </ConfirmProvider>
  </StoreProvider>
)
