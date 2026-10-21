import axios from "axios"

const onMyComputer = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"

let BASE_URL = process.env.REACT_APP_API_URL
let WS_BASE_URL = process.env.REACT_APP_WS_URL

if (!BASE_URL || !BASE_URL.startsWith("http")) {
    BASE_URL = onMyComputer ? "http://127.0.0.1:5000" : "https://api.forkwise.online"
}
if (!WS_BASE_URL || !WS_BASE_URL.startsWith("ws")) {
    WS_BASE_URL = onMyComputer ? "ws://127.0.0.1:5000" : "wss://api.forkwise.online"
}

export async function sendInformationsAn(formdata) {
    const response = await axios.post(`${BASE_URL}/api/analyze`, formdata, {
        withCredentials: true
    })
    return response.data
}

export async function sendContact(data) {
    const response = await axios.post(`${BASE_URL}/api/contact`, data)
    return response.data
}


export function sendAuthRequestWithWebsocket(data, onAnswer) {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/auth`)
    ws.onopen = () => {
        ws.send(JSON.stringify(data))
    }
    let answered = false
    ws.onmessage = (event) => {
        answered = true
        onAnswer(JSON.parse(event.data))
        ws.close()
    }
    ws.onerror = () => {
        if (!answered) {
            answered = true
            onAnswer({ Message: false, Error: true })
        }
    }
}

export async function adminGet(name) {
    const response = await axios.get(`${BASE_URL}/api/admin/${name}`, { withCredentials: true })
    return response.data
}

export async function adminDelete(name, id) {
    let url = `${BASE_URL}/api/admin/${name}`
    if (id !== undefined) {
        url = url + "/" + id
    }
    const response = await axios.delete(url, { withCredentials: true })
    return response.data
}

export async function sendLoginRequest(data, onAnswer) {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, data, {
            withCredentials: true
        })
        onAnswer(response.data)
    } catch (e) {
        console.log(`ERROR: ${e}`)
        onAnswer({ Message: false, Error: true })
    }
}

export async function Logout() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/logout`, {}, {
            withCredentials: true
        })
        return response.data.Message === true
    } catch (e) {
        return false
    }
}

export async function getRun(id) {
    const response = await axios.get(`${BASE_URL}/api/runs/${id}`, {
        withCredentials: true
    })
    return response.data
}

export async function getHistory() {
    const response = await axios.get(`${BASE_URL}/api/get/history`, { withCredentials: true })
    return response.data
}

export async function sendEmailRequest(subject , domain , html) {
    try{
    const response = await axios.post(`${BASE_URL}/api/sendEmailAll`, {
        subject: subject,
        domain: domain,
        html: html
    }, { withCredentials: true })
    return response.data.Message === true
        console.log("response:", response.data)
        return response.data.Message === true
    }catch(e){
        console.log("error: " , e)
        return false
    }
}