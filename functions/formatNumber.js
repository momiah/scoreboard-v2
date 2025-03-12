const numberFormatter = new Intl.NumberFormat("en-US");

/**
 * Formats a number with commas as thousands separators.
 * @param {number} value - The number to format.
 * @returns {string} The formatted number.
 */
export const formatNumber = (value) => {
  if (typeof value !== "number") {
    throw new Error("Value must be a number");
  }
  return numberFormatter.format(value);
};
