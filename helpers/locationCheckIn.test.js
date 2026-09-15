import { getCourtCoords, isWithinCheckInRadius } from "./locationCheckIn";

const court = (latitude, longitude) => ({ location: { latitude, longitude } });

describe("getCourtCoords", () => {
  it("reads numeric coordinates", () => {
    expect(getCourtCoords(court(51.5, -0.12))).toEqual({
      latitude: 51.5,
      longitude: -0.12,
    });
  });

  it("coerces numeric strings", () => {
    expect(getCourtCoords(court("51.5", "-0.12"))).toEqual({
      latitude: 51.5,
      longitude: -0.12,
    });
  });

  it("returns null when a coordinate is missing or non-numeric", () => {
    expect(getCourtCoords(court(51.5, undefined))).toBeNull();
    expect(getCourtCoords(court("abc", "-0.12"))).toBeNull();
    expect(getCourtCoords(null)).toBeNull();
  });
});

describe("isWithinCheckInRadius", () => {
  const venue = court(51.5, -0.12);

  it("passes a device essentially on the court", () => {
    expect(isWithinCheckInRadius({ latitude: 51.5, longitude: -0.12 }, venue)).toBe(
      true,
    );
  });

  it("fails a device far away", () => {
    expect(
      isWithinCheckInRadius({ latitude: 52.5, longitude: -0.12 }, venue),
    ).toBe(false);
  });
});
