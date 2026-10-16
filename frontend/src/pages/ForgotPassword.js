import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Register.css"
import { FaEnvelope, FaLock, FaShieldAlt, FaEye, FaEyeSlash, FaCheck } from "react-icons/fa"
import { Link, useNavigate } from "react-router-dom"
import Logo from "../images/logo.svg"
import Seo from "../components/Seo"
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
        <div className="SignupPage">
            <Seo title="Reset your password | Forkwise" noindex />
            <div className="SignupShell">
                <aside className="SignupSide">
                    <Link to="/" className="SideBrand">
                        <img src={Logo} alt="Logo" className="SideLogo" />
                        <span>Forkwise</span>
                    </Link>
                    <h2 className="SideTitle">Forgot your password? It happens.</h2>
                    <ul className="SideList">
                        <li><FaCheck /> We send a code to your email</li>
                        <li><FaCheck /> You choose a new password</li>
                        <li><FaCheck /> Your analyses stay safe</li>
                    </ul>
                    <p className="SideNote">A-ISPC 2026 project</p>
                </aside>

                <form className="SignupCard LoginCard" onSubmit={step === 1 ? SendCode : ChangePassword} noValidate>
                    <h3 className="SignupTitle">Reset your password</h3>
                    <p className="SignupSubtitle">
                        {step === 1 ? "Write the email you used to sign up." : "Write the code and your new password."}
                    </p>

                    <label className="SignupField">
                        <span>Email</span>
                        <div className="IconInput">
                            <FaEnvelope className="FieldIcon" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={step !== 1} autoFocus />
                        </div>
                    </label>

                    {step >= 2 && (
                        <>
                            <label className="SignupField">
                                <span>Code from your email</span>
                                <div className="SignupCodeRow">
                                    <div className="IconInput">
                                        <FaShieldAlt className="FieldIcon" />
                                        <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} placeholder="8 digit code" inputMode="numeric" maxLength={8} autoComplete="one-time-code" />
                                    </div>
                                    <button type="button" className="SignupCodeButton" onClick={() => SendCode()} disabled={sending || codeWait > 0 || step === 3}>
                                        {codeWait > 0 ? "Send again in " + codeWait + "s" : "Send again"}
                                    </button>
                                </div>
                            </label>

                            <label className="SignupField">
                                <span>New password</span>
                                <div className="IconInput">
                                    <FaLock className="FieldIcon" />
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                                    <button type="button" className="EyeButton" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </label>
                        </>
                    )}

                    {error !== "" && <div className="SignupError">{error}</div>}
                    {success !== "" && <div className="SignupSuccess">{success}</div>}

                    <button
                        type="submit"
                        className="SignupButton"
                        disabled={sending}
                        onMouseMove={(e) => {
                            const box = e.currentTarget.getBoundingClientRect()
                            e.currentTarget.style.setProperty("--x", e.clientX - box.left + "px")
                            e.currentTarget.style.setProperty("--y", e.clientY - box.top + "px")
                        }}
                    >
                        {sending ? "Sending ..." : "Send"}
                    </button>

                    {step === 2 && (
                        <p className="SignupFooter">
                            Wrong email? <button type="button" className="SignupTextButton" onClick={() => { setStep(1); setCode(""); setError(""); setSuccess("") }}>Change it</button>
                        </p>
                    )}

                    <p className="SignupFooter">
                        Remember it now? <Link to="/auth/login">Log in</Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
