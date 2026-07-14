import webpush from "web-push";
import { pool } from "../config/DB_connect";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export const sendPushNotification = async (
  userId: string,
  payload: PushPayload
) => {
  try {
    const result = await pool.query(
      `
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      console.log(
        "⚠️ No push subscription found for user:",
        userId
      );

      return;
    }

    console.log(
      `🔔 Found ${result.rows.length} push subscriptions for user:`,
      userId
    );

    for (const subscription of result.rows) {
      const pushSubscription = {
        endpoint: subscription.endpoint,

        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );

        console.log(
          "✅ Push notification sent to:",
          userId
        );
      } catch (error: any) {
        console.error(
          "❌ Push notification failed:",
          error.statusCode,
          error.body
        );

        if (
          error.statusCode === 404 ||
          error.statusCode === 410
        ) {
          await pool.query(
            `
            DELETE FROM push_subscriptions
            WHERE endpoint = $1
            `,
            [subscription.endpoint]
          );

          console.log(
            "🗑️ Invalid push subscription removed"
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "❌ sendPushNotification error:",
      error
    );
  }
};