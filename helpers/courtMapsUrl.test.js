import { buildCourtMapsUrl } from "./courtMapsUrl";

describe("buildCourtMapsUrl", () => {
  it("uses lat/lng when both are present", () => {
    const court = {
      courtName: "Acton Badminton Club",
      location: { latitude: 51.5, longitude: -0.26, city: "London" },
    };
    expect(buildCourtMapsUrl(court)).toBe(
      "https://www.google.com/maps/search/?api=1&query=51.5%2C-0.26",
    );
  });

  it("falls back to an address query when coordinates are missing", () => {
    const court = {
      courtName: "Acton Badminton Club",
      location: {
        latitude: null,
        longitude: null,
        address: "1 High St",
        city: "London",
        postCode: "W3 6NG",
        country: "UK",
      },
    };
    expect(buildCourtMapsUrl(court)).toBe(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Acton Badminton Club, 1 High St, London, W3 6NG, UK"),
    );
  });

  it("skips empty address parts", () => {
    const court = {
      courtName: "Riverside Centre",
      location: { latitude: null, longitude: null, city: "Manchester" },
    };
    expect(buildCourtMapsUrl(court)).toBe(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Riverside Centre, Manchester"),
    );
  });

  it("handles a missing court without throwing", () => {
    expect(buildCourtMapsUrl(null)).toBe(
      "https://www.google.com/maps/search/?api=1&query=",
    );
  });
});
