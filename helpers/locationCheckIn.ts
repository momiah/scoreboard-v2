import {
  CHECKIN_RADIUS_METERS,
  distanceInMeters,
  getCourtCoords,
} from "@shared/helpers";
import type { LatLng } from "@shared/helpers";
import type { Court } from "@shared/types";

export const isWithinCheckInRadius = (
  device: LatLng,
  court?: Court | null,
): boolean => {
  const courtCoords = getCourtCoords(court);
  if (!courtCoords) return false;
  return distanceInMeters(device, courtCoords) <= CHECKIN_RADIUS_METERS;
};

const joinAddress = (parts: (string | undefined)[]): string =>
  parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

export const formatCourtLocation = (court?: Court | null): string =>
  joinAddress([
    court?.location?.address,
    court?.location?.city,
    court?.location?.postCode,
  ]);

export const formatCourtAddress = (court?: Court | null): string =>
  joinAddress([court?.courtName, formatCourtLocation(court)]);
