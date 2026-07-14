// import { Request, Response } from "express";
// import { pool } from "../config/DB_connect";
// import { sendPushNotification } from "../utils/sendPushNotification";

// export const savePushSubscription = async (
//   req: Request,
//   res: Response
// ) => {
//   const userId = req.user?.id; // set by requireAuth middleware
//   const { endpoint, keys } = req.body.subscription;

//   if (!endpoint || !keys?.p256dh || !keys?.auth) {
//     return res.status(400).json({
//       error: "Invalid subscription object",
//     });
//   }

//   try {
//     await pool.query(
//       `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
//        VALUES ($1, $2, $3, $4)
//        ON CONFLICT (endpoint) DO UPDATE
//        SET user_id = $1, p256dh = $3, auth = $4`,
//       [userId, endpoint, keys.p256dh, keys.auth]
//     );

//     return res.status(201).json({
//       message: "Subscription saved",
//     });
//   } catch (err) {
//     console.error("❌ Error saving push subscription:", err);

//     return res.status(500).json({
//       error: "Failed to save subscription",
//     });
//   }
// };

// export const removePushSubscription = async (
//   req: Request,
//   res: Response
// ) => {
//   const { endpoint } = req.body;

//   if (!endpoint) {
//     return res.status(400).json({
//       error: "Endpoint is required",
//     });
//   }

//   try {
//     await pool.query(
//       `DELETE FROM push_subscriptions WHERE endpoint = $1`,
//       [endpoint]
//     );

//     return res.status(200).json({
//       message: "Subscription removed",
//     });
//   } catch (err) {
//     console.error("❌ Error removing push subscription:", err);

//     return res.status(500).json({
//       error: "Failed to remove subscription",
//     });
//   }
// };

// /**
//  * TEST WEB PUSH NOTIFICATION
//  */
// export const testPushNotification = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({
//         error: "userId is required",
//       });
//     }

//     console.log(
//       "🧪 Sending test push notification to:",
//       userId
//     );

//     await sendPushNotification(userId, {
//       title: "SyncUp Test 🔔",
//       body: "Web Push is working while the SyncUp tab is closed!",
//       url: "/dashboard",
//     });

//     return res.status(200).json({
//       message: "Test push notification sent",
//     });
//   } catch (error) {
//     console.error(
//       "❌ Test push notification error:",
//       error
//     );

//     return res.status(500).json({
//       error: "Failed to send test push notification",
//     });
//   }
// };

import { Request, Response } from "express";
import { pool } from "../config/DB_connect";

export const savePushSubscription = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?.id;

  const subscription = req.body.subscription;

  if (!userId) {
    return res.status(401).json({
      error: "User not authenticated",
    });
  }

  if (!subscription) {
    return res.status(400).json({
      error: "Subscription is required",
    });
  }

  const { endpoint, keys } = subscription;

  if (
    !endpoint ||
    !keys?.p256dh ||
    !keys?.auth
  ) {
    return res.status(400).json({
      error: "Invalid subscription object",
    });
  }

  try {
    await pool.query(
      `
      INSERT INTO push_subscriptions (
        user_id,
        endpoint,
        p256dh,
        auth
      )
      VALUES ($1, $2, $3, $4)

      ON CONFLICT (endpoint)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth
      `,
      [
        userId,
        endpoint,
        keys.p256dh,
        keys.auth,
      ]
    );

    console.log(
      "✅ Push subscription saved for user:",
      userId
    );

    return res.status(201).json({
      message: "Subscription saved",
    });
  } catch (error) {
    console.error(
      "❌ Error saving push subscription:",
      error
    );

    return res.status(500).json({
      error: "Failed to save subscription",
    });
  }
};

export const removePushSubscription = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?.id;

  const { endpoint } = req.body;

  if (!userId) {
    return res.status(401).json({
      error: "User not authenticated",
    });
  }

  if (!endpoint) {
    return res.status(400).json({
      error: "Endpoint is required",
    });
  }

  try {
    await pool.query(
      `
      DELETE FROM push_subscriptions
      WHERE endpoint = $1
      AND user_id = $2
      `,
      [endpoint, userId]
    );

    console.log(
      "🗑️ Push subscription removed for user:",
      userId
    );

    return res.status(200).json({
      message: "Subscription removed",
    });
  } catch (error) {
    console.error(
      "❌ Error removing push subscription:",
      error
    );

    return res.status(500).json({
      error: "Failed to remove subscription",
    });
  }
};