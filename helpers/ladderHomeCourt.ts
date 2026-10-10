import { LADDER_HOME_COURT_MAX_CHANGES } from "@shared/types";
import type { Court, LadderHomeCourt } from "@shared/types";

export { LADDER_HOME_COURT_MAX_CHANGES };
export type { LadderHomeCourt };

export interface LadderHomeCourtState {
  homeCourt?: LadderHomeCourt | null;
  homeCourtChanges?: number;
}

export const hasLadderHomeCourt = (
  state: LadderHomeCourtState | null | undefined,
): boolean => !!state?.homeCourt?.courtId;

export const canChangeLadderHomeCourt = (
  state: LadderHomeCourtState | null | undefined,
): boolean =>
  !hasLadderHomeCourt(state) ||
  (state?.homeCourtChanges ?? 0) < LADDER_HOME_COURT_MAX_CHANGES;

export const nextLadderHomeCourtChanges = (
  state: LadderHomeCourtState | null | undefined,
): number =>
  hasLadderHomeCourt(state) ? (state?.homeCourtChanges ?? 0) + 1 : 0;

export const toLadderHomeCourt = (court: Court): LadderHomeCourt => ({
  courtId: court.courtId,
  courtName: court.courtName.trim(),
  location: {
    city: court.location?.city ?? "",
    country: court.location?.country ?? "",
    countryCode: court.location?.countryCode ?? "",
    postCode: court.location?.postCode ?? "",
    address: court.location?.address ?? "",
    latitude: court.location?.latitude ?? null,
    longitude: court.location?.longitude ?? null,
  },
});
