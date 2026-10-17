import React from "react";
import { act, renderHook } from "@testing-library/react-native";

const mockSendNotification = jest.fn(
  async (_notification: { recipientId: string; message: string }) => {},
);
const mockRespondToPlayoffMatch = jest.fn();
const mockToast = jest.fn();

jest.mock("../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));
jest.mock("../context/UserContext", () => ({
  UserContext: require("react").createContext({}),
}));
jest.mock("../context/PopupContext", () => ({
  PopupContext: require("react").createContext({}),
}));

import { usePlayoffMatchScheduling } from "./usePlayoffMatchScheduling";

const { LadderContext } = require("../context/LadderContext");
const { UserContext } = require("../context/UserContext");
const { PopupContext } = require("../context/PopupContext");

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserContext.Provider
    value={{
      currentUser: {
        userId: "host",
        firstName: "Mo",
        lastName: "Miah",
        username: "mo",
      },
      sendNotification: mockSendNotification,
    }}
  >
    <PopupContext.Provider value={{ showBottomToast: mockToast }}>
      <LadderContext.Provider
        value={{ respondToPlayoffMatch: mockRespondToPlayoffMatch }}
      >
        {children}
      </LadderContext.Provider>
    </PopupContext.Provider>
  </UserContext.Provider>
);

const match = (overrides: Record<string, unknown> = {}) =>
  ({
    ladderMatchId: "r1-s0-leg1",
    playoffTieId: "r1-s0",
    playoffLeg: 1,
    matchStatus: "posted",
    court: { courtName: "Bethnal Green" },
    matchDate: "20-10-2026",
    matchTime: { start: "18:00" },
    participants: ["host", "away"],
    createdBy: "host",
    ...overrides,
  }) as never;

const messages = () =>
  mockSendNotification.mock.calls.map(([n]) => [n.recipientId, n.message]);

beforeEach(() => {
  mockSendNotification.mockClear();
  mockRespondToPlayoffMatch.mockReset();
});

describe("usePlayoffMatchScheduling", () => {
  it("tells the opponent a match was arranged, mentioning decline only while it's allowed", async () => {
    const { result } = renderHook(() => usePlayoffMatchScheduling(), {
      wrapper,
    });
    await act(() =>
      result.current.notifyArranged({
        ladderId: "L1",
        match: match(),
        opponentIds: ["away"],
      }),
    );
    await act(() =>
      result.current.notifyArranged({
        ladderId: "L1",
        match: match({ scheduleDeclines: 1 }),
        opponentIds: ["away"],
      }),
    );
    expect(messages()).toEqual([
      [
        "away",
        expect.stringMatching(
          /arranged playoff match 1 at Bethnal Green, Tue 20 Oct, 18:00\. Open it to accept or decline\. It's accepted automatically if you don't reply within \d+ hours\.$/,
        ),
      ],
      [
        "away",
        expect.stringMatching(
          /Open it to accept\. It's accepted automatically if you don't reply within \d+ hours\.$/,
        ),
      ],
    ]);
  });

  it("tells the host when the opponent accepts or declines", async () => {
    mockRespondToPlayoffMatch.mockResolvedValue({
      success: true,
      notifyUserIds: ["host2"],
    });
    const { result } = renderHook(() => usePlayoffMatchScheduling(), {
      wrapper,
    });
    await act(() =>
      result.current.respond({ ladderId: "L1", match: match(), accept: true }),
    );
    await act(() =>
      result.current.respond({ ladderId: "L1", match: match(), accept: false }),
    );
    expect(messages()).toEqual([
      [
        "host2",
        expect.stringMatching(/accepted playoff match 1 at Bethnal Green/),
      ],
      [
        "host2",
        expect.stringMatching(
          /can't make playoff match 1 at Bethnal Green, .*\. Arrange another time\.$/,
        ),
      ],
    ]);
  });
});
