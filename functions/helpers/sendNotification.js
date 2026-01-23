const { db } = require("../../services/firebase.config");


const sendNotification = async (notification) => {
    try {
        const recipientId = notification.recipientId;
        if (!recipientId) {
            console.error("No recipientId in notification:", notification);
            // return because cannot send notification without a recipientId
            return
        }

        // 🔥 Get the subcollection reference under the user
        const notifRef = db.collection("users").doc(recipientId).collection("notifications");
        if (!notifRef) {
            console.error("No notifRef in notification:", notification);
            // return because cannot send notification without a notifRef
            return
        }

        // ➕ Add the notification as a new document
        await notifRef.add(notification);

        // Lookup push tokens
        const recipientDocRef = await db.collection("users").doc(recipientId).get();

        if (!recipientDocRef.exists) {
            console.error("No recipientDoc in notification:", notification);
            // return because cannot send notification without a recipientDoc
            return { success: [], error: ["No recipientDoc"] };
        }

        const pushTokens = recipientDocRef.data()?.pushTokens || [];

        if (pushTokens.length === 0) {
            console.error("No pushTokens in notification:", notification);
            // return because cannot send notification without pushTokens
            return
        }

        //send device notification
        const messages = pushTokens.map((token) => ({
            to: token,
            sound: "default",
            vibrate: [200, 100, 200],
            priority: "high",
            title: `Court Champs`,
            body: notification.message,
            data: {
                ...notification.data,
                type: notification.type,
            },
        }));
        if (messages.length === 0) {
            console.error("No messages in notification:", notification);
            // return because cannot send notification without messages
            return
        }

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
            console.error("Push response not ok for :", response);
            return
        }
        console.log(`✅ Push sent to ${pushTokens.length} devices for notification: ${JSON.stringify(notification, null, 2)}`);

    } catch (err) {
        console.error("❌ Failed to send notification:", err);

    }
}
module.exports = { sendNotification }