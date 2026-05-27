import * as admin from "firebase-admin";

interface NotificationData {
  [key: string]: unknown;
}

interface Notification {
  recipientId: string;
  title?: string;
  message: string;
  type: string;
  createdAt: Date;
  isRead: boolean;
  senderId: string;
  response: string;
  data?: NotificationData;
}

export const sendNotification = async (
  notification: Notification,
): Promise<void> => {
  try {
    const db = admin.firestore();
    const recipientId = notification.recipientId;
    if (!recipientId) {
      console.error("No recipientId in notification:", notification);
      return;
    }

    const notifRef = db
      .collection("users")
      .doc(recipientId)
      .collection("notifications");

    const docRef = await notifRef.add(notification);
    console.log("✅ Notification written to Firestore:", docRef.id);

    const recipientDocRef = await db.collection("users").doc(recipientId).get();
    if (!recipientDocRef.exists) {
      console.error("No recipientDoc in notification:", notification);
      return;
    }

    const pushTokens = recipientDocRef.data()?.pushTokens || [];
    if (pushTokens.length === 0) {
      console.error("No pushTokens in notification:", notification);
      return;
    }

    const title = notification.title ?? "Court Champs";

    const messages = pushTokens.map((token: string) => ({
      to: token,
      sound: "default",
      vibrate: [200, 100, 200],
      priority: "high",
      title: title,
      body: notification.message,
      data: {
        ...notification.data,
        type: notification.type,
      },
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("Push response not ok:", response);
      return;
    }

    console.log(`✅ Push sent to ${pushTokens.length} devices`);
  } catch (err) {
    console.error("❌ Failed to send notification:", err);
  }
};
