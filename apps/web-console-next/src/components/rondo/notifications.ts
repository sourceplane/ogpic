/*
 * Notification enablement. Registers the Rondo service worker and requests the
 * browser Notification permission, so the app (and, once VAPID push is wired
 * server-side, the push pipeline) can surface match & availability alerts. The
 * service worker's push handler is already in place; live server-initiated push
 * additionally needs VAPID keys + a subscription, configured in ops.
 */
"use client";

export type NotifyState = "unsupported" | "default" | "granted" | "denied";

export function notifyState(): NotifyState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }
  return Notification.permission as NotifyState;
}

export async function enableNotifications(): Promise<NotifyState> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await reg.showNotification("Rondo notifications on", {
        body: "You'll get match and availability alerts here.",
        tag: "rondo-welcome",
      });
    }
    return permission as NotifyState;
  } catch {
    return "denied";
  }
}
