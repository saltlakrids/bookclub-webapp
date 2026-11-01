// Notifications on this device, the same way the Karensmindevej hub does it.
import api from "@/api";

const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker failed", error));
  }
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

// Where this device stands with notifications:
// - unsupported: the browser has no web push at all
// - install: an iPhone/iPad in Safari; push only works from the app added to the home screen
// - denied: the user said no, which only the phone's settings can undo
// - off / on: ready to turn on, or turned on for this device
export async function getPushState() {
  if (isIos() && !isStandalone()) return "install";
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && (await currentSubscription()) ? "on" : "off";
}

function keyBytes(base64url) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

const sameBytes = (a, b) => a.length === b.length && a.every((byte, i) => byte === b[i]);

// Must run from a tap: iOS only shows the permission prompt in response to one
export async function turnPushOn() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were not allowed.");
  const { data } = await api.get("/push/key");

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = keyBytes(data.publicKey);
  let subscription = await registration.pushManager.getSubscription();
  // A subscription made with another server key can't receive our messages; start over
  const existingKey = subscription?.options.applicationServerKey;
  if (subscription && existingKey && !sameBytes(new Uint8Array(existingKey), applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  await api.post("/push/subscription", subscription.toJSON());
}

export async function turnPushOff() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api.delete("/push/subscription", { data: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}

export async function sendTestPush() {
  const { data } = await api.post("/push/test", {});
  return data;
}

// Re-sends this device's subscription on start, so the server learns about it again if it was ever dropped
export async function refreshPushSubscription() {
  if (!supported() || Notification.permission !== "granted") return;
  const subscription = await currentSubscription();
  if (subscription) await api.post("/push/subscription", subscription.toJSON()).catch(() => undefined);
}
