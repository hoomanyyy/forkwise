import React, { useState, useEffect, useRef } from "react"
import { getSavedUser, getToken, getMe, getHistory, clearLogin } from "./api"
import { setupNative, onBackButton, exitApp, onResume } from "./native"
import { BottomNav } from "./components/Parts"
import { WelcomePage, LoginPage, RegisterPage, ForgotPage } from "./pages/AuthPages"
import HomePage from "./pages/HomePage"
import NewPage from "./pages/NewPage"
import HistoryPage from "./pages/HistoryPage"
import ResultPage from "./pages/ResultPage"
import ProfilePage from "./pages/ProfilePage"
import AssistantPage, { ChatScreen } from "./pages/AssistantPage"
import { PlansPage, BillingPage } from "./pages/PlansPage"
import "./styles/App.css"

export default function App() {
    const [user, setUser] = useState(getToken() ? getSavedUser() : null)
    const [authScreen, setAuthScreen] = useState("welcome")
    const [tab, setTab] = useState("home")
    const [openRun, setOpenRun] = useState(null)
    const [usage, setUsage] = useState(null)
    const [runs, setRuns] = useState([])
    const [loading, setLoading] = useState(false)
    const [example, setExample] = useState(0)
    const [running, setRunning] = useState(false)
    const [chatRun, setChatRun] = useState(null)
    const [screen, setScreen] = useState("")

    const state = useRef({})
    state.current = { user, authScreen, tab, openRun, running, chatRun, screen }

    useEffect(() => {
        setupNative()

        function handleLogout() {
            setUser(null)
            setAuthScreen("login")
            setOpenRun(null)
            setChatRun(null)
            setScreen("")
            setTab("home")
        }
        window.addEventListener("forkwise-logout", handleLogout)
        const removeResume = onResume(() => {
            if (state.current.user) {
                refreshUsage()
            }
        })

        const removeBack = onBackButton(() => {
            const s = state.current
            if (s.running) {
                return
            }
            if (!s.user) {
                if (s.authScreen === "forgot") {
                    setAuthScreen("login")
                } else if (s.authScreen !== "welcome") {
                    setAuthScreen("welcome")
                } else {
                    exitApp()
                }
                return
            }
            if (s.chatRun) {
                setChatRun(null)
                return
            }
            if (s.screen === "billing") {
                setScreen("plans")
                return
            }
            if (s.screen !== "") {
                setScreen("")
                return
            }
            if (s.openRun) {
                setOpenRun(null)
                return
            }
            if (s.tab !== "home") {
                setTab("home")
                return
            }
            exitApp()
        })

        return () => {
            window.removeEventListener("forkwise-logout", handleLogout)
            removeBack()
            removeResume()
        }
    }, [])

    useEffect(() => {
        if (user) {
            refreshAll()
        }
    }, [user])

    async function refreshUsage() {
        const me = await getMe()
        if (me.Message === true) {
            setUsage(me.usage)
        }
    }

    async function refreshRuns() {
        setLoading(true)
        const result = await getHistory()
        setLoading(false)
        if (result.Message === true) {
            setRuns(result.data || [])
        }
    }

    function refreshAll() {
        refreshUsage()
        refreshRuns()
    }

    function changeTab(next) {
        setOpenRun(null)
        setChatRun(null)
        setScreen("")
        setTab(next)
        if (next === "history" || next === "home" || next === "assistant") {
            refreshRuns()
        }
        if (next === "home" || next === "new" || next === "profile") {
            refreshUsage()
        }
    }

    function logout() {
        clearLogin()
        setUser(null)
        setRuns([])
        setUsage(null)
        setAuthScreen("welcome")
        setTab("home")
        setOpenRun(null)
        setChatRun(null)
        setScreen("")
    }

    if (!user) {
        return (
            <div className="AppShell">
                {authScreen === "welcome" && <WelcomePage onLogin={() => setAuthScreen("login")} onRegister={() => setAuthScreen("register")} />}
                {authScreen === "login" && <LoginPage onBack={() => setAuthScreen("welcome")} onDone={setUser} onRegister={() => setAuthScreen("register")} onForgot={() => setAuthScreen("forgot")} />}
                {authScreen === "register" && <RegisterPage onBack={() => setAuthScreen("welcome")} onDone={setUser} onLogin={() => setAuthScreen("login")} />}
                {authScreen === "forgot" && <ForgotPage onBack={() => setAuthScreen("login")} onDone={setUser} onLogin={() => setAuthScreen("login")} />}
            </div>
        )
    }

    let content = null
    if (chatRun) {
        content = <ChatScreen key={chatRun.id} run={chatRun} onBack={() => setChatRun(null)} onOpenResult={(id) => { setChatRun(null); setOpenRun(id) }} />
    } else if (screen === "plans") {
        content = <PlansPage usage={usage} onBack={() => { setScreen(""); refreshUsage() }} onBilling={() => setScreen("billing")} />
    } else if (screen === "billing") {
        content = <BillingPage usage={usage} onBack={() => setScreen("plans")} onPlans={() => setScreen("plans")} />
    } else if (openRun) {
        content = <ResultPage key={openRun} runId={openRun} onBack={() => { setOpenRun(null); refreshRuns() }} onAsk={(run) => setChatRun(run)} />
    } else {
        content = (
            <>
                {tab === "home" && (
                    <HomePage
                        user={user}
                        usage={usage}
                        runs={runs}
                        loading={loading}
                        onNew={() => changeTab("new")}
                        onExample={() => { setExample(Date.now()); changeTab("new") }}
                        onOpenRun={setOpenRun}
                        onSeeAll={() => changeTab("history")}
                        onProfile={() => changeTab("profile")}
                        onAssistant={() => changeTab("assistant")}
                        onPlans={() => setScreen("plans")}
                    />
                )}
                {tab === "new" && (
                    <NewPage
                        usage={usage}
                        example={example}
                        onExampleUsed={() => setExample(0)}
                        onUsageChange={refreshUsage}
                        onRunningChange={setRunning}
                        onFinished={(id) => { refreshRuns(); setOpenRun(id) }}
                    />
                )}
                {tab === "history" && <HistoryPage runs={runs} loading={loading} onRefresh={refreshRuns} onOpenRun={setOpenRun} />}
                {tab === "assistant" && <AssistantPage runs={runs} loading={loading} onOpenChat={setChatRun} />}
                {tab === "profile" && <ProfilePage user={user} usage={usage} onLogout={logout} onPlans={() => setScreen("plans")} onBilling={() => setScreen("billing")} />}
            </>
        )
    }

    const showNav = !openRun && !running && !chatRun && screen === ""

    return (
        <div className="AppShell">
            {content}
            {showNav && <BottomNav tab={tab} onChange={changeTab} />}
        </div>
    )
}
