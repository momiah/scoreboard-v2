jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

import * as Location from "expo-location";
import { getDevicePosition, withTimeout } from "./devicePosition";

const fix = (latitude: number) => ({ coords: { latitude, longitude: 0 } });

describe("withTimeout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("resolves with the value when it arrives in time", async () => {
    await expect(withTimeout(Promise.resolve(1), 1000)).resolves.toBe(1);
  });

  it("resolves null when the promise never settles", async () => {
    const pending = withTimeout(new Promise<number>(() => {}), 1000);
    jest.advanceTimersByTime(1000);
    await expect(pending).resolves.toBeNull();
  });

  it("propagates rejections", async () => {
    await expect(withTimeout(Promise.reject(new Error("no")), 1000)).rejects.toThrow("no");
  });
});

describe("getDevicePosition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the live fix", async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(fix(1));
    await expect(getDevicePosition()).resolves.toEqual(fix(1));
    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it("falls back to the last known fix when the live one hangs", async () => {
    jest.useFakeTimers();
    (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(new Promise(() => {}));
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue(fix(2));
    const result = getDevicePosition();
    await jest.advanceTimersByTimeAsync(15000);
    await expect(result).resolves.toEqual(fix(2));
    jest.useRealTimers();
  });

  it("returns null when there is no live or recent fix", async () => {
    jest.useFakeTimers();
    (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(new Promise(() => {}));
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue(null);
    const result = getDevicePosition();
    await jest.advanceTimersByTimeAsync(15000);
    await expect(result).resolves.toBeNull();
    jest.useRealTimers();
  });
});
