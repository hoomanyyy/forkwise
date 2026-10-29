import React, { useState, useEffect } from "react"
import { FaEnvelope, FaUser, FaLock, FaShieldAlt, FaEye, FaEyeSlash } from "react-icons/fa"
import { Link, useNavigate } from "react-router-dom"
import Seo from "../components/Seo"
import AuthLayout from "../components/site/AuthLayout"
import { sendAuthRequestWithWebsocket } from "../api"

export default function Register() {
    const navigate = useNavigate()
    const [name, setName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [sending, setSending] = useState(false)
    const [code, setCode] = useState("")
    const [codeSending, setCodeSending] = useState(false)
    const [codeWait, setCodeWait] = useState(0)

    let strength = "Too short"
    let strengthColor = "var(--red)"
    let strengthWidth = 25
    if (password.length >= 8) {
        strength = "OK"
        strengthColor = "var(--amber)"
        strengthWidth = 60
    }
    if (password.length >= 12) {
        strength = "Strong"
        strengthColor = "var(--green)"
        strengthWidth = 100
    }

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (data) => {
            if (data.Message === true) {
                navigate("/dashboard")
            }
        })
    }, [navigate])

    useEffect(() => {
        if (codeWait <= 0) {
            return
        }
        const timer = setTimeout(() => setCodeWait(codeWait - 1), 1000)
        return () => clearTimeout(timer)
    }, [codeWait])

    function SendCode() {
        setError("")
        setSuccess("")
        if (!email.includes("@") || !email.includes(".")) {
            setError("Please write your email first.")
            return
        }
        setCodeSending(true)
        sendAuthRequestWithWebsocket({ type: "send_otp_code", email: email.trim() }, (result) => {
            setCodeSending(false)
            if (result.Message === true) {
                setSuccess("We sent an 8 digit code to your email.")
                setCodeWait(60)
            } else if (result.Error === true) {
                setError("Could not connect to the server. Please try again.")
            } else {
                setError(result.error || "Could not send the code. Please try again.")
            }
        })
    }

    function HandleSubmit(e) {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (name.trim() === "" || lastName.trim() === "" || email.trim() === "" || username.trim() === "" || password === "") {
            setError("Please fill in every field.")
            return
        }
        if (!email.includes("@") || !email.includes(".")) {
            setError("Please write a real email address.")
            return
        }
        if (password.length < 8) {
            setError("Your password needs at least 8 characters.")
            return
        }
        if (code.trim().length !== 8) {
            setError("Please write the 8 digit code from your email.")
            return
        }

        const data = {
            type: "register",
            username: username.trim(),
            password: password,
            email: email.trim(),
            name: name.trim(),
            lastname: lastName.trim(),
            otp_code: code.trim()
        }

        setSending(true)
        sendAuthRequestWithWebsocket(data, (result) => {
            setSending(false)
            if (result.Message === true) {
                setSuccess("Account created. Taking you to log in...")
                setTimeout(() => navigate("/auth/login"), 1500)
            } else if (result.Error === true) {
                setError("Could not connect to the server. Please try again.")
            } else {
                setError(result.error || "Could not create the account. This username or email may already be used.")
            }
        })
    }

    return (
        <AuthLayout
            title="Find out how strong your findings really are."
            points={["Many AI analysts study the same question", "Python does every calculation", "A clear verdict with charts you can share", "Free plan, no card needed"]}
        >
            <Seo title="Create an account | Forkwise" noindex />
            <form className="au-form" onSubmit={HandleSubmit} noValidate>
                <h1>Create your free account</h1>
                <p>It takes less than a minute.</p>

                <div className="au-row">
                    <label className="fw-field">
                        <span className="fw-label">First name</span>
                        <input className="fw-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Max" autoComplete="given-name" />
                    </label>
                    <label className="fw-field">
                        <span className="fw-label">Last name</span>
                        <input className="fw-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Arleston" autoComplete="family-name" />
                    </label>
                </div>

                <label className="fw-field">
                    <span className="fw-label">Email</span>
                    <div className="fw-input-icon">
                        <FaEnvelope />
                        <input className="fw-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@example.com" autoComplete="email" />
                    </div>
                </label>

                <div className="fw-field">
                    <span className="fw-label">Verification code</span>
                    <div className="au-code">
                        <div className="fw-input-icon">
                            <FaShieldAlt />
                            <input className="fw-input" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} placeholder="8 digit code" inputMode="numeric" maxLength={8} autoComplete="one-time-code" aria-label="Verification code" />
                        </div>
                        <button type="button" className="fw-btn fw-btn-ghost" style={{ height: "auto" }} onClick={SendCode} disabled={codeSending || codeWait > 0}>
                            {codeSending ? "Sending..." : codeWait > 0 ? "Again in " + codeWait + "s" : "Send code"}
                        </button>
                    </div>
                </div>

                <label className="fw-field">
                    <span className="fw-label">Username</span>
                    <div className="fw-input-icon">
                        <FaUser />
                        <input className="fw-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="max_arleston" autoComplete="username" />
                    </div>
                </label>

                <label className="fw-field">
                    <span className="fw-label">Password</span>
                    <div className="fw-input-icon">
                        <FaLock />
                        <input className="fw-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                    {password !== "" && (
                        <div className="au-strength">
                            <div className="au-strength-bar"><span style={{ width: strengthWidth + "%", background: strengthColor }}></span></div>
                            <span style={{ color: strengthColor }}>{strength}</span>
                        </div>
                    )}
                </label>

                {error !== "" && <div className="fw-alert fw-alert-error">{error}</div>}
                {success !== "" && <div className="fw-alert fw-alert-ok">{success}</div>}

                <button type="submit" className="fw-btn fw-btn-primary fw-btn-lg fw-btn-block" disabled={sending}>
                    {sending ? "Creating..." : "Create account"}
                </button>

                <p className="au-foot">
                    Already have an account? <Link to="/auth/login">Log in</Link>
                </p>
                <p className="au-foot" style={{ fontSize: 12.5 }}>
                    By creating an account you agree to how we handle data on the <Link to="/privacy">privacy page</Link>.
                </p>
            </form>
        </AuthLayout>
    )
}
