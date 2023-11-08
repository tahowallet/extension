const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("No support for service worker!")
  }

  if ("Notification" in window) {
    Notification.requestPermission().then(() => {
      if (Notification.permission === "granted") {
        // eslint-disable-next-line no-console
        console.log("Granted permission for push notification")
      } else {
        // eslint-disable-next-line no-console
        console.log("Rejected permission for push notification")
      }
    })
  } else {
    throw new Error("No support for push notification.")
  }

  try {
    const config = encodeURIComponent(
      JSON.stringify({
        vapidKey: process.env.VAPID_PUBLIC_KEY,
      }),
    )

    navigator.serviceWorker
      .register(
        `service-workers/Notification/notification.serviceWorker.js?config=${config}`,
        { type: "module", scope: "/" },
      )
      .then((registration) => {
        // eslint-disable-next-line no-console
        console.log("Service Worker registered", registration)
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log("Service Worker Failed to Register", err)
      })
  } catch (error) {
    throw new Error(`Service Worker Registration Failed: ${error}`)
  }
}

export default registerServiceWorker
