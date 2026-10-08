export const getOrdinalSuffix = (num: number): string | null => {
  if (typeof num !== "number" || isNaN(num)) return null;
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};
