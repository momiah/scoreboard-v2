import type { Court } from "@shared/types";

export const CHECKIN_RADIUS_METERS = 500;

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;
const toRadians = (deg: number): number => (deg * Math.PI) / 180;

export const distanceInMeters = (a: LatLng, b: LatLng): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};

export const getCourtCoords = (court?: Court | null): LatLng | null => {
  const latitude = court?.location?.latitude;
  const longitude = court?.location?.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  return { latitude, longitude };
};

export const isWithinCheckInRadius = (
  device: LatLng,
  court?: Court | null,
): boolean => {
  const courtCoords = getCourtCoords(court);
  if (!courtCoords) return false;
  return distanceInMeters(device, courtCoords) <= CHECKIN_RADIUS_METERS;
};

export const formatCourtAddress = (court?: Court | null): string =>
  [
    court?.courtName,
    court?.location?.address,
    court?.location?.city,
    court?.location?.postCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
