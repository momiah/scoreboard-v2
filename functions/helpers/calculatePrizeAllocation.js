const admin = require("firebase-admin");
const { notificationTypes } = require("../schemas/schema");
const db = admin.firestore();




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
      title: `New Notification in Court Champs!`,
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
};


const calculatePrizeAllocation = async ({
  leagueParticipants,
  prizePool,
  prizeDistribution,
  leagueId,
  leagueName,
}) => {
  try {
    console.log(`Calculating prize allocation for league ${leagueId}...`);

    // sort participants by wins
    leagueParticipants.sort((a, b) => {
      if (b.numberOfWins !== a.numberOfWins) {
        return b.numberOfWins - a.numberOfWins;
      }
      if (b.totalPointDifference !== a.totalPointDifference) {
        return b.totalPointDifference - a.totalPointDifference;
      }
      return (b.XP || 0) - (a.XP || 0);
    });

    const placementKeys = ["first", "second", "third", "fourth"];
    const finalists = leagueParticipants.slice(0, 4);

    console.log("finalists:", finalists);

    for (let index = 0; index < finalists.length; index++) {
      const player = finalists[index];
      const placementKey = placementKeys[index];
      const prizeXP = Math.floor(prizePool * (prizeDistribution[index] || 0));

      const userRef = db.collection("users").doc(player.userId);
      await userRef.update({
        "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
        [`profileDetail.leagueStats.${placementKey}`]:
          admin.firestore.FieldValue.increment(1),
      });

      console.log(
        `+${prizeXP} XP -> user ${player.userId} (${player.displayName}) (${placementKey})`
      );

      await sendNotification({
        createdAt: new Date(),
        type: notificationTypes.INFORMATION.LEAGUE.TYPE,
        message: `You have placed ${placementKey} in ${leagueName} and won ${prizeXP} XP!`,
        isRead: false,
        senderId: "system",
        recipientId: player.userId,
        data: {
          leagueId: leagueId,
        },
        response: "",

      });
    }

    await db.collection("leagues").doc(leagueId).update({
      prizesDistributed: true,
      prizeDistributionDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Prizes distributed for league ${leagueId}`);
  } catch (error) {
    console.error("Error allocating prizes:", error);
  }
};

module.exports = { calculatePrizeAllocation };
