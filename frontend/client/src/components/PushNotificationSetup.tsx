// "use client";

// import { useEffect } from "react";

// function urlBase64ToArrayBuffer(
//   base64String: string
// ): ArrayBuffer {
//   const padding = "=".repeat(
//     (4 - (base64String.length % 4)) % 4
//   );

//   const base64 = (base64String + padding)
//     .replace(/-/g, "+")
//     .replace(/_/g, "/");

//   const rawData = window.atob(base64);

//   const outputArray = new Uint8Array(
//     rawData.length
//   );

//   for (
//     let i = 0;
//     i < rawData.length;
//     i++
//   ) {
//     outputArray[i] =
//       rawData.charCodeAt(i);
//   }

//   return outputArray.buffer;
// }

// export default function PushNotificationSetup() {
//   useEffect(() => {
//     const setupPushNotifications = async () => {
//       console.log(
//         "🔔 Starting SyncUp push setup..."
//       );

//       if (
//         !("serviceWorker" in navigator)
//       ) {
//         console.error(
//           "❌ Service Worker is not supported"
//         );

//         return;
//       }

//       if (!("PushManager" in window)) {
//         console.error(
//           "❌ Push Manager is not supported"
//         );

//         return;
//       }

//       try {
//         console.log(
//           "⚙️ Registering /sw.js..."
//         );

//         const registration =
//           await navigator.serviceWorker.register(
//             "/sw.js",
//             {
//               scope: "/",
//             }
//           );

//         console.log(
//           "✅ SyncUp Service Worker registered successfully"
//         );

//         console.log(
//           "📍 Scope:",
//           registration.scope
//         );

//         const readyRegistration =
//           await navigator.serviceWorker.ready;

//         console.log(
//           "✅ Service Worker ready"
//         );

//         let permission =
//           Notification.permission;

//         console.log(
//           "🔔 Current notification permission:",
//           permission
//         );

//         if (permission === "default") {
//           permission =
//             await Notification.requestPermission();
//         }

//         console.log(
//           "🔔 Notification permission:",
//           permission
//         );

//         if (permission !== "granted") {
//           console.error(
//             "❌ Notification permission not granted"
//           );

//           return;
//         }

//         let subscription =
//           await readyRegistration
//             .pushManager
//             .getSubscription();

//         console.log(
//           "🔍 Existing Push Subscription:",
//           subscription
//         );

//         if (!subscription) {
//           console.log(
//             "📨 Creating new Push Subscription..."
//           );

//           const publicKey =
//             process.env
//               .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

//           console.log(
//             "🔑 VAPID Public Key exists:",
//             Boolean(publicKey)
//           );

//           if (!publicKey) {
//             throw new Error(
//               "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing"
//             );
//           }

//           const applicationServerKey =
//             urlBase64ToArrayBuffer(
//               publicKey
//             );

//           console.log(
//             "🔑 Application Server Key created"
//           );

//           subscription =
//             await readyRegistration
//               .pushManager
//               .subscribe({
//                 userVisibleOnly: true,
//                 applicationServerKey,
//               });

//           console.log(
//             "✅ Push Subscription created successfully"
//           );
//         }

//         console.log(
//           "📦 PUSH SUBSCRIPTION:",
//           subscription
//         );

//         console.log(
//           "📦 SUBSCRIPTION JSON:",
//           JSON.stringify(
//             subscription.toJSON(),
//             null,
//             2
//           )
//         );

//         // SEND SUBSCRIPTION TO BACKEND

//         console.log(
//           "📤 Sending Push Subscription to backend..."
//         );

//         const response = await fetch(
//           "http://localhost:5000/api/push/subscribe",
//           {
//             method: "POST",

//             headers: {
//               "Content-Type":
//                 "application/json",
//             },

//             credentials: "include",

//             body: JSON.stringify({
//               subscription:
//                 subscription.toJSON(),
//             }),
//           }
//         );

//             console.log(
//             "📡 Backend response status:",
//             response.status
//             );

//             const result =
//             await response.json();

//             console.log(
//             "📥 Backend response:",
//             result
//             );

//         if (!response.ok) {
//           throw new Error(
//             result.error ||
//               "Failed to save Push Subscription"
//           );
//         }

//         console.log(
//           "✅ Push Subscription saved in backend"
//         );
//       } catch (error) {
//         console.error(
//           "❌ Push notification setup failed:",
//           error
//         );
//       }
//     };

//     setupPushNotifications();
//   }, []);

//   return null;
// }

"use client";

import { useEffect } from "react";

function urlBase64ToArrayBuffer(
  base64String: string
): ArrayBuffer {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(
    rawData.length
  );

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer;
}

export default function PushNotificationSetup() {
  useEffect(() => {
    const setupPushNotifications = async () => {
      console.log(
        "🔔 Starting SyncUp push setup..."
      );

      /*
       * BACKEND API URL
       */
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000";

      /*
       * CHECK SERVICE WORKER SUPPORT
       */
      if (!("serviceWorker" in navigator)) {
        console.error(
          "❌ Service Worker is not supported"
        );

        return;
      }

      /*
       * CHECK PUSH MANAGER SUPPORT
       */
      if (!("PushManager" in window)) {
        console.error(
          "❌ Push Manager is not supported"
        );

        return;
      }

      /*
       * CHECK NOTIFICATION API SUPPORT
       */
      if (!("Notification" in window)) {
        console.error(
          "❌ Notification API is not supported"
        );

        return;
      }

      try {
        /*
         * REGISTER SERVICE WORKER
         */
        console.log(
          "⚙️ Registering /sw.js..."
        );

        const registration =
          await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
            }
          );

        console.log(
          "✅ SyncUp Service Worker registered successfully"
        );

        console.log(
          "📍 Scope:",
          registration.scope
        );

        /*
         * WAIT UNTIL SERVICE WORKER IS READY
         */
        const readyRegistration =
          await navigator.serviceWorker.ready;

        console.log(
          "✅ Service Worker ready"
        );

        /*
         * CHECK NOTIFICATION PERMISSION
         */
        let permission = Notification.permission;

        console.log(
          "🔔 Current notification permission:",
          permission
        );

        /*
         * REQUEST PERMISSION IF NOT DECIDED
         */
        if (permission === "default") {
          console.log(
            "🔔 Requesting notification permission..."
          );

          permission =
            await Notification.requestPermission();
        }

        console.log(
          "🔔 Notification permission:",
          permission
        );

        /*
         * STOP IF USER DENIED NOTIFICATIONS
         */
        if (permission !== "granted") {
          console.warn(
            "⚠️ Notification permission not granted"
          );

          return;
        }

        /*
         * GET EXISTING PUSH SUBSCRIPTION
         */
        let subscription =
          await readyRegistration.pushManager
            .getSubscription();

        console.log(
          "🔍 Existing Push Subscription:",
          subscription
        );

        /*
         * CREATE SUBSCRIPTION IF NONE EXISTS
         */
        if (!subscription) {
          console.log(
            "📨 Creating new Push Subscription..."
          );

          const publicKey =
            process.env
              .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

          console.log(
            "🔑 VAPID Public Key exists:",
            Boolean(publicKey)
          );

          if (!publicKey) {
            throw new Error(
              "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing"
            );
          }

          /*
           * CONVERT VAPID KEY
           */
          const applicationServerKey =
            urlBase64ToArrayBuffer(publicKey);

          console.log(
            "🔑 Application Server Key created"
          );

          /*
           * SUBSCRIBE TO PUSH MANAGER
           */
          subscription =
            await readyRegistration.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey,
              });

          console.log(
            "✅ Push Subscription created successfully"
          );
        }

        /*
         * DEBUG SUBSCRIPTION
         */
        console.log(
          "📦 PUSH SUBSCRIPTION:",
          subscription
        );

        const subscriptionJSON =
          subscription.toJSON();

        console.log(
          "📦 SUBSCRIPTION JSON:",
          JSON.stringify(
            subscriptionJSON,
            null,
            2
          )
        );

        /*
         * SEND SUBSCRIPTION TO BACKEND
         */
        console.log(
          "📤 Sending Push Subscription to backend..."
        );

        const response = await fetch(
          `${API_URL}/api/push/subscribe`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials: "include",

            body: JSON.stringify({
              subscription: subscriptionJSON,
            }),
          }
        );

        console.log(
          "📡 Backend response status:",
          response.status
        );

        /*
         * READ BACKEND RESPONSE
         */
        const result = await response.json();

        console.log(
          "📥 Backend response:",
          result
        );

        /*
         * CHECK BACKEND ERROR
         */
        if (!response.ok) {
          throw new Error(
            result.error ||
              "Failed to save Push Subscription"
          );
        }

        console.log(
          "✅ Push Subscription saved in backend"
        );

        console.log(
          "🎉 SyncUp Web Push setup completed successfully"
        );
      } catch (error) {
        console.error(
          "❌ Push notification setup failed:",
          error
        );
      }
    };

    setupPushNotifications();
  }, []);

  return null;
}