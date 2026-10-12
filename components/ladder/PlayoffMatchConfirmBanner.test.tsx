import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

const mockRespond = jest.fn(async () => {});
jest.mock("../../hooks/usePlayoffMatchScheduling", () => ({
  usePlayoffMatchScheduling: () => ({ respond: mockRespond }),
}));

import PlayoffMatchConfirmBanner from "./PlayoffMatchConfirmBanner";

const match = (overrides: Record<string, unknown> = {}) =>
  ({
    ladderMatchId: "r1-s0-leg1",
    playoffTieId: "r1-s0",
    playoffLeg: 1,
    matchStatus: "posted",
    participants: ["host", "away"],
    createdBy: "host",
    games: [],
    ...overrides,
  }) as never;

beforeEach(() => mockRespond.mockClear());

describe("PlayoffMatchConfirmBanner", () => {
  it("lets the away side decline", () => {
    const { getByTestId, getByText } = render(
      <PlayoffMatchConfirmBanner ladderId="L1" match={match()} userId="away" />,
    );
    expect(
      getByText("Your opponent arranged this match. Can you make it?"),
    ).toBeTruthy();
    fireEvent.press(getByTestId("playoff-match-confirm-decline"));
    expect(mockRespond).toHaveBeenCalledWith(
      expect.objectContaining({ accept: false }),
    );
  });

  it("lets the away side accept", () => {
    const { getByTestId } = render(
      <PlayoffMatchConfirmBanner ladderId="L1" match={match()} userId="away" />,
    );
    fireEvent.press(getByTestId("playoff-match-confirm-accept"));
    expect(mockRespond).toHaveBeenCalledWith(
      expect.objectContaining({ accept: true }),
    );
  });

  it("only offers accept after the one decline is used", () => {
    const { queryByTestId, getByText } = render(
      <PlayoffMatchConfirmBanner
        ladderId="L1"
        match={match({ scheduleDeclines: 1 })}
        userId="away"
      />,
    );
    expect(
      getByText(
        "Your opponent arranged this match. You've used your one decline, so please accept.",
      ),
    ).toBeTruthy();
    expect(queryByTestId("playoff-match-confirm-decline")).toBeNull();
    expect(queryByTestId("playoff-match-confirm-accept")).toBeTruthy();
  });

  it("tells the host it's waiting, and shows nothing once accepted or to onlookers", () => {
    expect(
      render(
        <PlayoffMatchConfirmBanner
          ladderId="L1"
          match={match()}
          userId="host"
        />,
      ).getByTestId("playoff-match-confirm-awaiting"),
    ).toBeTruthy();
    expect(
      render(
        <PlayoffMatchConfirmBanner
          ladderId="L1"
          match={match({ matchStatus: "accepted" })}
          userId="away"
        />,
      ).toJSON(),
    ).toBeNull();
    expect(
      render(
        <PlayoffMatchConfirmBanner
          ladderId="L1"
          match={match()}
          userId="stranger"
        />,
      ).toJSON(),
    ).toBeNull();
  });
});
