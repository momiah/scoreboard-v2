import {
  LADDER_PLAYOFF_SIZES,
  LADDER_PLAYOFF_START_DAYS,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_SEASON_START_DAYS,
  LADDER_TYPE,
  calculateLadderPrizePool,
  formatCurrency,
  getLadderEntryPrice,
  getLadderPayouts,
  getLadderPlayoffStructure,
  getPrizeType,
  ordinalPlace,
  prizeTypes,
} from "@shared";
import type { LadderPreRegistrationDetails } from "@shared/types";

export const LADDER_PRE_REGISTRATION_COLORS = {
  screen: "rgb(3, 16, 31)",
  hero: "#0a2a4a",
  card: "rgba(0, 0, 0, 0.3)",
  rowBorder: "rgb(9, 33, 62)",
  prizeGold: "#ffc800",
  prizeGoldBorder: "rgba(255, 200, 0, 0.35)",
  goldText: "#412402",
  goldTint: "rgba(255, 200, 0, 0.12)",
  blue: "#00A2FF",
  blueBorder: "rgba(0, 162, 255, 0.35)",
  blueTint: "rgba(0, 162, 255, 0.12)",
  muted: "#aaa",
  body: "#c9d6e3",
  success: "#00C853",
  successTint: "#0d3b1f",
};

type Details = LadderPreRegistrationDetails;

export const isCashLadder = (details: Pick<Details, "entryFee">) =>
  getPrizeType(details.entryFee) === prizeTypes.CASH;

export const getEntrantNoun = (details: Pick<Details, "ladderType">) =>
  details.ladderType === LADDER_TYPE.DOUBLES ? "team" : "player";

const atSize = (details: Details, ladderSize = details.maxPlayers) => ({
  entryFee: details.entryFee,
  participantCount: ladderSize,
});

export const getPrizePool = (
  details: Details,
  ladderSize = details.maxPlayers,
) => calculateLadderPrizePool(atSize(details, ladderSize));

export const formatPrizePool = (
  details: Details,
  ladderSize = details.maxPlayers,
) => {
  const { cash, xp } = getPrizePool(details, ladderSize);
  return isCashLadder(details)
    ? formatCurrency(cash, details.currencyType)
    : `${xp.toLocaleString("en-GB")} CP`;
};

export const formatEntryFee = (details: Details) => {
  if (!isCashLadder(details)) return "Free entry";
  const fee = `${formatCurrency(details.entryFee, details.currencyType)}* entry`;
  return getEntrantNoun(details) === "team" ? `${fee} per team` : fee;
};

/** The platform fee disclosure for the asterisk on a cash ladder's entry fee. */
export const getPlatformFeeFootnote = (details: Details) => {
  const { entryFee, platformFee, total } = getLadderEntryPrice(
    details.entryFee,
  );
  const format = (amount: number) =>
    formatCurrency(amount, details.currencyType);
  return `*A ${format(platformFee)} platform fee is added on top of the ${format(entryFee)} entry, so it's ${format(total)} to join. The full entry fee goes into the prize pool.`;
};

export const getLadderSummary = (details: Details) => {
  const noun = getEntrantNoun(details);
  const size = `Up to ${details.maxPlayers.toLocaleString("en-GB")} ${noun}s`;
  if (!isCashLadder(details)) return size;
  const { inTheMoney } = getLadderPlayoffStructure(details.maxPlayers);
  return `${size} · Top ${inTheMoney} ${noun === "team" ? "teams " : ""}win cash`;
};

export const LADDER_SEASON_EXPLAINER = `Registration opens, the season starts ${LADDER_SEASON_START_DAYS} days later and the playoffs begin on day ${LADDER_PLAYOFF_START_DAYS}. Post or accept games at courts near you, whenever suits you. Every win earns Court Points (CP) and moves you up the rankings. At the end, the top players go into a knockout playoff for the title.`;

export const LADDER_SEASON_STAGES = [
  { key: "join", label: "Join", detail: "Day 0" },
  { key: "season", label: "Season", detail: `Day ${LADDER_SEASON_START_DAYS}` },
  {
    key: "registration-closes",
    label: "Entries close",
    detail: `Day ${LADDER_REGISTRATION_CLOSE_DAYS}`,
  },
  {
    key: "playoffs",
    label: "Playoffs",
    detail: `Day ${LADDER_PLAYOFF_START_DAYS}`,
  },
  { key: "champion", label: "Champion", detail: undefined },
] as const;

export interface PrizeTableRow {
  fromPlace: number;
  toPlace: number;
  label: string;
  cash: number;
  cp: number;
}

export const getFullLadderPrizeTable = (details: Details): PrizeTableRow[] => {
  const { cash, xp } = getPrizePool(details);
  const cashPayouts = getLadderPayouts(cash, details.maxPlayers);
  return getLadderPayouts(xp, details.maxPlayers).map((cpPayout, index) => ({
    fromPlace: cpPayout.fromPlace,
    toPlace: cpPayout.toPlace,
    label:
      cpPayout.places === 1
        ? ordinalPlace(cpPayout.fromPlace)
        : `${ordinalPlace(cpPayout.fromPlace)}–${ordinalPlace(cpPayout.toPlace)}`,
    cash: cashPayouts[index]?.each ?? 0,
    cp: cpPayout.each,
  }));
};

export const getLadderSizeRows = (details: Details) =>
  LADDER_PLAYOFF_SIZES.filter((size) => size <= details.maxPlayers).map(
    (size) => {
      const { playoffSpots, inTheMoney } = getLadderPlayoffStructure(size);
      return {
        size,
        prizePool: formatPrizePool(details, size),
        playoffSpots,
        inTheMoney,
      };
    },
  );
