import { isInVideoLoadWindow } from "./videoLoadWindow";

describe("isInVideoLoadWindow", () => {
  it("loads nothing before a video is active", () => {
    expect(isInVideoLoadWindow(0, -1)).toBe(false);
  });

  it("loads the active video and its neighbours only", () => {
    expect([0, 1, 2, 3, 4].map((i) => isInVideoLoadWindow(i, 2))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});
