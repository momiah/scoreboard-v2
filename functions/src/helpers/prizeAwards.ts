import * as admin from "firebase-admin";
import { getPlacementStatKey } from "courtchamps-shared/helpers";

export type PlacementStatsField = "leagueStats" | "tournamentStats" | "ladderStats";

export const buildPrizeAwardUpdate = ({
  cp,
  statsField,
  place,
}: {
  cp: number;
  statsField: PlacementStatsField;
  place: number;
}): Record<string, admin.firestore.FieldValue> => {
  const placementKey = getPlacementStatKey(place);
  return {
    "profileDetail.XP": admin.firestore.FieldValue.increment(cp),
    ...(placementKey
      ? {
          [`profileDetail.${statsField}.${placementKey}`]:
            admin.firestore.FieldValue.increment(1),
        }
      : {}),
  };
};
