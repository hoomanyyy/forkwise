import { lazy, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import "./styles/base.css"
import "./styles/site.css"
import "./styles/app.css"
import { StoreProvider, useStore } from "./lib/store"
import { SiteLayout } from "./components/site/parts"
import { AppSkeleton, PageSkeleton } from "./components/ui/Skeleton"

function named(loader, name) {
  return lazy(() => loader().then((module) => ({ default: module[name] })))
}

const Home = lazy(() => import("./pages/site/Home"))
const Product = named(() => import("./pages/site/Product"), "Product")
const Computer = named(() => import("./pages/site/Product"), "Computer")
const Abilities = named(() => import("./pages/site/Product"), "Abilities")
const Control = named(() => import("./pages/site/Product"), "Control")
const Pricing = named(() => import("./pages/site/Solutions"), "Pricing")
const UseCases = named(() => import("./pages/site/Solutions"), "UseCases")
const UseCase = named(() => import("./pages/site/Solutions"), "UseCase")
const Templates = named(() => import("./pages/site/Solutions"), "Templates")
const Teams = named(() => import("./pages/site/Solutions"), "Teams")
const Compare = named(() => import("./pages/site/Solutions"), "Compare")
const Docs = named(() => import("./pages/site/Resources"), "Docs")
const DocPage = named(() => import("./pages/site/Resources"), "DocPage")
const Blog = named(() => import("./pages/site/Resources"), "Blog")
const BlogPost = named(() => import("./pages/site/Resources"), "BlogPost")
const Changelog = named(() => import("./pages/site/Resources"), "Changelog")
const Faq = named(() => import("./pages/site/Resources"), "Faq")
const Status = named(() => import("./pages/site/Resources"), "Status")
const About = named(() => import("./pages/site/Company"), "About")
const Brand = named(() => import("./pages/site/Company"), "Brand")
const Contact = named(() => import("./pages/site/Company"), "Contact")
const Security = named(() => import("./pages/site/Company"), "Security")
const Legal = named(() => import("./pages/site/Company"), "Legal")
const NotFound = named(() => import("./pages/site/Company"), "NotFound")
const Login = named(() => import("./pages/auth/Auth"), "Login")
const Register = named(() => import("./pages/auth/Auth"), "Register")
const Verify = named(() => import("./pages/auth/Auth"), "Verify")
const Forgot = named(() => import("./pages/auth/Auth"), "Forgot")
const Reset = named(() => import("./pages/auth/Auth"), "Reset")
const AppShell = lazy(() => import("./pages/app/AppShell"))
const AppHome = lazy(() => import("./pages/app/Home"))
const Chat = lazy(() => import("./pages/app/Chat"))
const Settings = lazy(() => import("./pages/app/Settings"))
const Projects = named(() => import("./pages/app/Projects"), "Projects")
const Project = named(() => import("./pages/app/Projects"), "Project")
const Billing = named(() => import("./pages/app/More"), "Billing")
const Admin = named(() => import("./pages/app/More"), "Admin")
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
          <Route path="/product/computer" element={<Page><Computer /></Page>} />
          <Route path="/product/abilities" element={<Page><Abilities /></Page>} />
          <Route path="/product/control" element={<Page><Control /></Page>} />
          <Route path="/pricing" element={<Page><Pricing /></Page>} />
          <Route path="/use-cases" element={<Page><UseCases /></Page>} />
          <Route path="/use-cases/:slug" element={<Page><UseCase /></Page>} />
          <Route path="/templates" element={<Page><Templates /></Page>} />
          <Route path="/teams" element={<Page><Teams /></Page>} />
          <Route path="/compare" element={<Page><Compare /></Page>} />
          <Route path="/docs" element={<Page><Docs /></Page>} />
          <Route path="/docs/:slug" element={<Page><DocPage /></Page>} />
          <Route path="/blog" element={<Page><Blog /></Page>} />
          <Route path="/blog/:slug" element={<Page><BlogPost /></Page>} />
          <Route path="/changelog" element={<Page><Changelog /></Page>} />
          <Route path="/faq" element={<Page><Faq /></Page>} />
          <Route path="/status" element={<Page><Status /></Page>} />
          <Route path="/about" element={<Page><About /></Page>} />
          <Route path="/brand" element={<Page><Brand /></Page>} />
          <Route path="/contact" element={<Page><Contact /></Page>} />
          <Route path="/security" element={<Page><Security /></Page>} />
          <Route path="/privacy" element={<Page><Legal kind="privacy" /></Page>} />
          <Route path="/terms" element={<Page><Legal kind="terms" /></Page>} />
          <Route path="*" element={<Page><NotFound /></Page>} />
        </Route>
        <Route path="/login" element={<Bare><Login /></Bare>} />
        <Route path="/register" element={<Bare><Register /></Bare>} />
        <Route path="/verify" element={<Bare><Verify /></Bare>} />
        <Route path="/forgot" element={<Bare><Forgot /></Bare>} />
        <Route path="/reset/:token" element={<Bare><Reset /></Bare>} />
        <Route path="/app" element={<Suspense fallback={<AppSkeleton />}><AppShell /></Suspense>}>
          <Route index element={<InApp><AppHome /></InApp>} />
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
    <App />
  </StoreProvider>
)
