import React, { useState , useEffect } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Register.css"
import { FaEnvelope, FaUser , FaLock,FaShieldAlt ,FaEye, FaEyeSlash, FaCheck } from "react-icons/fa"
import { Link, useNavigate } from "react-router-dom"
import Logo from "../images/logo.svg"
import Seo from "../components/Seo"
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
    let strengthClass = "Weak"
    if (password.length >= 6) {
        strength = "OK"
        strengthClass = "Medium"
    }
    if (password.length >= 10) {
        strength = "Strong"
        strengthClass = "Strong"
    }

    useEffect(() => {
        function getMe() {
            sendAuthRequestWithWebsocket(
                { type: "whoami" },
                (data) => {
                    if (data.Message === true) {
                        navigate("/dashboard")
                    }
                }
            );
        }

        getMe();
    }, [navigate]);

    useEffect(() => {
        if (codeWait <= 0) {
            return
        }
        const timer = setTimeout(() => setCodeWait(codeWait - 1), 1000)
        return () => clearTimeout(timer)
    }, [codeWait]);

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
        <div className="SignupPage">
            <Seo title="Create an account | Forkwise" noindex />
            <div className="SignupShell">
                <aside className="SignupSide">
                    <Link to="/" className="SideBrand">
                        <img src={Logo} alt="Logo" className="SideLogo" />
                        <span>Forkwise</span>
                    </Link>
                    <h2 className="SideTitle">Test how strong your findings really are.</h2>
                    <ul className="SideList">
                        <li><FaCheck /> Many AI analysts study the same question</li>
                        <li><FaCheck /> Python does every calculation</li>
                        <li><FaCheck /> Charts, formulas and a clear verdict</li>
                    </ul>
                    <p className="SideNote">A-ISPC 2026 project</p>
                </aside>

                <form className="SignupCard" onSubmit={HandleSubmit} noValidate>
                    <h3 className="SignupTitle">Create your account</h3>
                    <p className="SignupSubtitle">It takes less than a minute.</p>

                    <div className="SignupRow">
                        <label className="SignupField">
                            <span>First name</span>
                            <input className="SignupInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="max" />
                        </label>
                        <label className="SignupField">
                            <span>Last name</span>
                            <input className="SignupInput" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Arleston" />
                        </label>
                    </div>

                    <label className="SignupField">
                        <span>Email</span>
                        <div className="IconInput">
                            <FaEnvelope className="FieldIcon" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maxArleston13@example.com" />
                        </div>
                    </label>

                    <label className="SignupField">
                        <span>Verification code</span>
                        <div className="SignupCodeRow">
                            <div className="IconInput">
                                <FaShieldAlt className="FieldIcon" />
                                <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} placeholder="8 digit code" inputMode="numeric" maxLength={8} autoComplete="one-time-code" />
                            </div>
                            <button type="button" className="SignupCodeButton" onClick={SendCode} disabled={codeSending || codeWait > 0}>
                                {codeSending ? "Sending..." : codeWait > 0 ? "Send again in " + codeWait + "s" : "Send code"}
                            </button>
                        </div>
                    </label>

                    <label className="SignupField">
                        <span>Username</span>
                        <div className="IconInput">
                            <FaUser className="FieldIcon" />
                            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="max_arleston" />
                        </div>
                    </label>
                    <label className="SignupField">
                        <span>Password</span>
                        <div className="IconInput">
                            <FaLock className="FieldIcon" />
                            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                            <button type="button" className="EyeButton" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {password !== "" && (
                            <div className="StrengthRow">
                                <div className={"StrengthBar " + strengthClass}></div>
                                <span className={"StrengthText " + strengthClass}>{strength}</span>
                            </div>
                        )}
                    </label>

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
                        {sending ? "Creating..." : "Create account"}
                    </button>

                    <p className="SignupFooter">
                        Already have an account? <Link to="/auth/login">Log in</Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
