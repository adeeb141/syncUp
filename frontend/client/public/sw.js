// self.addEventListener("install", () => {
//   console.log("🟡 SyncUp Service Worker installing...");

//   self.skipWaiting();
// });

// self.addEventListener("activate", (event) => {
//   console.log("🟢 SyncUp Service Worker activated");

//   event.waitUntil(self.clients.claim());
// });

// self.addEventListener("push", (event) => {
//   console.log("🔥 PUSH EVENT RECEIVED");

//   let data = {
//     title: "SyncUp",
//     body: "You have a new notification",
//     url: "/",
//   };

//   if (event.data) {
//     try {
//       data = event.data.json();
//     } catch (error) {
//       console.warn(
//         "⚠️ Push payload is not JSON. Using text payload."
//       );

//       data = {
//         title: "SyncUp",
//         body: event.data.text(),
//         url: "/",
//       };
//     }
//   }

//   console.log("📦 PUSH DATA:", data);

//   const title = data.title || "SyncUp";

//   const options = {
//     body: data.body || "You have a new notification",

//     data: {
//       url: data.url || "/",
//     },
//   };

//   event.waitUntil(
//     self.registration.showNotification(
//       title,
//       options
//     )
//   );
// });

// self.addEventListener("notificationclick", (event) => {
//   console.log("🖱️ Notification clicked");

//   event.notification.close();

//   const url = event.notification.data?.url || "/";

//   event.waitUntil(
//     clients
//       .matchAll({
//         type: "window",
//         includeUncontrolled: true,
//       })
//       .then((clientList) => {
//         for (const client of clientList) {
//           if ("focus" in client) {
//             client.navigate(url);

//             return client.focus();
//           }
//         }

//         if (clients.openWindow) {
//           return clients.openWindow(url);
//         }
//       })
//   );
// });

self.addEventListener("install", () => {
  console.log(
    "🟡 SyncUp Service Worker installing..."
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log(
    "🟢 SyncUp Service Worker activated"
  );

  event.waitUntil(
    self.clients.claim()
  );
});

self.addEventListener("push", (event) => {
  console.log(
    "🔥 PUSH EVENT RECEIVED"
  );

  let data = {
    title: "SyncUp",
    body: "You have a new notification",
    url: "/workspaces",
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.warn(
        "⚠️ Push payload is not JSON. Using text payload."
      );

      data = {
        title: "SyncUp",
        body: event.data.text(),
        url: "/workspaces",
      };
    }
  }

  console.log(
    "📦 PUSH DATA:",
    data
  );

  const options = {
    body:
      data.body ||
      "You have a new notification",

    data: {
      url:
        data.url ||
        "/workspaces",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "SyncUp",
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    console.log(
      "🖱️ Notification clicked"
    );

    event.notification.close();

    const url =
      event.notification.data?.url ||
      "/workspaces";

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if (
              "focus" in client &&
              "navigate" in client
            ) {
              return client
                .navigate(url)
                .then(() => client.focus());
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
);