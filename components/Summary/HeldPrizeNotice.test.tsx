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
        "Your prize for finishing 2nd (1,280 CP) is under review because you were disqualified from the ladder. We'll let you know the outcome.",
      ),
    ).toBeTruthy();
  });

  it("names a joint place and a cash prize in the ladder's currency", () => {
    const view = render(
      <HeldPrizeNotice
        payout={payout({ voided: true, place: 2, currencyType: "EUR", prize: { cash: 102, cp: 256 } })}
      />,
    );
    expect(view.getByText(/finishing joint 2nd \(€102 and 256 CP\)/)).toBeTruthy();
  });

  it("names a place below 4th by its round's band, not its bottom place", () => {
    const view = render(<HeldPrizeNotice payout={payout({ place: 8 })} />);
    expect(view.getByText(/finishing joint 5th \(1,280 CP\)/)).toBeTruthy();
    expect(view.queryByText(/8th/)).toBeNull();
  });
});
