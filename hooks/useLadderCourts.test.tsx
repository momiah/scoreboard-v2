import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import type { Court } from "@shared/types";

jest.mock("../context/UserContext", () => ({
  UserContext: require("react").createContext({}),
}));
jest.mock("../context/LeagueContext", () => ({
  LeagueContext: require("react").createContext({}),
}));
jest.mock("../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));

import { UserContext } from "../context/UserContext";
import { LeagueContext } from "../context/LeagueContext";
import { LadderContext } from "../context/LadderContext";
import { useLadderCourts } from "./useLadderCourts";

const court = (courtId: string, overrides: Record<string, unknown> = {}) =>
  ({
    courtId,
    courtName: `Court ${courtId}`,
    verified: true,
    location: { city: "London", country: "United Kingdom", countryCode: "GB" },
    ...overrides,
  }) as unknown as Court;

const pendingCourt = (courtId: string, submittedBy: string) =>
  court(courtId, {
    verified: false,
    submission: {
      status: "pending",
      ladderId: "L1",
      ladderName: "Ladder",
      submittedBy,
    },
  });

const ladderCourts = Array.from({ length: 86 }, (_, i) =>
  court(`ladder-${String(i).padStart(2, "0")}`),
);
const allCourts = [
  ...ladderCourts,
  pendingCourt("own-pending", "me"),
  pendingCourt("other-pending", "someone"),
  court("elsewhere"),
];
const ladderIds = ladderCourts.map((c) => c.courtId);

const mockFetchTeamMemberIds = jest.fn();
let fetchCount = 0;
const makeGetCourts = () => {
  fetchCount += 1;
  return new Promise<Court[]>((resolve) =>
    setTimeout(() => resolve(allCourts), 20),
  );
};

const wrapperFor = (getCourtsFactory: () => () => Promise<Court[]>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserContext.Provider
      value={{ currentUser: { userId: "me", username: "me" } } as never}
    >
      <LadderContext.Provider
        value={{ fetchLadderTeamMemberIds: mockFetchTeamMemberIds } as never}
      >
        <LeagueContext.Provider
          value={
            { getCourts: getCourtsFactory(), addCourt: jest.fn() } as never
          }
        >
          {children}
        </LeagueContext.Provider>
      </LadderContext.Provider>
    </UserContext.Provider>
  );
  return Wrapper;
};

beforeEach(() => {
  fetchCount = 0;
  mockFetchTeamMemberIds.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("useLadderCourts", () => {
  const ladder = {
    ladderId: "L1",
    ladderType: "Singles",
    name: "Ladder",
    courtIds: ladderIds,
  } as never;

  it("lists every ladder court plus pending submissions, flagging only the player's own as pinned", async () => {
    const wrapper = wrapperFor(() => makeGetCourts);
    const { result } = renderHook(() => useLadderCourts(ladder, true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.courtsLoading).toBe(false));

    const keys = result.current.courtsList.map((item) => item.key);
    expect(keys).toHaveLength(86 + 2);
    expect(keys).toEqual(expect.arrayContaining(ladderIds));
    expect(keys).toContain("other-pending");
    expect(keys).not.toContain("elsewhere");
    const byKey = (key: string) =>
      result.current.courtsList.find((item) => item.key === key);
    expect(byKey("own-pending")).toMatchObject({
      awaitingVerification: true,
      pinned: true,
    });
    expect(byKey("other-pending")).toMatchObject({
      awaitingVerification: true,
      pinned: false,
    });
    expect(byKey("ladder-00")?.awaitingVerification).toBeFalsy();
  });

  it("fetches the courts once even when the court context re-renders with a new function each time", async () => {
    const wrapper = wrapperFor(() => () => makeGetCourts());
    const { result, rerender } = renderHook(
      () => useLadderCourts(ladder, true),
      { wrapper },
    );

    rerender({});
    rerender({});
    rerender({});
    await waitFor(() => expect(result.current.courtsLoading).toBe(false));

    expect(fetchCount).toBe(1);
    expect(result.current.courtsList).toHaveLength(86 + 2);
  });

  it("does not fetch while the picker is closed and fetches when it opens", async () => {
    const wrapper = wrapperFor(() => makeGetCourts);
    const { result, rerender } = renderHook(
      ({ visible }: { visible: boolean }) => useLadderCourts(ladder, visible),
      { wrapper, initialProps: { visible: false } },
    );

    expect(fetchCount).toBe(0);

    rerender({ visible: true });
    await waitFor(() => expect(result.current.courtsLoading).toBe(false));

    expect(fetchCount).toBe(1);
  });

  it("re-applies the loaded courts when the ladder's courtIds change without refetching", async () => {
    const wrapper = wrapperFor(() => makeGetCourts);
    const { result, rerender } = renderHook(
      ({ courtIds }: { courtIds: string[] }) =>
        useLadderCourts({ ...(ladder as object), courtIds } as never, true),
      { wrapper, initialProps: { courtIds: ladderIds.slice(0, 2) } },
    );
    await waitFor(() => expect(result.current.courtsLoading).toBe(false));
    expect(result.current.courtsList).toHaveLength(2 + 2);

    act(() => rerender({ courtIds: ladderIds }));

    expect(result.current.courtsList).toHaveLength(86 + 2);
    expect(fetchCount).toBe(1);
  });

  describe("doubles", () => {
    const doublesLadder = {
      ladderId: "L1",
      ladderType: "Doubles",
      name: "Ladder",
      courtIds: ladderIds,
    } as never;

    it("pins a court submitted by the team mate as well as the player's own", async () => {
      mockFetchTeamMemberIds.mockResolvedValue(["me", "someone"]);
      const wrapper = wrapperFor(() => makeGetCourts);
      const { result } = renderHook(
        () => useLadderCourts(doublesLadder, true),
        { wrapper },
      );

      await waitFor(() => expect(result.current.courtsLoading).toBe(false));

      expect(mockFetchTeamMemberIds).toHaveBeenCalledWith("L1", "me");
      const pinned = result.current.courtsList
        .filter((item) => item.pinned)
        .map((item) => item.key);
      expect(pinned.sort()).toEqual(["other-pending", "own-pending"]);
    });

    it("falls back to the player's own submissions when the team lookup fails", async () => {
      mockFetchTeamMemberIds.mockRejectedValue(new Error("offline"));
      const wrapper = wrapperFor(() => makeGetCourts);
      const { result } = renderHook(
        () => useLadderCourts(doublesLadder, true),
        { wrapper },
      );

      await waitFor(() => expect(result.current.courtsLoading).toBe(false));

      const pinned = result.current.courtsList
        .filter((item) => item.pinned)
        .map((item) => item.key);
      expect(pinned).toEqual(["own-pending"]);
      expect(result.current.courtsList).toHaveLength(86 + 2);
    });

    it("does not look up a team for a singles ladder", async () => {
      const wrapper = wrapperFor(() => makeGetCourts);
      const { result } = renderHook(() => useLadderCourts(ladder, true), {
        wrapper,
      });

      await waitFor(() => expect(result.current.courtsLoading).toBe(false));

      expect(mockFetchTeamMemberIds).not.toHaveBeenCalled();
      const pinned = result.current.courtsList
        .filter((item) => item.pinned)
        .map((item) => item.key);
      expect(pinned).toEqual(["own-pending"]);
    });
  });
});
