import React from "react";
import { render } from "@testing-library/react-native";

import HeldPrizeNotice from "./HeldPrizeNotice";

const payout = (fields = {}) => ({
  payoutId: "r3-s0-user",
  ladderId: "ladder",
  userId: "user",
  sidePlayerIds: ["user"],
  tieId: "r3-s0",
  place: 2,
  voided: false,
  currencyType: "GBP",
  placePrize: { cash: 0, cp: 1280 },
  potShare: { cash: 0, cp: 0 },
  prize: { cash: 0, cp: 1280 },
  paid: { cash: 0, cp: 0 },
  status: "held" as const,
  reason: "Disqualified: 3 cheating offences",
  review: null,
  createdAt: new Date("2026-10-20T18:00:00Z"),
  updatedAt: new Date("2026-10-20T18:00:00Z"),
  ...fields,
});

describe("HeldPrizeNotice", () => {
  it("tells the user their prize is under review and what it is", () => {
    const view = render(<HeldPrizeNotice payout={payout()} />);
    expect(view.getByText("Your prize is under review")).toBeTruthy();
    expect(
      view.getByText(
        "Your prize for 2nd place (1,280 CP) is under review because you were disqualified from the ladder. We'll let you know the outcome.",
      ),
    ).toBeTruthy();
  });

  it("names a joint place and a cash prize in the ladder's currency", () => {
    const view = render(
      <HeldPrizeNotice
        payout={payout({ voided: true, place: 4, currencyType: "EUR", prize: { cash: 102, cp: 256 } })}
      />,
    );
    expect(view.getByText(/joint 4th place \(€102 and 256 CP\)/)).toBeTruthy();
  });
});
