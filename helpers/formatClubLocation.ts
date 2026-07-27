import type { Location } from "@shared/types";

/** Club location object (Location without the postCode field). */
export type ClubLocation = Omit<Location, "postCode">;

/**
 * Render a club location as "City, Country". Tolerates the legacy shape where
 * clubLocation was stored as a plain string, so older club docs still display.
 */
export const formatClubLocation = (
  location?: ClubLocation | string | null,
): string => {
  if (!location) return "";
  if (typeof location === "string") return location;
  return [location.city, location.country].filter(Boolean).join(", ");
};
