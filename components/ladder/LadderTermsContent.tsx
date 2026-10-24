import React from "react";
import styled from "styled-components/native";

import FormattedBlocks from "./FormattedBlocks";
import type { TextBlock } from "./FormattedBlocks";

interface TermsSection {
  title: string;
  body: TextBlock[];
}

export const LADDER_TERMS: TermsSection[] = [
  {
    title: "1. Eligibility",
    body: [
      "You must have a valid Court Champs account to enter a ladder.",
      "By joining you confirm the information on your account is accurate and that you meet any age or regional requirements for the ladder.",
    ],
  },
  {
    title: "2. Entry & registration",
    body: [
      "A place on a ladder is confirmed once your registration is accepted and, for paid ladders, once your entry fee has been successfully processed.",
      "Registration closes at the advertised date and time.",
    ],
  },
  {
    title: "3. Entry fees & service charge",
    body: [
      "Paid ladders require the stated entry fee plus a 10% platform fee, which is added on top and shown at checkout.",
      "The full entry fee goes into the prize pool. The platform fee covers platform costs.",
    ],
  },
  {
    title: "4. Prizes & payouts",
    body: [
      "The playoff and payout structure is tiered and scales with the ladder's actual size at registration close, not its maximum capacity.",
      "Prizes are distributed to qualifying finishers once the ladder completes and results are finalised.",
      "Everyone in the money is paid for the round they reached, including a player or team who loses on a walkover.",
      "In doubles, a team's prize is split equally between both players.",
      "If a playoff tie is void because neither side played:",
      [
        "Both sides are treated as losing that round and are paid the lowest prize that round guarantees.",
        "Nobody moves up a place.",
        "Prize money nobody won goes into the Unclaimed Prize Pot and is split equally between every other player or team in the money.",
        "If there is nobody else in the money to share it with, Court Champs keeps it.",
      ],
      "Prizes are paid in whole pounds and whole CP, except that a doubles share may include 50p. Any amount left over from rounding goes to the highest finishers.",
      "If your account is deleted before prizes are paid, your prize is forfeited and kept by Court Champs.",
    ],
  },
  {
    title: "5. The Rules",
    body: [
      "Every ladder is played under the ladder Rules, which form part of these terms.",
      [
        "By joining you agree to play your matches as the Rules describe.",
        "That includes checking in, reporting results and rescheduling.",
        "It also covers playoff matches and when inactive matches expire.",
      ],
    ],
  },
  {
    title: "6. Fair play",
    body: [
      "Results must be reported honestly and confirmed by both players.",
      "Any manipulation of scores, collusion, or abusive conduct may result in removal from the ladder without refund and further account action.",
    ],
  },
  {
    title: "7. Reports, strikes & disqualification",
    body: [
      "All no-show and misconduct reports are reviewed by an admin. Reporting a no-show records your location at the court, and arrivals at the court are recorded during check-in.",
      "Reports still undecided 1 day before the playoffs start are closed as set out in the Rules.",
      "An upheld no-show awards the match to the player who showed up as a walkover:",
      [
        "They gain up to 50 CP, transferred from the no-show and never taking them below zero.",
        "No games, points or medals are awarded.",
      ],
      "Upheld reports add a strike against the reported player. Strikes are counted per ladder.",
      "Reaching the limit for any reason disqualifies that player from the ladder:",
      [
        "5 no-shows, or 3 for a conduct reason.",
        "A disqualified player can no longer post or accept matches.",
        "In the playoffs, their opponent goes through on a walkover.",
        "There is no refund of their entry fee.",
      ],
      "If a player is disqualified once they are in the money, their prize is held for review:",
      [
        "An admin decides whether to pay it in full, in part or not at all, and the player is told the outcome.",
        "Any part not paid is kept by Court Champs.",
      ],
    ],
  },
  {
    title: "8. Expired matches",
    body: [
      "A match that expires under the Rules carries no result and no penalty for either side.",
    ],
  },
  {
    title: "9. Refunds & cancellations",
    body: [
      "If a ladder is cancelled before it begins, paid entry fees are refunded.",
      "Once a ladder has started, you have the right for refund before you play your first match.",
      "After that, entry fees are generally non-refundable except where required by law.",
    ],
  },
  {
    title: "10. Court fees",
    body: [
      "Where a match sets a court fee, the accepting player pays their share, plus a 10% platform fee, when they accept the match. This secures the match so the poster is never left with an unpaid opponent.",
      [
        "The court-fee share is released to the poster once the match completes or expires, since the poster has already paid for the court.",
        "If the match is cancelled, the court-fee share is refunded to the accepting player.",
        "The 10% platform fee is non-refundable in all cases and is retained by Court Champs to cover payment processing.",
      ],
    ],
  },
  {
    title: "11. Changes",
    body: [
      "Court Champs may update these terms or a ladder's details where reasonably necessary.",
      "Material changes affecting an active ladder will be communicated to participants.",
    ],
  },
];

const LadderTermsList: React.FC = () => (
  <>
    <Intro>
      Please read these terms carefully before joining a ladder. Joining a
      ladder means you accept the terms below.
    </Intro>
    {LADDER_TERMS.map((section) => (
      <TermsCard key={section.title}>
        <TermsTitle>{section.title}</TermsTitle>
        <FormattedBlocks blocks={section.body} />
      </TermsCard>
    ))}
  </>
);

export default LadderTermsList;

const Intro = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  lineHeight: 20,
});

const TermsCard = styled.View({
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "#192336",
  gap: 8,
});

const TermsTitle = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "bold",
});
