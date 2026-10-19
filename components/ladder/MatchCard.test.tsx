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

  it("shows the full address in the lobby and only the city in lists", () => {
    const court = {
      courtId: "c1",
      courtName: "Bethnal Green",
      location: {
        address: "1 Test Street",
        city: "London",
        postCode: "E2 0AA",
      },
    };
    expect(
      render(
        <MatchCard match={match({ court })} flat testID="card" />,
      ).getByTestId("card-address"),
    ).toHaveTextContent("1 Test Street, London, E2 0AA");
    expect(
      render(<MatchCard match={match({ court })} testID="card" />).getByTestId(
        "card-address",
      ),
    ).toHaveTextContent(/^London$/);
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
