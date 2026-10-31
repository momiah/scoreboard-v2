import { Share } from "react-native";
import {
  formatCurrency,
  getLadderEntryPrice,
  getLadderPlayoffStructure,
} from "@shared";
import {
  formatLadderPrizePool,
  getFullLadderPrizeTable,
  getLadderEntrantNoun,
  getLadderPreRegistrationShareUrl,
  getLadderPrizePoolAtSize,
  isCashLadder,
} from "@shared/helpers";
import type { LadderPreRegistrationDetails } from "@shared/types";

export const LADDER_PRE_REGISTRATION_COLORS = {
  screen: "rgb(3, 16, 31)",
  hero: "#0a2a4a",
  card: "rgba(0, 0, 0, 0.3)",
  rowBorder: "rgb(9, 33, 62)",
  tableHeader: "rgba(0, 162, 255, 0.08)",
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
  danger: "#FF6B6B",
  successTint: "#0d3b1f",
};

type Details = LadderPreRegistrationDetails;

export const getEntrantNoun = (details: Pick<Details, "ladderType">) =>
  getLadderEntrantNoun(details.ladderType);

export const getPrizePool = getLadderPrizePoolAtSize;
export const formatPrizePool = formatLadderPrizePool;
export { getFullLadderPrizeTable, isCashLadder };

export const formatEntryFee = (details: Details) => {
  if (!isCashLadder(details)) return "Free entry";
  const fee = `${formatCurrency(details.entryFee, details.currencyType)}* entry`;
  return getEntrantNoun(details) === "team" ? `${fee} per team` : fee;
};

/** The platform fee disclosure for the asterisk on a cash ladder's entry fee. */
export const getPlatformFeeFootnote = (details: Details) => {
  const { entryFee, platformFee } = getLadderEntryPrice(details.entryFee);
  const format = (amount: number) =>
    formatCurrency(amount, details.currencyType);
  return `*A ${format(platformFee)} platform fee is added on top of the ${format(entryFee)} entry. The full entry fee goes into the prize pool.`;
};

export const getLadderSummary = (details: Details) => {
  const noun = getEntrantNoun(details);
  const size = `Up to ${details.maxPlayers.toLocaleString("en-GB")} ${noun}s`;
  if (!isCashLadder(details)) return size;
  const { inTheMoney } = getLadderPlayoffStructure(details.maxPlayers);
  return `${size} · Top ${inTheMoney} ${noun === "team" ? "teams " : ""}win cash`;
};

export const sharePreRegistration = async (
  details: Details & { preRegistrationId: string },
) => {
  const url = getLadderPreRegistrationShareUrl(details.preRegistrationId);
  const prize = isCashLadder(details)
    ? `Up to ${formatPrizePool(details)} to be won`
    : `${formatPrizePool(details)} to be won`;
  try {
    await Share.share({
      message: `Pre-register with me for ${details.name} on Court Champs 🏸\n${prize}, and it's free to pre-register.\n\n${url}`,
      url,
    });
  } catch (error) {
    console.error("Error sharing pre-registration:", error);
  }
};
