import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { StatusBar, Style } from "@capacitor/status-bar"
import { Haptics, ImpactStyle } from "@capacitor/haptics"
import { SplashScreen } from "@capacitor/splash-screen"

export const isNative = Capacitor.isNativePlatform()

export async function setupNative() {
    if (!isNative) {
        return
    }
    try {
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: "#0b0e1f" })
    } catch (e) {
        console.log("ERROR: " + e)
    }
    try {
        await SplashScreen.hide()
    } catch (e) {
        console.log("ERROR: " + e)
    }
}

export function tap() {
    if (!isNative) {
        return
    }
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

export function onBackButton(handler) {
    if (!isNative) {
        return () => {}
    }
    const listener = App.addListener("backButton", handler)
    return () => {
        listener.then((l) => l.remove())
    }
}

export function exitApp() {
    if (isNative) {
        App.exitApp()
    }
}

export function openLink(url) {
    window.open(url, "_blank")
}

export function onResume(handler) {
    if (!isNative) {
        return () => {}
    }
    const listener = App.addListener("appStateChange", (state) => {
        if (state.isActive) {
            handler()
        }
    })
    return () => {
        listener.then((l) => l.remove())
    }
}
