import React from "react";
import styled from "styled-components/native";

interface TermsSection {
  title: string;
  body: string;
}

export const LADDER_TERMS: TermsSection[] = [
  {
    title: "1. Eligibility",
    body: "You must have a valid Court Champs account to enter a ladder. By joining you confirm the information on your account is accurate and that you meet any age or regional requirements for the ladder.",
  },
  {
    title: "2. Entry & registration",
    body: "A place on a ladder is confirmed once your registration is accepted and, for paid ladders, once your entry fee has been successfully processed. Registration closes at the advertised date and time.",
  },
  {
    title: "3. Entry fees & service charge",
    body: "Paid ladders require the stated entry fee. A platform service charge is included in the amount shown at checkout. Entry fees are collected to form the prize pool and to cover platform costs.",
  },
  {
    title: "4. Prizes & payouts",
    body: "The playoff and payout structure is tiered and scales with the ladder's actual size at registration close, not its maximum capacity. Prizes are distributed to qualifying finishers once the ladder completes and results are finalised.",
  },
  {
    title: "5. Fair play",
    body: "Results must be reported honestly and confirmed by both players. Any manipulation of scores, collusion, or abusive conduct may result in removal from the ladder without refund and further account action.",
  },
  {
    title: "6. Attendance, reports & disqualification",
    body: "You must check in at the court for each scheduled match. If your opponent hasn't checked in within the 30-minute grace period after the scheduled start, you can report a no-show from the check-in screen; you can also report misconduct — cheating, abuse or harassment — from the match menu. All reports are reviewed by an admin. An upheld no-show awards you the match as a walkover: you gain up to 50 CP, transferred from the no-show and never taking them below zero, with no games, points or medals. Upheld reports add a strike against the reported player. Strikes are counted per ladder, and reaching the limit for any reason — 5 no-shows, or 3 for a conduct reason — disqualifies that player from the ladder, blocking them from posting or accepting further matches, with no refund of their entry fee.",
  },
  {
    title: "7. Unattended matches",
    body: "If an accepted match goes completely unattended — nobody checks in, plays, or reports anything within 24 hours of the scheduled start — it is automatically cancelled. A cancelled match carries no result and no penalty for either side.",
  },
  {
    title: "8. Refunds & cancellations",
    body: "If a ladder is cancelled before it begins, paid entry fees are refunded. Once a ladder has started, you have the right for refund before you play your first match. After that, entry fees are generally non-refundable except where required by law.",
  },
  {
    title: "9. Changes",
    body: "Court Champs may update these terms or a ladder's details where reasonably necessary. Material changes affecting an active ladder will be communicated to participants.",
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
        <TermsBody>{section.body}</TermsBody>
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

const TermsBody = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
});
