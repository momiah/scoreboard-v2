import React from "react";
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

const mockOfferHere = jest.fn();
const mockRespond = jest.fn();
jest.mock("../../hooks/usePlayoffMatchScheduling", () => ({
  usePlayoffMatchScheduling: () => ({
    offerHere: mockOfferHere,
    respond: mockRespond,
  }),
}));

import PlayMatchTwoHere from "./PlayMatchTwoHere";

const first = (overrides: Record<string, unknown> = {}) =>
  ({
    ladderMatchId: "r1-s0-leg1",
    playoffTieId: "r1-s0",
    playoffLeg: 1,
    matchStatus: "completed",
    participants: ["lo", "hi"],
    createdBy: "lo",
    court: { courtName: "Court" },
    games: [],
    ...overrides,
  }) as never;
const second = (overrides: Record<string, unknown>) =>
  ({
    ladderMatchId: "r1-s0-leg2",
    playoffTieId: "r1-s0",
    playoffLeg: 2,
    participants: ["hi", "lo"],
    createdBy: "lo",
    playNow: true,
    games: [],
    ...overrides,
  }) as never;

beforeEach(() => jest.clearAllMocks());

describe("PlayMatchTwoHere", () => {
  it("offers match 2 to either player once match 1 is complete", () => {
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    const view = render(
      <PlayMatchTwoHere
        ladderId="L1"
        firstMatch={first()}
        secondMatch={null}
        userId="hi"
      />,
    );
    fireEvent.press(view.getByTestId("play-match-two-accept"));
    expect(mockOfferHere).toHaveBeenCalledWith({
      ladderId: "L1",
      firstMatch: first(),
    });
  });

  it("shows nothing before match 1 is complete, to spectators, or once match 2 is arranged normally", () => {
    expect(
      render(
        <PlayMatchTwoHere
          ladderId="L1"
          firstMatch={first({ matchStatus: "accepted" })}
          secondMatch={null}
          userId="hi"
        />,
      ).toJSON(),
    ).toBeNull();
    expect(
      render(
        <PlayMatchTwoHere
          ladderId="L1"
          firstMatch={first()}
          secondMatch={null}
          userId="x"
        />,
      ).toJSON(),
    ).toBeNull();
    expect(
      render(
        <PlayMatchTwoHere
          ladderId="L1"
          firstMatch={first()}
          secondMatch={second({ matchStatus: "posted", playNow: false })}
          userId="hi"
        />,
      ).toJSON(),
    ).toBeNull();
  });

  it("lets the opponent answer the offer, and goes once it's accepted", () => {
    const answer = render(
      <PlayMatchTwoHere
        ladderId="L1"
        firstMatch={first()}
        secondMatch={second({ matchStatus: "posted" })}
        userId="hi"
      />,
    );
    expect(
      answer.getByText(
        "Your opponent wants to play match 2 here now. Are you up for it?",
      ),
    ).toBeTruthy();
    expect(
      render(
        <PlayMatchTwoHere
          ladderId="L1"
          firstMatch={first()}
          secondMatch={second({ matchStatus: "accepted" })}
          userId="lo"
        />,
      ).toJSON(),
    ).toBeNull();
  });

  it("asks before offering, in short", () => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const view = render(
      <PlayMatchTwoHere
        ladderId="L1"
        firstMatch={first()}
        secondMatch={null}
        userId="hi"
      />,
    );
    expect(view.queryByText(/opponent needs to accept/)).toBeNull();
    fireEvent.press(view.getByTestId("play-match-two-accept"));
    expect(alert).toHaveBeenCalledWith(
      "Play your 2nd match in this court",
      "Your opponent must accept to continue. You do not need to re-check in.",
      expect.any(Array),
    );
  });
});
