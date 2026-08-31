import type { Court } from "@shared/types";

export const buildCourtMapsUrl = (court?: Court | null): string => {
  const lat = court?.location?.latitude;
  const lng = court?.location?.longitude;

  const query =
    typeof lat === "number" && typeof lng === "number"
      ? `${lat},${lng}`
      : [
          court?.courtName,
          court?.location?.address,
          court?.location?.city,
          court?.location?.postCode,
          court?.location?.country,
        ]
          .filter(Boolean)
          .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
};
