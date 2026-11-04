import { getLeagueLocationDetails } from "./getLeagueLocationDetails";
import { formatCourtDetailsForList } from "./formatCourtDetails";

// The shape getCourts returns: the doc id as courtId, then the doc data.
const courts = [
  {
    courtId: "Highbury-Fields-London-UK-ABC12",
    courtName: "Highbury Fields",
    location: { city: "London", country: "United Kingdom", countryCode: "GB" },
  },
  {
    courtId: "Platt-Fields-Manchester-UK-XYZ34",
    courtName: "Platt Fields",
    location: { city: "Manchester", country: "United Kingdom", countryCode: "GB" },
  },
];

describe("getLeagueLocationDetails", () => {
  it("finds the court picked from the list getCourts and formatCourtDetailsForList build", () => {
    const picked = formatCourtDetailsForList(courts)[1];
    expect(getLeagueLocationDetails(courts, picked)).toEqual({
      city: "Manchester",
      country: "United Kingdom",
      countryCode: "GB",
      courtName: "Platt Fields",
      courtId: "Platt-Fields-Manchester-UK-XYZ34",
    });
  });
});
