import React from "react";
import { render } from "@testing-library/react-native";

import ResultsCloseBanner, { formatTimeUntil } from "./ResultsCloseBanner";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const match = (overrides: Record<string, unknown> = {}) =>
  ({ matchStatus: "accepted", playoffTieId: null, ...overrides }) as never;
const seasonClose = (resultsInMs: number) => ({
  postingDeadline: new Date(Date.now() + resultsInMs - 2 * DAY),
  resultsDeadline: new Date(Date.now() + resultsInMs),
  playoffStartsAt: new Date(Date.now() + resultsInMs + 5 * DAY),
});

describe("ResultsCloseBanner", () => {
  it("counts down to results close once posting has closed", () => {
    const { getByTestId } = render(
      <ResultsCloseBanner
        match={match()}
        seasonClose={seasonClose(DAY + 4 * HOUR)}
      />,
    );
    expect(getByTestId("results-close-awaiting")).toHaveTextContent(
      "Ladder results close in 1d 4h. Finish and report your games before then.",
    );
  });

  it("says results have closed once they have", () => {
    const { getByTestId } = render(
      <ResultsCloseBanner match={match()} seasonClose={seasonClose(-HOUR)} />,
    );
    expect(getByTestId("results-close-awaiting")).toHaveTextContent(
      /results have closed for the playoffs/,
    );
  });

  it("stays hidden before posting closes, for playoff matches and for finished matches", () => {
    expect(
      render(
        <ResultsCloseBanner
          match={match()}
          seasonClose={seasonClose(3 * DAY)}
        />,
      ).toJSON(),
    ).toBeNull();
    expect(
      render(
        <ResultsCloseBanner
          match={match({ playoffTieId: "r1-s0" })}
          seasonClose={seasonClose(HOUR)}
        />,
      ).toJSON(),
    ).toBeNull();
    expect(
      render(
        <ResultsCloseBanner
          match={match({ matchStatus: "completed" })}
          seasonClose={seasonClose(HOUR)}
        />,
      ).toJSON(),
    ).toBeNull();
  });
});

describe("formatTimeUntil", () => {
  it("shows days and hours, then hours and minutes, then minutes", () => {
    expect(formatTimeUntil(2 * DAY + 3 * HOUR)).toBe("2d 3h");
    expect(formatTimeUntil(5 * HOUR + 20 * 60 * 1000)).toBe("5h 20m");
    expect(formatTimeUntil(30 * 1000)).toBe("1m");
  });
});
