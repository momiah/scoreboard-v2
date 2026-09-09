import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  deleteField,
} from "firebase/firestore";

interface BackfillResult {
  ladders: number;
  participantsUpdated: number;
}

// One-off migration: copy each ladder participant's legacy `XP` field into
// `competitionXP` (and drop the old field) after the ScoreboardProfile.XP ->
// competitionXP rename. Idempotent — participants that already have
// `competitionXP` are skipped. Ladder teams keep `XP` (TeamStats is unchanged).
export const backfillCompetitionXP = async (): Promise<BackfillResult> => {
  const db = getFirestore();
  let ladders = 0;
  let participantsUpdated = 0;

  const laddersSnap = await getDocs(collection(db, "ladders"));

  for (const ladderDoc of laddersSnap.docs) {
    ladders += 1;
    const participantsSnap = await getDocs(
      collection(db, "ladders", ladderDoc.id, "ladderParticipants"),
    );

    let batch = writeBatch(db);
    let ops = 0;

    for (const participant of participantsSnap.docs) {
      const data = participant.data();
      if (data.competitionXP === undefined && data.XP !== undefined) {
        batch.update(participant.ref, {
          competitionXP: data.XP ?? 0,
          XP: deleteField(),
        });
        participantsUpdated += 1;
        if (++ops >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }
    }

    if (ops > 0) await batch.commit();
  }

  return { ladders, participantsUpdated };
};
