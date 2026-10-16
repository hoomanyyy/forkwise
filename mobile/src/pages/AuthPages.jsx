import React, { useState, useEffect } from "react"
import { FiCheck, FiEye, FiEyeOff, FiMail } from "react-icons/fi"
import { TopBar } from "../components/Parts"
import { login, saveLogin, sendAuthMessage } from "../api"
import { tap } from "../native"
import "../styles/Auth.css"

export function WelcomePage({ onLogin, onRegister }) {
    return (
        <div className="AppScreen AuthWelcome AppFadeIn">
            <div className="AuthGlow"></div>
            <div className="AuthHero">
                <img src="./logo.svg" alt="Forkwise" className="AuthLogo" />
                <h1 className="AuthTitle">Forkwise</h1>
                <p className="AuthTagline">One question. Many AI analysts. One honest answer.</p>
            </div>

            <ul className="AuthList">
                <li><FiCheck /> Many AI analysts study your question</li>
                <li><FiCheck /> Python does every calculation</li>
                <li><FiCheck /> A clear verdict in a few minutes</li>
            </ul>

            <div className="AuthActions">
                <button className="AppButton" onClick={() => { tap(); onRegister() }}>Create an account</button>
                <button className="AppButton AppButtonGhost" onClick={() => { tap(); onLogin() }}>I already have an account</button>
            </div>
        </div>
    )
}

export function LoginPage({ onBack, onDone, onRegister }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [show, setShow] = useState(false)
    const [error, setError] = useState("")
    const [sending, setSending] = useState(false)

    async function handleLogin(e) {
        e.preventDefault()
        setError("")
        if (username.trim() === "" || password === "") {
            setError("Please write your username and password.")
            return
        }
        setSending(true)
        const result = await login(username.trim(), password)
        setSending(false)
        if (result.Message === true) {
            saveLogin(result.token, result.user)
            onDone(result.user)
        } else if (result.Error) {
            setError("Could not connect to the server. Check your internet.")
        } else {
            setError("The username or password is wrong.")
        }
    }

    return (
        <div className="AppScreen AppSlideIn">
            <TopBar title="" onBack={onBack} />
            <h1 className="AuthPageTitle">Welcome back</h1>
            <p className="AuthPageText">Log in to see your analyses.</p>

            <form onSubmit={handleLogin} noValidate>
                <label className="AppField">
                    <span className="AppLabel">Username or email</span>
                    <input className="AppInput" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="your_username" />
                </label>
                <label className="AppField">
                    <span className="AppLabel">Password</span>
                    <div className="AuthPassword">
                        <input className="AppInput" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
                        <button type="button" className="AuthEye" onClick={() => setShow(!show)} aria-label="Show password">
                            {show ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </label>

                {error !== "" && <div className="AppError">{error}</div>}

                <button type="submit" className="AppButton" disabled={sending}>
                    {sending ? <span className="AppSpinner"></span> : "Log in"}
                </button>
            </form>

            <p className="AuthSwitch">
                New here? <button onClick={onRegister}>Create an account</button>
            </p>
        </div>
    )
}

export function RegisterPage({ onBack, onDone, onLogin }) {
    const [step, setStep] = useState(1)
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [name, setName] = useState("")
    const [lastName, setLastName] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [show, setShow] = useState(false)
    const [error, setError] = useState("")
    const [info, setInfo] = useState("")
    const [sending, setSending] = useState(false)
    const [wait, setWait] = useState(0)

    useEffect(() => {
        if (wait <= 0) {
            return
        }
        const timer = setTimeout(() => setWait(wait - 1), 1000)
        return () => clearTimeout(timer)
    }, [wait])

    async function sendCode() {
        setError("")
        setInfo("")
        if (!email.includes("@") || !email.includes(".")) {
            setError("Please write a real email address.")
            return
        }
        setSending(true)
        const result = await sendAuthMessage({ type: "send_otp_code", email: email.trim() })
        setSending(false)
        if (result.Message === true) {
            setStep(2)
            setWait(60)
            setInfo("We sent an 8 digit code to " + email.trim() + ".")
        } else if (result.Error) {
            setError("Could not connect to the server. Check your internet.")
        } else {
            setError(result.error || "Could not send the code. Please try again.")
        }
    }

    async function createAccount(e) {
        e.preventDefault()
        setError("")
        if (code.length !== 8) {
            setError("Please write the 8 digit code from your email.")
            return
        }
        if (name.trim() === "" || lastName.trim() === "" || username.trim() === "") {
            setError("Please fill in every field.")
            return
        }
        if (password.length < 8) {
            setError("Your password needs at least 8 characters.")
            return
        }
        setSending(true)
        const result = await sendAuthMessage({
            type: "register",
            username: username.trim(),
            password: password,
            email: email.trim(),
            name: name.trim(),
            lastname: lastName.trim(),
            otp_code: code
        })
        if (result.Message !== true) {
            setSending(false)
            if (result.Error) {
                setError("Could not connect to the server. Check your internet.")
            } else {
                setError(result.error || "Could not create the account.")
            }
            return
        }
        const logged = await login(username.trim(), password)
        setSending(false)
        if (logged.Message === true) {
            saveLogin(logged.token, logged.user)
            onDone(logged.user)
        } else {
            onLogin()
        }
    }

    return (
        <div className="AppScreen AppSlideIn">
            <TopBar title="" onBack={step === 2 ? () => { setStep(1); setError(""); setInfo("") } : onBack} />
            <div className="AuthSteps">
                <span className="AuthStepOn"></span>
                <span className={step === 2 ? "AuthStepOn" : ""}></span>
            </div>

            {step === 1 && (
                <div className="AppFadeIn">
                    <h1 className="AuthPageTitle">Create your account</h1>
                    <p className="AuthPageText">First, let us check your email.</p>
                    <label className="AppField">
                        <span className="AppLabel">Email</span>
                        <input className="AppInput" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="you@example.com" />
                    </label>
                    {error !== "" && <div className="AppError">{error}</div>}
                    <button className="AppButton" onClick={sendCode} disabled={sending}>
                        {sending ? <span className="AppSpinner"></span> : <><FiMail /> Send me a code</>}
                    </button>
                    <p className="AuthSwitch">
                        Have an account? <button onClick={onLogin}>Log in</button>
                    </p>
                </div>
            )}

            {step === 2 && (
                <form className="AppFadeIn" onSubmit={createAccount} noValidate>
                    <h1 className="AuthPageTitle">Almost done</h1>
                    {info !== "" && <div className="AppSuccess">{info}</div>}

                    <label className="AppField">
                        <span className="AppLabel">Verification code</span>
                        <input className="AppInput AuthCode" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" maxLength={8} autoComplete="one-time-code" placeholder="00000000" />
                    </label>
                    <button type="button" className="AuthResend" disabled={wait > 0 || sending} onClick={sendCode}>
                        {wait > 0 ? "Send again in " + wait + "s" : "Send the code again"}
                    </button>

                    <div className="AuthRow">
                        <label className="AppField">
                            <span className="AppLabel">First name</span>
                            <input className="AppInput" value={name} onChange={(e) => setName(e.target.value)} />
                        </label>
                        <label className="AppField">
                            <span className="AppLabel">Last name</span>
                            <input className="AppInput" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </label>
                    </div>
                    <label className="AppField">
                        <span className="AppLabel">Username</span>
                        <input className="AppInput" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" />
                    </label>
                    <label className="AppField">
                        <span className="AppLabel">Password</span>
                        <div className="AuthPassword">
                            <input className="AppInput" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                            <button type="button" className="AuthEye" onClick={() => setShow(!show)} aria-label="Show password">
                                {show ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                    </label>

                    {error !== "" && <div className="AppError">{error}</div>}

                    <button type="submit" className="AppButton" disabled={sending}>
                        {sending ? <span className="AppSpinner"></span> : "Create account"}
                    </button>
                </form>
            )}
        </div>
    )
}
