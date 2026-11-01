import { LADDER_PLAYOFF_TIE_DAYS } from "@shared";
import {
  LADDER_PLAYOFF_HOST_ARRANGE_HOURS,
  LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS,
} from "@shared/helpers";
import type { TextBlock } from "./FormattedBlocks";

export interface RuleSection {
  title: string;
  body: TextBlock[];
}

export const rulesFor = (noun: "player" | "team"): RuleSection[] => [
  {
    title: "How ladders work",
    body: [
      "Players are ranked on a ladder.",
      "Challenge others to climb, and hold your position by defending against challengers.",
    ],
  },
  {
    title: "Registration",
    body: [
      "Join while registration is open.",
      "Paid ladders require the entry fee before you are added to the standings.",
    ],
  },
  {
    title: "Playing games",
    body: [
      "Arrange challenge games with other ladder members.",
      "Report each result. Both players confirm the score before it counts.",
    ],
  },
  {
    title: "Check-in & no-shows",
    body: [
      "Check in at the court for every match. The games unlock once every player has checked in.",
      "If your opponent hasn't checked in within 30 minutes of the start time, you can report a no-show from the check-in screen:",
      [
        "We confirm you're at the court when you report it.",
        "You can't report one if your opponent has already arrived.",
      ],
      "Misconduct (cheating, abuse or harassment) can be reported from the match menu.",
    ],
  },
  {
    title: "Rescheduling & extensions",
    body: [
      "Before any game is reported, either side can ask to move the match to a new time. It only moves if the opponent accepts.",
      "Once a game has been reported, either side can extend the match once, giving 7 days from the request to finish it.",
      "An extension never runs past the day ladder results close, and playoff matches must still finish by the playoff deadline.",
    ],
  },
  {
    title: "Inactive matches",
    body: [
      "An accepted match expires if nothing happens for 72 hours: no check-in, game or report.",
      "The clock starts at the scheduled time and resets with any activity, so any progress keeps the match alive.",
    ],
  },
  {
    title: "Before the playoffs",
    body: [
      "Matches can be posted and accepted until 7 days before the playoffs start.",
      "Results close 5 days before. After that no more games or no-shows can be reported, and any unfinished match ends, keeping the games already approved.",
      "Disputes and no-show claims are decided by our admins until 1 day before. Anything still undecided then is closed so the standings are final:",
      [
        "A disputed game is discarded and neither side gets its CP.",
        "A no-show is only awarded if our records show the reporter at the court and their opponent not there.",
      ],
    ],
  },
  {
    title: "Playoffs",
    body: [
      `When the season ends, the top-ranked ${noun}s enter the playoff bracket to decide the champion.`,
    ],
  },
  {
    title: "Playoff matches",
    body: [
      `Each playoff tie is two matches, one at each ${noun}'s home court. Both must be played within ${LADDER_PLAYOFF_TIE_DAYS} days.`,
      `The lower-ranked ${noun} arranges their home match first. Once it's arranged, the higher-ranked ${noun} can arrange theirs for any date before the deadline, even an earlier one, so you can work around each other.`,
      `The ${noun} that wins more games across both matches goes through.`,
      "If it's level, one deciding game is played at the court of whichever match was played last, straight after it, with everyone already checked in. If you can't stay for it, either side can reschedule it before the deadline.",
      "Once match 1 is finished, either side can offer to play match 2 at the same court there and then. The other side can accept or decline.",
    ],
  },
  {
    title: "Arranging and answering",
    body: [
      `The ${noun} you play can decline the time you arrange once. After that they can only accept.`,
      `If they don't answer within ${LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS} hours, the match is accepted for them.`,
      `If the lower-ranked ${noun} hasn't arranged match 1 within ${LADDER_PLAYOFF_HOST_ARRANGE_HOURS} hours of the tie starting, the other ${noun} can arrange their own match without waiting.`,
    ],
  },
  {
    title: "If time runs out",
    body: [
      `If some games were played, the ${noun} with more games goes through, then more points, then the higher rank.`,
      "If nothing was played:",
      [
        `The only ${noun} that arranged, accepted or declined a match goes through on a walkover.`,
        "If both did, or neither did, nobody goes through.",
      ],
      `A disqualified ${noun} is out of every tie, and their opponent goes through on a walkover.`,
    ],
  },
  {
    title: "Prizes",
    body: [
      "The prize pot is shared among the top finishers once the ladder completes and results are finalised.",
    ],
  },
];
