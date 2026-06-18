import { Court } from "@shared/types";
import { CourtListItem } from "../components/Modals/SearchLocationModal";

export const formatCourtDetailsForList = (courts: Court[]): CourtListItem[] =>
  courts.map((court) => ({
    key: court.id as string,
    value: court.courtName.trim(),
    description: `${court.location?.city}, ${court.location?.country}`,
    countryCode: court.location?.countryCode,
    city: court.location?.city,
    country: court.location?.country,
    address: court.location?.address,
    postCode: court.location?.postCode,
  }));
