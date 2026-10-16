import React, { useState, useEffect, useRef } from "react"
import { getSavedUser, getToken, getMe, getHistory, clearLogin } from "./api"
import { setupNative, onBackButton, exitApp } from "./native"
import { BottomNav } from "./components/Parts"
import { WelcomePage, LoginPage, RegisterPage } from "./pages/AuthPages"
import HomePage from "./pages/HomePage"
import NewPage from "./pages/NewPage"
import HistoryPage from "./pages/HistoryPage"
import ResultPage from "./pages/ResultPage"
import ProfilePage from "./pages/ProfilePage"
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

    const state = useRef({})
    state.current = { user, authScreen, tab, openRun, running }

    useEffect(() => {
        setupNative()

        function handleLogout() {
            setUser(null)
            setAuthScreen("login")
            setOpenRun(null)
            setTab("home")
        }
        window.addEventListener("forkwise-logout", handleLogout)

        const removeBack = onBackButton(() => {
            const s = state.current
            if (s.running) {
                return
            }
            if (!s.user) {
                if (s.authScreen !== "welcome") {
                    setAuthScreen("welcome")
                } else {
                    exitApp()
                }
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
            setUser((old) => (old ? { ...old, ...me.user } : old))
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
        setTab(next)
        if (next === "history" || next === "home") {
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
    }

    if (!user) {
        return (
            <div className="AppShell">
                {authScreen === "welcome" && <WelcomePage onLogin={() => setAuthScreen("login")} onRegister={() => setAuthScreen("register")} />}
                {authScreen === "login" && <LoginPage onBack={() => setAuthScreen("welcome")} onDone={setUser} onRegister={() => setAuthScreen("register")} />}
                {authScreen === "register" && <RegisterPage onBack={() => setAuthScreen("welcome")} onDone={setUser} onLogin={() => setAuthScreen("login")} />}
            </div>
        )
    }

    return (
        <div className="AppShell">
            {openRun ? (
                <ResultPage key={openRun} runId={openRun} onBack={() => { setOpenRun(null); refreshRuns() }} />
            ) : (
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
                    {tab === "profile" && <ProfilePage user={user} usage={usage} onLogout={logout} />}
                </>
            )}
            {!openRun && !running && <BottomNav tab={tab} onChange={changeTab} />}
        </div>
    )
}
