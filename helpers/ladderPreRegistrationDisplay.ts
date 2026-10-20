import {
  LADDER_PLAYOFF_SIZES,
  LADDER_PRE_REGISTRATION_KEY,
  LADDER_TIER,
  calculateLadderPrizePool,
  getLadderEntryPrice,
  getLadderPlayoffStructure,
} from "@shared";
import type {
  LadderPreRegistrationKey,
  LadderPreRegistrationOption,
} from "@shared/types";
import { formatCurrency } from "./formatCurrency";
import { ladderEntrantNoun } from "./ladderEntrantNoun";
import { getLadderPrizeTable } from "./ladderPlayoffPrizes";

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

const COMMUNITY_TAGLINES: Partial<Record<LadderPreRegistrationKey, string>> = {
  [LADDER_PRE_REGISTRATION_KEY.COMMUNITY_SINGLES]:
    "Earn your rank. Your finish stays on your profile for good.",
  [LADDER_PRE_REGISTRATION_KEY.COMMUNITY_DOUBLES]:
    "Climb as a team. Finish the season as your area's top pair.",
};

export const isCashLadder = (option: LadderPreRegistrationOption) =>
  option.tier === LADDER_TIER.CASH;

export const getEntrantNoun = (option: LadderPreRegistrationOption) =>
  ladderEntrantNoun(option.ladderType);

const atFullSize = (
  option: LadderPreRegistrationOption,
  ladderSize = option.maxPlayers,
) => ({
  entryFee: option.entryFee,
  participantCount: ladderSize,
  maxPlayers: option.maxPlayers,
});

export const getPrizePool = (
  option: LadderPreRegistrationOption,
  ladderSize = option.maxPlayers,
) => calculateLadderPrizePool(atFullSize(option, ladderSize));

export const formatPrizePool = (
  option: LadderPreRegistrationOption,
  ladderSize = option.maxPlayers,
) => {
  const { cash, xp } = getPrizePool(option, ladderSize);
  return isCashLadder(option)
    ? formatCurrency(cash, option.currencyType)
    : `${xp.toLocaleString("en-GB")} CP`;
};

export const formatEntryFee = (option: LadderPreRegistrationOption) => {
  if (!isCashLadder(option)) return "Free entry";
  const fee = `${formatCurrency(option.entryFee, option.currencyType)}* entry`;
  return getEntrantNoun(option) === "team" ? `${fee} per team` : fee;
};

/** The platform fee disclosure for the asterisk on a cash ladder's entry fee. */
export const getPlatformFeeFootnote = (option: LadderPreRegistrationOption) => {
  const { entryFee, platformFee, total } = getLadderEntryPrice(option.entryFee);
  const format = (amount: number) =>
    formatCurrency(amount, option.currencyType);
  return `*A ${format(platformFee)} platform fee is added on top of the ${format(entryFee)} entry, so it's ${format(total)} to join. The full entry fee goes into the prize pool.`;
};

export const getLadderSummary = (option: LadderPreRegistrationOption) => {
  if (!isCashLadder(option)) return COMMUNITY_TAGLINES[option.key] ?? "";
  const noun = getEntrantNoun(option);
  const { inTheMoney } = getLadderPlayoffStructure(option.maxPlayers);
  return `Up to ${option.maxPlayers.toLocaleString("en-GB")} ${noun}s · Top ${inTheMoney} ${noun === "team" ? "teams " : ""}win cash`;
};

export const getFullLadderPrizeTable = (option: LadderPreRegistrationOption) =>
  getLadderPrizeTable(atFullSize(option));

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
