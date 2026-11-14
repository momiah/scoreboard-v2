import * as Location from "expo-location";
import { getFunctions, httpsCallable } from "firebase/functions";

import {
  getLadderEligibilityMessage,
  requiresLadderLocationCheck,
} from "@shared/helpers";
import type {
  LadderArrivalReading,
  LadderEligibilityResult,
} from "@shared/helpers";
import type { Ladder } from "@shared/types";

import { getDevicePosition } from "./devicePosition";
import { toLadderArrivalReading } from "./ladderArrival";

const ATTEMPT_MESSAGES = {
  permission: "Allow location access so we can check you're near this ladder's courts.",
  unavailable: "We couldn't get your location. Please try again.",
  error: "Couldn't check your location. Please try again.",
} as const;

/**
 * Free ladders: confirms with the server that the user is near one of the
 * ladder's courts. Returns null when they may join, or the message to show.
 */
export const checkLadderEligibility = async (
  ladder: Pick<Ladder, "ladderId" | "entryFee">,
): Promise<string | null> => {
  if (!requiresLadderLocationCheck(ladder)) return null;
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return ATTEMPT_MESSAGES.permission;
  const position = await getDevicePosition();
  if (!position) return ATTEMPT_MESSAGES.unavailable;
  try {
    const verify = httpsCallable<
      { ladderId: string; reading: LadderArrivalReading },
      LadderEligibilityResult
    >(getFunctions(), "verifyLadderEligibility");
    const { data } = await verify({
      ladderId: ladder.ladderId,
      reading: toLadderArrivalReading(position),
    });
    return data.ok ? null : getLadderEligibilityMessage(data);
  } catch (error) {
    console.error("Error checking ladder eligibility:", error);
    return ATTEMPT_MESSAGES.error;
  }
};
