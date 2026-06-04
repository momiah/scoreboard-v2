// scoreInputHelpers.ts
// Pure helpers for the single-field score input used in AddGameDetails.
// Scores are entered as a fixed 4-digit value (2 digits per side) with an
// auto-inserted dash, e.g. "09-21". The form still stores/submits the natural
// form ("9", "21") via the derived parts.

interface ScorePair {
  team1Score: string;
  team2Score: string;
}

const DIGITS_ONLY = /\D/g;

// Formats a digit string (max 4 chars) into the display value.
// "" -> "", "0" -> "0", "09" -> "09-", "092" -> "09-2", "0921" -> "09-21"
export const formatScoreDigits = (digits: string): string => {
  const limitedDigits = digits.replace(DIGITS_ONLY, "").slice(0, 4);

  if (limitedDigits.length <= 1) {
    return limitedDigits;
  }

  if (limitedDigits.length === 2) {
    return `${limitedDigits}-`;
  }

  return `${limitedDigits.slice(0, 2)}-${limitedDigits.slice(2)}`;
};

// Strips a 2-digit segment down to its natural number string.
// "09" -> "9", "21" -> "21", "00" -> "0", "" -> ""
const normaliseScorePart = (part: string): string => {
  if (!part) {
    return "";
  }

  return String(parseInt(part, 10));
};

// Splits a formatted/partial value back into the two natural scores the
// parent form stores and submits.
export const deriveScoresFromInput = (value: string): ScorePair => {
  const digits = value.replace(DIGITS_ONLY, "");

  return {
    team1Score: normaliseScorePart(digits.slice(0, 2)),
    team2Score: normaliseScorePart(digits.slice(2, 4)),
  };
};

// Rebuilds the formatted display value from the two stored scores.
// Used on mount and whenever the parent resets the form.
export const formatScoresToInput = ({
  team1Score,
  team2Score,
}: ScorePair): string => {
  const team1Digits = (team1Score ?? "").replace(DIGITS_ONLY, "");
  const team2Digits = (team2Score ?? "").replace(DIGITS_ONLY, "");

  if (!team1Digits && !team2Digits) {
    return "";
  }

  const paddedTeam1 = team1Digits.padStart(2, "0").slice(-2);
  const paddedTeam2 = team2Digits ? team2Digits.padStart(2, "0").slice(-2) : "";

  return formatScoreDigits(`${paddedTeam1}${paddedTeam2}`);
};
