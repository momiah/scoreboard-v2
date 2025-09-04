import { collection, getDocs, updateDoc } from "firebase/firestore";

import { db } from "../services/firebase.config";
import { getUserById } from "./firebaseFunctions";

const formatNamePart = (input = "") => {
  const word = String(input).trim().split(/\s+/)[0] || "";
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "";
};

export const backfillLeagueParticipantNames = async () => {
  try {
    const leaguesSnapshot = await getDocs(collection(db, "leagues"));

    let leaguesUpdated = 0;
    let participantsUpdated = 0;

    for (const leagueDoc of leaguesSnapshot.docs) {
      const leagueData = leagueDoc.data() || {};
      const participants = Array.isArray(leagueData.leagueParticipants)
        ? leagueData.leagueParticipants
        : [];
      if (!participants.length) continue;

      const updatedParticipants = [];
      for (const participant of participants) {
        const userId = participant?.userId;
        const user = userId ? await getUserById(userId) : null;

        updatedParticipants.push({
          ...participant,
          firstName: formatNamePart(user?.firstName),
          lastName: formatNamePart(user?.lastName),
        });

        participantsUpdated += 1;
      }

      await updateDoc(leagueDoc.ref, {
        leagueParticipants: updatedParticipants,
      });
      leaguesUpdated += 1;
    }

    return { leaguesUpdated, participantsUpdated };
  } catch (err) {
    console.error("backfillLeagueNames failed:", err);
    throw err;
  }
};
