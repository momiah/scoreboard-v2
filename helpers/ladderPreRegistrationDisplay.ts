import {
  LADDER_PLAYOFF_SIZES,
  LADDER_PRE_REGISTRATION_KEY,
  LADDER_TIER,
  LADDER_TYPE,
  PLATFORM_FEE,
  calculateLadderPrizePool,
  getLadderPayouts,
  getLadderPlayoffStructure,
} from "@shared";
import type { LadderPayout } from "@shared";
import type {
  LadderPreRegistrationKey,
  LadderPreRegistrationOption,
} from "@shared/types";
import { formatCurrency } from "./formatCurrency";
import { getOrdinalSuffix } from "./getOrdinalSuffix";

export const LADDER_PRE_REGISTRATION_COLORS = {
  gold: "#FFD700",
  orange: "#FFA500",
  goldText: "#412402",
  goldTint: "#3a2a05",
  blue: "#00A2FF",
  blueBorder: "#1d4a6e",
  blueTint: "#062c47",
  card: "#1a2b3d",
  panel: "#192336",
  hero: "#0a2a4a",
  muted: "#8899aa",
  body: "#c9d6e3",
  success: "#00C853",
  successTint: "#0d3b1f",
};

export const PLATFORM_FEE_PERCENT = Math.round(PLATFORM_FEE * 100);

export const PRIZE_POOL_FOOTNOTE = `*Prize pool and payouts are shown before the ${PLATFORM_FEE_PERCENT}% platform fee.`;

const COMMUNITY_TAGLINES: Partial<Record<LadderPreRegistrationKey, string>> = {
  [LADDER_PRE_REGISTRATION_KEY.COMMUNITY_SINGLES]:
    "Earn your rank. Your finish stays on your profile for good.",
  [LADDER_PRE_REGISTRATION_KEY.COMMUNITY_DOUBLES]:
    "Climb as a team. Finish the season as your area's top pair.",
};

export const isCashLadder = (option: LadderPreRegistrationOption) =>
  option.tier === LADDER_TIER.CASH;

export const getEntrantNoun = (option: LadderPreRegistrationOption) =>
  option.ladderType === LADDER_TYPE.DOUBLES ? "teams" : "players";

export const getPrizePool = (
  option: LadderPreRegistrationOption,
  ladderSize = option.maxPlayers,
) =>
  calculateLadderPrizePool({
    entryFee: option.entryFee,
    participantCount: ladderSize,
  });

export const formatPrizePool = (
  option: LadderPreRegistrationOption,
  ladderSize = option.maxPlayers,
) => {
  const { grossCash, xp } = getPrizePool(option, ladderSize);
  return isCashLadder(option)
    ? formatCurrency(grossCash, option.currencyType)
    : `${xp.toLocaleString("en-GB")} CP`;
};

export const formatEntryFee = (option: LadderPreRegistrationOption) => {
  if (!isCashLadder(option)) return "Free entry";
  const fee = formatCurrency(option.entryFee, option.currencyType);
  return option.ladderType === LADDER_TYPE.DOUBLES
    ? `${fee} entry per team`
    : `${fee} entry`;
};

export const getLadderSummary = (option: LadderPreRegistrationOption) => {
  if (!isCashLadder(option)) return COMMUNITY_TAGLINES[option.key] ?? "";
  const noun = getEntrantNoun(option);
  const { inTheMoney } = getLadderPlayoffStructure(option.maxPlayers);
  return `Up to ${option.maxPlayers.toLocaleString("en-GB")} ${noun} · Top ${inTheMoney} ${noun === "teams" ? "teams " : ""}win cash`;
};

export const formatPlace = (place: number) =>
  `${place}${getOrdinalSuffix(place)}`;

export const formatPayoutPlaces = (payout: LadderPayout) =>
  payout.places === 1
    ? formatPlace(payout.fromPlace)
    : `${formatPlace(payout.fromPlace)}–${formatPlace(payout.toPlace)}`;

export const getFullLadderPayouts = (option: LadderPreRegistrationOption) =>
  getLadderPayouts(getPrizePool(option).grossCash, option.maxPlayers);

export const getLadderSizeRows = (option: LadderPreRegistrationOption) =>
  LADDER_PLAYOFF_SIZES.filter((size) => size <= option.maxPlayers).map(
    (size) => {
      const { playoffSpots, inTheMoney } = getLadderPlayoffStructure(size);
      return {
        size,
        prizePool: formatPrizePool(option, size),
        playoffSpots,
        inTheMoney,
      };
    },
  );
