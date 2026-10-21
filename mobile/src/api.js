let API_URL = import.meta.env.VITE_API_URL
let WS_URL = import.meta.env.VITE_WS_URL

if (!API_URL || !API_URL.startsWith("http")) {
    API_URL = "https://api.forkwiseai.com"
}
if (!WS_URL || !WS_URL.startsWith("ws")) {
    WS_URL = "wss://api.forkwiseai.com"
}

const TOKEN_KEY = "forkwise_token"
const USER_KEY = "forkwise_user"

export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch (e) {
        return null
    }
}

export function getSavedUser() {
    try {
        const text = localStorage.getItem(USER_KEY)
        return text ? JSON.parse(text) : null
    } catch (e) {
        return null
    }
}

export function saveLogin(token, user) {
    try {
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch (e) {
        console.log("ERROR: " + e)
    }
}

export function clearLogin() {
    try {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
    } catch (e) {
        console.log("ERROR: " + e)
    }
}

async function request(path, options) {
    const headers = {}
    const token = getToken()
    if (token) {
        headers["Authorization"] = "Bearer " + token
    }
    if (options && options.json) {
        headers["Content-Type"] = "application/json"
    }

    const response = await fetch(API_URL + path, {
        method: options && options.method ? options.method : "GET",
        headers: headers,
        body: options && options.json ? JSON.stringify(options.json) : options && options.body ? options.body : undefined
    })

    const data = await response.json()
    if (data.Message === "login") {
        clearLogin()
        window.dispatchEvent(new Event("forkwise-logout"))
    }
    return data
}

export async function login(username, password) {
    try {
        return await request("/auth/mobile/login", { method: "POST", json: { username: username, password: password } })
    } catch (e) {
        return { Message: false, Error: true }
    }
}

export async function getMe() {
    try {
        return await request("/api/me")
    } catch (e) {
        return { Message: false, Error: true }
    }
}

export async function getHistory() {
    try {
        return await request("/api/get/history")
    } catch (e) {
        return { Message: false, Error: true }
    }
}

export async function getRun(id) {
    try {
        return await request("/api/runs/" + id)
    } catch (e) {
        return { Message: false, Error: true }
    }
}

export async function startAnalysis(formData) {
    try {
        return await request("/api/analyze", { method: "POST", body: formData })
    } catch (e) {
        return { Message: false, Error: true }
    }
}

export function sendAuthMessage(data) {
    return new Promise((resolve) => {
        let answered = false
        let ws
        try {
            ws = new WebSocket(WS_URL + "/ws/auth")
        } catch (e) {
            resolve({ Message: false, Error: true })
            return
        }
        ws.onopen = () => {
            ws.send(JSON.stringify(data))
        }
        ws.onmessage = (event) => {
            answered = true
            ws.close()
            try {
                resolve(JSON.parse(event.data))
            } catch (e) {
                resolve({ Message: false })
            }
        }
        ws.onerror = () => {
            if (!answered) {
                answered = true
                resolve({ Message: false, Error: true })
            }
        }
        ws.onclose = () => {
            if (!answered) {
                answered = true
                resolve({ Message: false, Error: true })
            }
        }
    })
}

export const WEBSITE = "https://forkwiseai.com"
