// utils/flagCountryCodes.js
// react-native-ico-flags keys its flag assets by uppercase ISO code (via its
// internal `synonyms` map). Passing a code it doesn't know renders a "?"
// placeholder, so this set lets callers decide whether to show a flag or fall
// back to an empty avatar circle instead.
import flagSynonyms from "react-native-ico-flags/src/synonyms";

const flagIsoCodes = new Set(Object.keys(flagSynonyms));

export const hasFlag = (isoCode) =>
  typeof isoCode === "string" && flagIsoCodes.has(isoCode.toUpperCase());
