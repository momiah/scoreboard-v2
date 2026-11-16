const mockRequestPermission = jest.fn();
const mockVerify = jest.fn();
const mockGetPosition = jest.fn();

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: () => mockRequestPermission(),
}));
jest.mock("firebase/functions", () => ({
  getFunctions: () => ({}),
  httpsCallable: () => mockVerify,
}));
jest.mock("./devicePosition", () => ({
  getDevicePosition: () => mockGetPosition(),
}));

import { getLadderEligibilityMessage } from "@shared/helpers";
import { checkLadderEligibility } from "./ladderEligibility";

const freeLadder = { ladderId: "L1", entryFee: 0 };
const position = {
  coords: { latitude: 51.5, longitude: -0.1, accuracy: 40 },
  timestamp: 1000,
  mocked: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  mockRequestPermission.mockResolvedValue({ granted: true });
  mockGetPosition.mockResolvedValue(position);
});

describe("checkLadderEligibility", () => {
  it("skips paid ladders without asking for location", async () => {
    expect(await checkLadderEligibility({ ladderId: "L1", entryFee: 20 })).toBeNull();
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("lets the user join when the server confirms they are near", async () => {
    mockVerify.mockResolvedValue({ data: { ok: true, distanceMiles: 2, nearestCourtId: "c1" } });
    expect(await checkLadderEligibility(freeLadder)).toBeNull();
    expect(mockVerify).toHaveBeenCalledWith({
      ladderId: "L1",
      reading: { latitude: 51.5, longitude: -0.1, accuracy: 40, timestamp: 1000, mocked: false },
    });
  });

  it("shows the server's reason when the user is too far away", async () => {
    const rejection = { ok: false, reason: "too_far", distanceMiles: 160, radiusMiles: 40 };
    mockVerify.mockResolvedValue({ data: rejection });
    expect(await checkLadderEligibility(freeLadder)).toBe(
      getLadderEligibilityMessage(rejection as never),
    );
  });

  it("asks for location access, a position, or a retry when those fail", async () => {
    mockRequestPermission.mockResolvedValueOnce({ granted: false });
    expect(await checkLadderEligibility(freeLadder)).toMatch(/Allow location access/);
    mockGetPosition.mockResolvedValueOnce(null);
    expect(await checkLadderEligibility(freeLadder)).toMatch(/couldn't get your location/);
    mockVerify.mockRejectedValueOnce(new Error("offline"));
    expect(await checkLadderEligibility(freeLadder)).toMatch(/Couldn't check your location/);
  });
});
