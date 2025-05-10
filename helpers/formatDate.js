// utils/dateHelpers.js
import moment from "moment";

/**
 * Parse a `DD-MM-YYYY` string and format it.
 *
 * @param {string|Date|object} input
 *   - a Firestore Timestamp `.toDate()`
 *   - a `"DD-MM-YYYY"` string
 *   - ultimately anything moment() can ingest if you tweak the parser
 * @param {string} parserFormat – how to parse if `input` is a string
 * @param {string} outputFormat – the moment.js format string you want
 * @returns {string}
 */
export function formatDate(
  input,
  parserFormat = "DD-MM-YYYY",
  outputFormat = "ddd Do MMM"
) {
  // if it’s a Firestore Timestamp, convert it first:
  const m =
    typeof input === "object" && typeof input.toDate === "function"
      ? moment(input.toDate())
      : moment(input, parserFormat);

  return m.isValid() ? m.format(outputFormat) : "";
}
