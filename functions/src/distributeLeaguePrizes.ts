import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import moment from "moment-timezone";

import {
  buildLeaguePrizeAllocations,
  hasPendingLeagueGames,
  LEAGUE_AUTO_APPROVE_HOURS,
} from "courtchamps-shared/helpers";
import { notificationTypes } from "courtchamps-shared";
import { writeClubCompetitionWon } from "./helpers/clubFeed";
import { sendNotification } from "./helpers/sendNotification";
import { League, Notification } from "courtchamps-shared/types";

const TIMEZONE = "Europe/London";

const leagueEnd = (endDateStr: string) =>
  moment.tz(endDateStr, ["DD-MM-YYYY", "DD/MM/YYYY"], TIMEZONE).endOf("day");

// Due once the end date's day is over and every game reported by then has
// been approved or declined; a game the auto-approval job can never settle
// does not hold the payout back past twice its window.
export const isLeaguePrizeDue = (
  league: League,
  now = moment.tz(TIMEZONE),
): boolean => {
  const end = leagueEnd(league.endDate);
  if (!end.isValid() || now.isBefore(end)) return false;
  if (!hasPendingLeagueGames(league)) return true;
  return now.isSameOrAfter(
    end.clone().add(LEAGUE_AUTO_APPROVE_HOURS * 2, "hours"),
  );
};

const placementMessage = (placementKey: string, name: string, xp: number) =>
  `You have placed ${placementKey} in ${name} and won ${xp} CP!`;

// Claims the league and pays every winner in one transaction, so a crash or
// an overlapping run can never pay a league twice.
export const distributePrizesForLeague = async (
  db: admin.firestore.Firestore,
  leagueRef: admin.firestore.DocumentReference,
) => {
  const notifications: Notification[] = [];

  const league = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(leagueRef);
    const data = snap.data() as League | undefined;
    if (!data || data.prizesDistributed || !isLeaguePrizeDue(data)) return null;

    notifications.length = 0;
    buildLeaguePrizeAllocations(data).forEach(
      ({ userId, prizeXP, placementKey }) => {
        transaction.update(db.collection("users").doc(userId), {
          "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
          [`profileDetail.leagueStats.${placementKey}`]:
            admin.firestore.FieldValue.increment(1),
        });
        notifications.push({
          createdAt: new Date(),
          type: notificationTypes.INFORMATION.LEAGUE.TYPE,
          message: placementMessage(placementKey, data.leagueName, prizeXP),
          isRead: false,
          senderId: "system",
          recipientId: userId,
          data: { leagueId: leagueRef.id },
          response: "",
        } as Notification);
      },
    );

    transaction.update(leagueRef, {
      prizesDistributed: true,
      prizeDistributionDate: admin.firestore.FieldValue.serverTimestamp(),
    });
    return data;
  });

  if (!league) return;

  for (const notification of notifications) {
    await sendNotification(notification);
  }

  const winner = notifications[0]
    ? (league.leagueParticipants || []).find(
        (p) => p.userId === notifications[0].recipientId,
      )
    : null;
  if (winner) {
    await writeClubCompetitionWon({
      clubId: (league as { clubId?: string | null }).clubId,
      competitionId: leagueRef.id,
      competitionType: "league",
      name: league.leagueName,
      winnerName: winner.username ?? "A player",
    });
  }

  console.log(
    `[prizes] ${leagueRef.id}: paid ${notifications.length} placements`,
  );
};

export const distributeLeaguePrizes = onSchedule(
  { schedule: "every 1 hours", timeZone: TIMEZONE },
  async () => {
    const db = admin.firestore();
    try {
      const leaguesSnapshot = await db
        .collection("leagues")
        .where("prizesDistributed", "==", false)
        .get();

      for (const doc of leaguesSnapshot.docs) {
        if (!isLeaguePrizeDue(doc.data() as League)) continue;
        try {
          await distributePrizesForLeague(db, doc.ref);
        } catch (error) {
          console.error(`[prizes] ${doc.id} error:`, error);
        }
      }

      console.log("[prizes] run complete");
    } catch (error) {
      console.error("[prizes] error:", error);
    }
  },
);
