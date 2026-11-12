import React from "react";
import { render } from "@testing-library/react-native";
import moment from "moment";
import { LADDER_STATUS, LADDER_TYPE } from "@shared";
import type { Ladder } from "@shared/types";

import LadderPreSeasonNotice, {
  getPreSeasonNoticeBody,
} from "./LadderPreSeasonNotice";

const seasonStartsAt = moment().add(6, "days").startOf("day").add(9, "hours");

const ladder = (overrides: Partial<Ladder> = {}) =>
  ({
    ladderId: "L1",
    name: "North London",
    ladderType: LADDER_TYPE.SINGLES,
    status: LADDER_STATUS.REGISTRATION_OPEN,
    seasonStartsAt: seasonStartsAt.toDate(),
    participantCount: 100,
    ...overrides,
  }) as unknown as Ladder;

describe("LadderPreSeasonNotice", () => {
  it("says how many more are needed and that the start moves back", () => {
    expect(getPreSeasonNoticeBody(ladder())).toBe(
      "28 more players needed to start. If fewer than 128 players have joined by then, the season start moves back 14 days.",
    );
  });

  it("warns of cancellation once the start has moved back", () => {
    expect(
      getPreSeasonNoticeBody(
        ladder({
          ladderType: LADDER_TYPE.DOUBLES,
          participantCount: 127,
          seasonExtendedAt: new Date(),
        }),
      ),
    ).toBe(
      "1 more team needed to start. If fewer than 128 teams have joined by then, the ladder will be cancelled and any entry fees refunded in full.",
    );
  });

  it("confirms the start once enough have joined", () => {
    expect(getPreSeasonNoticeBody(ladder({ participantCount: 128 }))).toBe(
      "Enough players have joined. Matches open when the season starts.",
    );
  });

  it("shows the season start day", () => {
    const utils = render(<LadderPreSeasonNotice ladder={ladder()} />);
    expect(utils.getByTestId("ladder-preseason-title").props.children).toEqual([
      "Season starts",
      " ",
      seasonStartsAt.format("ddd D MMM"),
    ]);
  });
});
