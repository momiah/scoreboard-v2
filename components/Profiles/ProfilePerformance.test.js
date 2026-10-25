import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("../performance/MedalProgress", () => () => null);
jest.mock("../performance/MatchMedals", () => () => null);
jest.mock("../performance/PerformanceStats", () => () => null);

import ProfilePerformance from "./ProfilePerformance";

const profileWith = (profileDetail) => ({
  userId: "user",
  profileDetail: {
    XP: 4120,
    numberOfWins: 31,
    numberOfLosses: 12,
    leagueStats: { first: 2, second: 0, third: 1, fourth: 0 },
    tournamentStats: { first: 0, second: 1, third: 0, fourth: 3 },
    ...profileDetail,
  },
});

const statsUnder = (view, heading) => {
  const headings = ["League Victories", "Tournament Victories", "Ladder Victories"];
  const counts = view.getAllByText(/^\d+$/).map((node) => node.props.children);
  return counts.slice(headings.indexOf(heading) * 4, headings.indexOf(heading) * 4 + 4);
};

describe("ProfilePerformance", () => {
  it("shows ladder placings beside league and tournament ones", () => {
    const view = render(
      <ProfilePerformance
        profile={profileWith({ ladderStats: { first: 1, second: 2, third: 0, fourth: 1 } })}
      />,
    );
    expect(view.getByText("Ladder Victories")).toBeTruthy();
    expect(statsUnder(view, "League Victories")).toEqual([2, 0, 1, 0]);
    expect(statsUnder(view, "Tournament Victories")).toEqual([0, 1, 0, 3]);
    expect(statsUnder(view, "Ladder Victories")).toEqual([1, 2, 0, 1]);
  });

  it("shows zeros for a profile that has never placed in a ladder", () => {
    const view = render(<ProfilePerformance profile={profileWith({})} />);
    expect(statsUnder(view, "Ladder Victories")).toEqual([0, 0, 0, 0]);
  });
});
