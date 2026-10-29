import React, { useEffect, useState } from "react"
import { FaEnvelope, FaLock, FaShieldAlt, FaEye, FaEyeSlash } from "react-icons/fa"
import { Link, useNavigate } from "react-router-dom"
import Seo from "../components/Seo"
import AuthLayout from "../components/site/AuthLayout"
import { sendAuthRequestWithWebsocket } from "../api"

export default function ForgotPassword() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [sending, setSending] = useState(false)
    const [codeWait, setCodeWait] = useState(0)

    useEffect(() => {
        if (codeWait <= 0) {
            return
        }
        const timer = setTimeout(() => setCodeWait(codeWait - 1), 1000)
        return () => clearTimeout(timer)
    }, [codeWait])

    function SendCode(e) {
        if (e) {
            e.preventDefault()
        }
        setError("")
        setSuccess("")
        if (!email.includes("@") || !email.includes(".")) {
            setError("Please write the email of your account.")
            return
        }
        setSending(true)
        sendAuthRequestWithWebsocket({ type: "send_reset_code", email: email.trim() }, (result) => {
            setSending(false)
            if (result.Message === true) {
                setStep(2)
                setCodeWait(60)
                setSuccess("If an account uses " + email.trim() + ", we sent an 8 digit code to it. Check your spam folder too.")
            } else if (result.Error === true) {
                setError("Could not connect to the server. Please try again.")
            } else {
                setError(result.error || "Could not send the code. Please try again.")
            }
        })
    }

    function ChangePassword(e) {
        e.preventDefault()
        setError("")
        if (code.trim().length !== 8) {
            setError("Please write the 8 digit code from your email.")
            return
        }
        if (password.length < 8) {
            setError("Your new password needs at least 8 characters.")
            return
        }
        setSending(true)
        sendAuthRequestWithWebsocket({
            type: "reset_password",
            email: email.trim(),
            otp_code: code.trim(),
            password: password
        }, (result) => {
            setSending(false)
            if (result.Message === true) {
                setSuccess("Your password was changed. Taking you to log in...")
                setStep(3)
                setTimeout(() => navigate("/auth/login"), 1800)
            } else if (result.Error === true) {
                setError("Could not connect to the server. Please try again.")
            } else {
                setError(result.error || "Could not change the password. Please try again.")
            }
        })
    }

    return (
        <AuthLayout
            title="Forgot your password? It happens."
            points={["We send a code to your email", "You choose a new password", "Your analyses stay safe"]}
        >
            <Seo title="Reset your password | Forkwise" noindex />
            <form className="au-form" onSubmit={step === 1 ? SendCode : ChangePassword} noValidate>
                <h1>Reset your password</h1>
                <p>{step === 1 ? "Write the email you used to sign up." : "Write the code and your new password."}</p>

                <label className="fw-field">
                    <span className="fw-label">Email</span>
                    <div className="fw-input-icon">
                        <FaEnvelope />
                        <input className="fw-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={step !== 1} autoComplete="email" autoFocus />
                    </div>
                </label>

                {step >= 2 && (
                    <>
                        <div className="fw-field">
                            <span className="fw-label">Code from your email</span>
                            <div className="au-code">
                                <div className="fw-input-icon">
                                    <FaShieldAlt />
                                    <input className="fw-input" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} placeholder="8 digit code" inputMode="numeric" maxLength={8} autoComplete="one-time-code" aria-label="Code from your email" />
                                </div>
                                <button type="button" className="fw-btn fw-btn-ghost" style={{ height: "auto" }} onClick={() => SendCode()} disabled={sending || codeWait > 0 || step === 3}>
                                    {codeWait > 0 ? "Again in " + codeWait + "s" : "Send again"}
                                </button>
                            </div>
                        </div>
                        <label className="fw-field">
                            <span className="fw-label">New password</span>
                            <div className="fw-input-icon">
                                <FaLock />
                                <input className="fw-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </label>
                    </>
                )}

                {error !== "" && <div className="fw-alert fw-alert-error">{error}</div>}
                {success !== "" && <div className="fw-alert fw-alert-ok">{success}</div>}

                <button type="submit" className="fw-btn fw-btn-primary fw-btn-lg fw-btn-block" disabled={sending || step === 3}>
                    {sending ? "Sending..." : step === 1 ? "Send code" : "Change password"}
                </button>

                {step === 2 && (
                    <p className="au-foot">
                        Wrong email? <button type="button" className="au-text-btn" onClick={() => { setStep(1); setCode(""); setError(""); setSuccess("") }}>Change it</button>
                    </p>
                )}
                <p className="au-foot">
                    Remember it now? <Link to="/auth/login">Log in</Link>
                </p>
            </form>
        </AuthLayout>
    )
}
