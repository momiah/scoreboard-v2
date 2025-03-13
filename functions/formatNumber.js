const numberFormatter = new Intl.NumberFormat("en-US");

/**
 * Formats a number with commas as thousands separators.
 * @param {number} value - The number to format.
 * @returns {string} The formatted number.
 */
export const formatNumber = (value) => {
  console.log("value", value);
  if (typeof value === "string") {
    value = parseFloat(value);
  }
  if (typeof value !== "number" || isNaN(value)) {
    throw new Error("Value must be a number");
  }
  return numberFormatter.format(value);
};
