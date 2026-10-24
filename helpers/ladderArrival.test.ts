const mockRequestPermission = jest.fn();
const mockRecord = jest.fn();
const mockGetPosition = jest.fn();

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: () => mockRequestPermission(),
}));
jest.mock("firebase/functions", () => ({
  getFunctions: () => ({}),
  httpsCallable: () => mockRecord,
}));
jest.mock("./devicePosition", () => ({
  getDevicePosition: () => mockGetPosition(),
}));

import {
  confirmLadderArrival,
  ladderArrivalMessage,
  toLadderArrivalReading,
} from "./ladderArrival";

const position = {
  coords: { latitude: 51.5, longitude: -0.1, accuracy: 12 },
  timestamp: 1000,
  mocked: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  mockRequestPermission.mockResolvedValue({ granted: true });
  mockGetPosition.mockResolvedValue(position);
});

describe("toLadderArrivalReading", () => {
  it("passes the coordinates, accuracy, time and the mocked flag to the server", () => {
    expect(toLadderArrivalReading(position as never)).toEqual({
      latitude: 51.5,
      longitude: -0.1,
      accuracy: 12,
      timestamp: 1000,
      mocked: true,
    });
  });
});

describe("confirmLadderArrival", () => {
  it("returns the server's verdict", async () => {
    mockRecord.mockResolvedValue({
      data: { ok: true, distanceMeters: 30, opponentArrived: true },
    });
    expect(
      await confirmLadderArrival({ ladderId: "L1", matchId: "m1" }),
    ).toEqual({
      ok: true,
      distanceMeters: 30,
      opponentArrived: true,
    });
    expect(mockRecord).toHaveBeenCalledWith({
      ladderId: "L1",
      matchId: "m1",
      reading: toLadderArrivalReading(position as never),
    });
  });

  it("stops without location access or a position, and reports a failed call", async () => {
    mockRequestPermission.mockResolvedValueOnce({ granted: false });
    expect(
      await confirmLadderArrival({ ladderId: "L1", matchId: "m1" }),
    ).toEqual({ ok: false, reason: "permission" });
    mockGetPosition.mockResolvedValueOnce(null);
    expect(
      await confirmLadderArrival({ ladderId: "L1", matchId: "m1" }),
    ).toEqual({ ok: false, reason: "unavailable" });
    mockRecord.mockRejectedValueOnce(new Error("offline"));
    expect(
      await confirmLadderArrival({ ladderId: "L1", matchId: "m1" }),
    ).toEqual({ ok: false, reason: "error" });
  });
});

describe("ladderArrivalMessage", () => {
  it("explains each refusal", () => {
    expect(ladderArrivalMessage("mocked")).toMatch(/mock-location app/);
    expect(ladderArrivalMessage("permission")).toMatch(/Allow location access/);
  });
});
