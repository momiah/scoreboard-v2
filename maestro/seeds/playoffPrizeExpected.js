import {
  formatLadderFinishPlace,
  formatLadderPayoutPlace,
  formatLadderSidePrize,
  getLadderPlacePrize,
  getLadderPrizeBands,
  getLadderPrizeSetup,
  formatLadderPrizeWon,
  roundLabel,
} from "@shared/helpers";
import { formatCurrency } from "../../helpers/formatCurrency";
import { payoutText } from "../../components/ladder/PlayoffPrizeBanner";
import { maestroPlayoffPayoutStructure } from "./seedLadderPlayoffs";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What the flows assert about a seeded playoff ladder's prizes, from the
 * shared prize helpers, as regex-escaped text: the How to Play prize table,
 * the tie banner, and the finish and knock-out notifications.
 */
export const getPlayoffPrizeExpected = ({
  ladderName,
  entryFee,
  size,
  players = 1,
  currencyType = "GBP",
}) => {
  const ladder = {
    entryFee,
    participantCount: size,
    maxPlayers: size,
    payoutStructure: maestroPlayoffPayoutStructure(entryFee),
  };
  const { pool, size: ladderSize, payoutStructure } =
    getLadderPrizeSetup(ladder);
  const isPaid = pool.cash > 0;
  const bands = getLadderPrizeBands(pool, ladderSize, payoutStructure);
  const won = (place) =>
    formatLadderSidePrize(
      getLadderPlacePrize(ladder, place),
      players,
      currencyType,
    );
  const finished = (place) =>
    escapeRegex(
      `you finished ${formatLadderFinishPlace(place).toLowerCase()} in ${ladderName} and been awarded ${won(place)}.`,
    );
  const knockedOut = (playersInRound) => {
    const prize = won(playersInRound);
    return escapeRegex(
      `knocked out in the ${roundLabel(playersInRound)} of ${ladderName}.${
        prize
          ? ` You've been awarded ${prize}, paid when the playoffs finish.`
          : ""
      }`,
    );
  };
  const banner = (place) =>
    escapeRegex(
      payoutText(getLadderPlacePrize(ladder, place), currencyType, isPaid),
    );
  return {
    payoutStructure,
    cashPool: escapeRegex(formatCurrency(pool.cash, currencyType)),
    cpPool: String(pool.xp),
    cpPot: escapeRegex(`${pool.xp.toLocaleString()} CP`),
    championRow: escapeRegex(
      isPaid
        ? formatCurrency(bands[0].cash, currencyType)
        : bands[0].cp.toLocaleString(),
    ),
    lastBand: escapeRegex(formatLadderPayoutPlace(bands[bands.length - 1])),
    finished1: finished(1),
    finished2: finished(2),
    finished3: finished(3),
    finished4: finished(4),
    quarterFinalOut: knockedOut(8),
    roundOf16Out: knockedOut(16),
    quarterFinalHeld: escapeRegex(
      `Your prize for finishing ${formatLadderFinishPlace(8).toLowerCase()} (${formatLadderPrizeWon(getLadderPlacePrize(ladder, 8), currencyType)}) is under review`,
    ),
    roundOf16Secured: banner(16),
    roundOf16Next: banner(8),
  };
};
