import * as Location from "expo-location";
import { getFunctions, httpsCallable } from "firebase/functions";

import { LADDER_ARRIVAL_REJECTION_MESSAGES } from "@shared/helpers";
import type {
  LadderArrivalReading,
  LadderArrivalRejection,
  LadderArrivalResult,
} from "@shared/helpers";

import { getDevicePosition } from "./devicePosition";

export type LadderArrivalAttempt =
  | LadderArrivalResult
  | { ok: false; reason: "permission" | "unavailable" | "error" };

export const toLadderArrivalReading = (
  position: Location.LocationObject,
): LadderArrivalReading => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy ?? null,
  timestamp: position.timestamp,
  mocked: position.mocked === true,
});

export const sendLadderArrival = async ({
  ladderId,
  matchId,
  position,
}: {
  ladderId: string;
  matchId: string;
  position: Location.LocationObject;
}): Promise<LadderArrivalResult | null> => {
  try {
    const record = httpsCallable<
      { ladderId: string; matchId: string; reading: LadderArrivalReading },
      LadderArrivalResult
    >(getFunctions(), "recordLadderArrival");
    const { data } = await record({
      ladderId,
      matchId,
      reading: toLadderArrivalReading(position),
    });
    return data;
  } catch (error) {
    console.error("Error recording ladder arrival:", error);
    return null;
  }
};

export const confirmLadderArrival = async ({
  ladderId,
  matchId,
}: {
  ladderId: string;
  matchId: string;
}): Promise<LadderArrivalAttempt> => {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return { ok: false, reason: "permission" };
  const position = await getDevicePosition();
  if (!position) return { ok: false, reason: "unavailable" };
  return (
    (await sendLadderArrival({ ladderId, matchId, position })) ?? {
      ok: false,
      reason: "error",
    }
  );
};

const ATTEMPT_MESSAGES: Record<"permission" | "unavailable" | "error", string> =
  {
    permission: "Allow location access, then try again.",
    unavailable: "We couldn't get your location. Please try again.",
    error: "Couldn't confirm your location. Please try again.",
  };

export const ladderArrivalMessage = (
  reason: LadderArrivalRejection | "permission" | "unavailable" | "error",
): string =>
  reason in ATTEMPT_MESSAGES
    ? ATTEMPT_MESSAGES[reason as keyof typeof ATTEMPT_MESSAGES]
    : LADDER_ARRIVAL_REJECTION_MESSAGES[reason as LadderArrivalRejection];
