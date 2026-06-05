// helpers/dateUtils.ts
import moment, { Moment } from "moment";

type DateInput =
  | string
  | number
  | Date
  | { toDate: () => Date }
  | { seconds: number }
  | null
  | undefined;

/**
 * Normalize any supported timestamp shape into a moment object.
 * Handles: Firestore Timestamp (.toDate()), serialized Timestamp
 * ({ seconds, nanoseconds }), JS Date, ISO string, epoch number,
 * and "DD-MM-YYYY" strings.
 */
const toMoment = (input: DateInput): Moment | null => {
  if (input === null || input === undefined) return null;

  // Firestore Timestamp instance
  if (typeof (input as { toDate?: () => Date }).toDate === "function") {
    return moment((input as { toDate: () => Date }).toDate());
  }

  // Serialized Firestore Timestamp { seconds, nanoseconds }
  if (typeof (input as { seconds?: number }).seconds === "number") {
    return moment(new Date((input as { seconds: number }).seconds * 1000));
  }

  // JS Date
  if (input instanceof Date) {
    return moment(input);
  }

  // "DD-MM-YYYY" string
  if (
    typeof input === "string" &&
    input.length === 10 &&
    input.split("-").length === 3
  ) {
    return moment(input, "DD-MM-YYYY");
  }

  // ISO string / epoch number / anything moment ingests natively
  return moment(input as string | number);
};

/**
 * Parse a `DD-MM-YYYY` string (or Firestore Timestamp) and format it.
 */
export function formatDate(
  input: DateInput,
  parserFormat = "DD-MM-YYYY",
  outputFormat = "ddd Do MMM",
): string {
  const parsed =
    typeof (input as { toDate?: () => Date })?.toDate === "function"
      ? moment((input as { toDate: () => Date }).toDate())
      : moment(input as string, parserFormat);

  return parsed.isValid() ? parsed.format(outputFormat) : "";
}

/**
 * Relative "x minutes ago" string from any supported timestamp shape.
 */
export const timeAgo = (createdAt: DateInput): string => {
  const parsed = toMoment(createdAt);
  if (!parsed || !parsed.isValid()) return "";
  return parsed.fromNow();
};

/**
 * Epoch milliseconds from any supported timestamp shape.
 * Returns 0 for null/invalid input so it sorts safely to the bottom.
 */
export const getTime = (value: DateInput): number => {
  const parsed = toMoment(value);
  return parsed && parsed.isValid() ? parsed.valueOf() : 0;
};
