import React from "react";
import { render } from "@testing-library/react-native";

import MatchCard from "./MatchCard";

const match = (overrides: Record<string, unknown> = {}) =>
  ({
    ladderMatchId: "m1",
    court: { courtId: "c1", courtName: "Bethnal Green" },
    bestOf: 7,
    matchDate: "18-10-2026",
    matchTime: { start: "18:00" },
    courtFee: 0,
    currencyType: "GBP",
    participants: [],
    games: [],
    matchStatus: "posted",
    shuttleType: "Feather",
    createdBy: "u1",
    createdAt: new Date(),
    ...overrides,
  }) as never;

describe("MatchCard", () => {
  it("shows the court and date", () => {
    const { getByText } = render(<MatchCard match={match()} />);
    expect(getByText(/Bethnal Green/)).toBeTruthy();
    expect(getByText("18 Oct")).toBeTruthy();
  });

  it("shows the court fee on ladder matches but not on playoff matches", () => {
    expect(
      render(<MatchCard match={match()} />).getByText("No court fee"),
    ).toBeTruthy();
    expect(
      render(
        <MatchCard match={match({ playoffTieId: "r1-s0" })} />,
      ).queryByText("No court fee"),
    ).toBeNull();
  });

  it("can hide the best-of tag", () => {
    expect(
      render(<MatchCard match={match()} />).getByText("Best of 7"),
    ).toBeTruthy();
    expect(
      render(<MatchCard match={match()} showBestOf={false} />).queryByText(
        "Best of 7",
      ),
    ).toBeNull();
  });
});
