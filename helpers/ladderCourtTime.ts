const MINUTES_PER_GAME = 15;
const ROUND_TO_MINUTES = 30;

export const recommendedCourtMinutes = (bestOf: number): number =>
  Math.ceil((Math.max(bestOf, 1) * MINUTES_PER_GAME) / ROUND_TO_MINUTES) *
  ROUND_TO_MINUTES;

const formatHours = (minutes: number): string => {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hours === 1 ? "hour" : "hours"}`;
};

export const courtTimeHint = (bestOf: number): string =>
  `Book enough court time to finish: about ${formatHours(recommendedCourtMinutes(bestOf))} for best of ${bestOf}`;
