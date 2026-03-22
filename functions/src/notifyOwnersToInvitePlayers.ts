import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { sendNotification } from "./helpers/sendNotification";
import { notificationTypes, notificationSchema } from "@shared";
import { League, Tournament } from "@shared/types";

const TIMEZONE = "Europe/London";

export const notifyOwnersToInvitePlayers = onSchedule(
  { schedule: "every 336 hours", timeZone: TIMEZONE }, // every 2 weeks
  async () => {
    const db = admin.firestore();
    try {
      const [leaguesSnapshot, tournamentsSnapshot] = await Promise.all([
        db.collection("leagues").where("prizesDistributed", "==", false).get(),
        db
          .collection("tournaments")
          .where("prizesDistributed", "==", false)
          .get(),
      ]);

      // Process leagues
      for (const doc of leaguesSnapshot.docs) {
        const league = doc.data() as League;
        const leagueId = doc.id;
        const participants = league.leagueParticipants || [];

        if (participants.length > 1) continue;

        const ownerId = league.leagueOwner?.userId;
        if (!ownerId) {
          console.warn(`⚠️ League ${leagueId} has no owner, skipping`);
          continue;
        }

        await sendNotification({
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: ownerId,
          senderId: "system",
          message: `You've created a league but haven't invited your players!`,
          type: notificationTypes.INFORMATION.LEAGUE.TYPE,
          data: {
            leagueId,
          },
        });
      }

      // Process tournaments
      for (const doc of tournamentsSnapshot.docs) {
        const tournament = doc.data() as Tournament;
        const tournamentId = doc.id;
        const participants = tournament.tournamentParticipants || [];

        if (participants.length > 1) continue;

        const ownerId = tournament.tournamentOwner?.userId;
        if (!ownerId) {
          console.warn(`⚠️ Tournament ${tournamentId} has no owner, skipping`);
          continue;
        }

        await sendNotification({
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: ownerId,
          senderId: "system",
          message: `You've created a tournament but haven't invited your players!`,
          type: notificationTypes.INFORMATION.TOURNAMENT.TYPE,
          data: {
            tournamentId,
          },
        });
      }
    } catch (error) {
      console.error("❌ Notify owners job failed:", error);
    }
  },
);
