import axios from "axios"

const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000"
const WS_BASE_URL = process.env.REACT_APP_WS_URL || "ws://127.0.0.1:5000"

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
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        console.log(msg)
        onAnswer(msg)
        ws.close()
    }
    ws.onerror = () => {
        onAnswer({ Message: false })
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

export async function sendLoginRequest(data , onAnswer){
    try{
        const response = await axios.post(`${BASE_URL}/auth/login`,data,{
            withCredentials: true
        })
        if(response.data.Message == true){
            console.log("True")
            onAnswer(response.data)
        }else{
            console.log("False")
            onAnswer(response.data)
        }
    }catch(e){
        console.log(`ERROR: ${e}`)
    }
}

export async function Logout() {
    let response = await axios.post(`${BASE_URL}/auth/logout` , {} , {
        withCredentials: true
    })
    if(response.data.Message == true){
        return true
    }else{
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