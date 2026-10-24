import {
  LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS,
  canDeclineLadderPlayoffMatch,
} from "@shared/helpers";
import type { LadderMatch } from "@shared/types";
import { formatMatchSlot } from "../hooks/useLadderMatchChanges";

type LabelledMatch = Pick<
  LadderMatch,
  "playoffLeg" | "court" | "matchDate" | "matchTime"
>;

const AUTO_ACCEPT_NOTICE = `It's accepted automatically if you don't reply within ${LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS} hours.`;

export const playoffMatchLabel = (match: LabelledMatch): string =>
  `playoff match ${match.playoffLeg ?? ""} at ${match.court?.courtName ?? "your court"}, ${formatMatchSlot(match)}`;

/** The wording of every notification the playoff match scheduling sends, in one place. */
export const playoffMatchMessages = {
  arranged: (
    name: string,
    match: LabelledMatch &
      Pick<
        LadderMatch,
        "matchStatus" | "playoffTieId" | "scheduleDeclines" | "playNow"
      >,
  ) =>
    `${name} arranged ${playoffMatchLabel(match)}. ${
      canDeclineLadderPlayoffMatch(match)
        ? "Open it to accept or decline."
        : "Open it to accept."
    } ${AUTO_ACCEPT_NOTICE}`,
  arrangedByPartner: (name: string, match: LabelledMatch) =>
    `Your partner ${name} arranged ${playoffMatchLabel(match)}.`,
  accepted: (name: string, match: LabelledMatch) =>
    `${name} accepted ${playoffMatchLabel(match)}.`,
  declined: (name: string, match: LabelledMatch) =>
    `${name} can't make ${playoffMatchLabel(match)}. Arrange another time.`,
  answeredByPartner: (name: string, match: LabelledMatch, accept: boolean) =>
    `Your partner ${name} ${accept ? "accepted" : "declined"} ${playoffMatchLabel(match)}.`,
  playNowOffer: (name: string, courtName: string | undefined) =>
    `${name} wants to play match 2 now at ${courtName ?? "your court"}. Open the game to accept or decline.`,
  playNowOfferByPartner: (name: string, courtName: string | undefined) =>
    `Your partner ${name} offered to play match 2 now at ${courtName ?? "your court"}.`,
};
