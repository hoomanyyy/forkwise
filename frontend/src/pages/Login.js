import React, { useEffect, useState } from "react"
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa"
import { Link, useNavigate } from "react-router-dom"
import Seo from "../components/Seo"
import AuthLayout from "../components/site/AuthLayout"
import { sendLoginRequest, sendAuthRequestWithWebsocket } from "../api"

export default function Login() {
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [sending, setSending] = useState(false)

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (data) => {
            if (data.Message === true) {
                navigate("/dashboard")
            }
        })
    }, [navigate])

    function HandleSubmit(e) {
        e.preventDefault()
        setError("")
        if (username.trim() === "" || password === "") {
            setError("Please write your username and password.")
            return
        }
        const data = {
            username: username.trim(),
            password: password
        }
        setSending(true)
        sendLoginRequest(data, (res) => {
            setSending(false)
            if (res.Message === true) {
                navigate("/dashboard")
            } else if (res.Error === true) {
                setError("Could not connect to the server. Please try again.")
            } else {
                setError("Username or password is wrong.")
            }
        })
    }

    return (
        <AuthLayout
            title="Welcome back. Your analysts are ready."
            points={["See all your past runs and verdicts", "Chat with any finished analysis", "Start a new analysis in a minute"]}
        >
            <Seo title="Log in | Forkwise" noindex />
            <form className="au-form" onSubmit={HandleSubmit} noValidate>
                <h1>Log in to Forkwise</h1>
                <p>Use your email or username.</p>

                <label className="fw-field">
                    <span className="fw-label">Email or username</span>
                    <div className="fw-input-icon">
                        <FaUser />
                        <input className="fw-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="sara_data" autoComplete="username" autoFocus />
                    </div>
                </label>

                <label className="fw-field">
                    <span className="fw-label">Password</span>
                    <div className="fw-input-icon">
                        <FaLock />
                        <input className="fw-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                </label>

                <div className="au-forgot">
                    <Link to="/forgot-password">Forgot your password?</Link>
                </div>

                {error !== "" && <div className="fw-alert fw-alert-error">{error}</div>}

                <button type="submit" className="fw-btn fw-btn-primary fw-btn-lg fw-btn-block" disabled={sending}>
                    {sending ? "Logging in..." : "Log in"}
                </button>

                <p className="au-foot">
                    Don't have an account? <Link to="/register">Create one for free</Link>
                </p>
            </form>
        </AuthLayout>
    )
}
