import { readFileSync } from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

const WIDTH = 1200;
const HEIGHT = 630;

const fontDir = path.dirname(
  require.resolve("@expo-google-fonts/inter/package.json"),
);
const FONT_FILES = [
  "400Regular/Inter_400Regular.ttf",
  "700Bold/Inter_700Bold.ttf",
  "800ExtraBold/Inter_800ExtraBold.ttf",
].map((file) => path.join(fontDir, file));

const asset = (file: string) =>
  readFileSync(path.join(__dirname, "../assets", file)).toString("base64");
const trophy = asset("ladder-trophy.png");
const logo = asset("court-champs-logo.png");

const GENDER_LABELS: Record<string, string> = {
  Mens: "Men's",
  Womens: "Women's",
  Mixed: "Mixed",
};

/** "Men's Doubles", "Women's Singles", "Mixed Doubles". */
export const ladderCardTitle = (genderType?: string, ladderType?: string) =>
  [GENDER_LABELS[genderType ?? ""] ?? genderType, ladderType]
    .filter(Boolean)
    .join(" ");

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export interface LadderPreRegistrationCard {
  title: string;
  prizePool: string;
  cash: boolean;
}

/** A 1200x630 link-preview image: the ladder name, its prize pool and the trophy. */
export const renderLadderPreRegistrationCard = ({
  title: rawTitle,
  prizePool,
  cash,
}: LadderPreRegistrationCard): Buffer => {
  const title = escapeXml(
    rawTitle.length > 26 ? `${rawTitle.slice(0, 25)}…` : rawTitle,
  );
  const amountSize = prizePool.length > 9 ? 112 : 136;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a2a4a"/>
      <stop offset="0.6" stop-color="#03101f"/>
      <stop offset="1" stop-color="#01060d"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffc800" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffc800" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="14" y="14" width="${WIDTH - 28}" height="${HEIGHT - 28}" rx="28" fill="none" stroke="#ffc800" stroke-opacity="0.55" stroke-width="3"/>
  <circle cx="950" cy="315" r="250" fill="url(#glow)"/>
  <image href="data:image/png;base64,${trophy}" x="790" y="135" width="320" height="360" preserveAspectRatio="xMidYMid meet"/>
  <image href="data:image/png;base64,${logo}" x="80" y="48" width="190" height="71" preserveAspectRatio="xMinYMid meet"/>
  <text x="80" y="170" font-family="Inter" font-weight="700" font-size="28" letter-spacing="6" fill="#00A2FF">REGIONAL LADDER</text>
  <text x="80" y="240" font-family="Inter" font-weight="800" font-size="64" fill="#ffffff">${title}</text>
  <text x="80" y="300" font-family="Inter" font-weight="400" font-size="34" fill="#c9d6e3">Up to</text>
  <text x="80" y="${296 + amountSize}" font-family="Inter" font-weight="800" font-size="${amountSize}" fill="#ffc800">${escapeXml(prizePool)}</text>
  <text x="80" y="${344 + amountSize}" font-family="Inter" font-weight="700" font-size="38" fill="#ffffff">to be won</text>
  <rect x="80" y="${374 + amountSize}" width="${cash ? 400 : 300}" height="60" rx="30" fill="#00A2FF"/>
  <text x="${cash ? 280 : 230}" y="${414 + amountSize}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#ffffff">${cash ? "Free to pre-register" : "Free to enter"}</text>
</svg>`;

  return new Resvg(svg, {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
    fitTo: { mode: "width", value: WIDTH },
  })
    .render()
    .asPng();
};
