/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
import { NotificationService } from "./notification.service"

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", () => {
  // event.waitUntil(self.clients.claim())
  NotificationService.log("activated")

  const options = {
    userVisibleOnly: true,
    // https://datatracker.ietf.org/doc/html/rfc8292,
    // Temporary used random vapidKey in BASE64 format
    applicationServerKey:
      "BMU6CyDIU_KnmGJuic24why0fcc-GTIKzWyCwH2AYFXw2f6DfyN9LfeFX1PFfLA1SM9zBh83io2NPHFkCIXV7R0",
  }

  self.registration.pushManager.subscribe(options).then(
    (pushSubscription) => {
      // eslint-disable-next-line no-console
      console.log(pushSubscription.endpoint)
      // The push subscription details needed by the application
      // server are now available, and can be sent to it using,
      // for example, an XMLHttpRequest.
    },
    (error) => {
      // During development it often helps to log errors to the
      // console. In a production environment it might make sense to
      // also report information about errors back to the
      // application server.
      // eslint-disable-next-line no-console
      console.error(error)
    },
  )
})

self.addEventListener("push", (event) => {
  const { title, dir, badge, image, body, silent, requireInteraction } =
    event.data?.json() ?? {}

  const options = {
    dir,
    badge,
    image,
    body,
    silent,
    requireInteraction,
  }

  NotificationService.push(title, options)
})

// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", (event) => {
  const { data = "push" } = event
  const { title, options } = data

  switch (data.type) {
    case "push":
      NotificationService.push(title, options)
      break
    case "unregister":
      self.registration
        .unregister()
        .then(() => {
          NotificationService.release()
          return self.clients.matchAll()
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.navigate(client.url)
          })
        })
      break
    default:
      break
  }
})
