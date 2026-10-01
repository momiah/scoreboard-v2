import { addDoc, collection, doc, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { fetchActiveDisputeByGame } from "../services/disputes";
import {
  planDisputeResolution,
  getDisputePlayerIds,
  isDoublesDispute,
  DISPUTES_COLLECTION,
  notificationSchema,
  notificationTypes,
} from "@shared";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const USERS = "users";

export const mockResolveDispute = async ({
  ladderId,
  matchId,
  gameId,
  resolution,
  actorId,
  note,
}) => {
  if (!ladderId || !matchId || !gameId || !resolution || !actorId) {
    throw new Error(
      "mockResolveDispute: ladderId, matchId, gameId, resolution and actorId are all required",
    );
  }

  const activeDispute = await fetchActiveDisputeByGame(gameId);
  if (!activeDispute) {
    throw new Error(`mockResolveDispute: no active dispute found for game ${gameId}`);
  }
  const disputeRef = doc(db, DISPUTES_COLLECTION, activeDispute.disputeId);

  const outcome = await runTransaction(db, async (tx) => {
    const disputeSnap = await tx.get(disputeRef);
    if (!disputeSnap.exists()) throw new Error("Dispute not found");
    const dispute = disputeSnap.data();

    const matchRef = doc(db, LADDERS, ladderId, LADDER_MATCHES, matchId);
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists()) throw new Error("Match not found");
    const match = matchSnap.data();

    const participantRef = (uid) =>
      doc(db, LADDERS, ladderId, LADDER_PARTICIPANTS, uid);
    const teamRef = (teamKey) => doc(db, LADDERS, ladderId, LADDER_TEAMS, teamKey);
    const userRef = (uid) => doc(db, USERS, uid);
    const playerIds = getDisputePlayerIds(dispute.originalGame);

    const [participantSnaps, userSnaps, teamSnaps] = await Promise.all([
      Promise.all(playerIds.map((uid) => tx.get(participantRef(uid)))),
      Promise.all(playerIds.map((uid) => tx.get(userRef(uid)))),
      Promise.all(
        isDoublesDispute(dispute, match)
          ? (match.teams ?? []).map((t) => tx.get(teamRef(t.teamKey)))
          : [],
      ),
    ]);

    const plan = await planDisputeResolution({
      dispute,
      match,
      participants: participantSnaps.filter((s) => s.exists()).map((s) => s.data()),
      users: userSnaps.filter((s) => s.exists()).map((s) => s.data()),
      ladderTeams: teamSnaps.filter((s) => s.exists()).map((s) => s.data()),
      resolution,
      actorId,
      note,
      now: new Date(),
    });

    plan.participants.forEach((p) => {
      if (p.userId) tx.set(participantRef(p.userId), p);
    });
    plan.users.forEach((u) =>
      tx.update(userRef(u.userId), { profileDetail: u.profileDetail }),
    );
    plan.teams.forEach((team) => tx.set(teamRef(team.teamKey), team));
    tx.update(matchRef, plan.matchUpdate);
    tx.update(disputeRef, plan.disputeUpdate);

    return { success: true, finalGame: plan.finalGame };
  });

  await addDoc(collection(db, "users", actorId, "notifications"), {
    ...notificationSchema,
    createdAt: new Date(),
    recipientId: actorId,
    senderId: "system",
    message: `Your disputed game was ${resolution}${note ? ` — ${note}` : ""}`,
    type: notificationTypes.INFORMATION.LADDER_DISPUTE.TYPE,
    data: { disputeId: activeDispute.disputeId, ladderId },
  });

  return outcome;
};
