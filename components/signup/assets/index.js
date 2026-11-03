import logoTrimmed from "./logo-trimmed.png";
import logoIcon from "./logo-icon.png";
import ladderOutline from "./ladder-outline.png";
import trophyOutline from "./trophy-outline.png";
import medalOutline from "./medal-outline.png";
import rankBeginner1 from "./rank-beginner-1.png";
import rankBeginner2 from "./rank-beginner-2.png";
import rankBeginner3 from "./rank-beginner-3.png";
import rankBeginner4 from "./rank-beginner-4.png";

// Right-sized copies of artwork the app keeps at full resolution. The originals
// are up to 2000px square, which decode to ~16MB each when drawn at ~100pt.
const beginnerRankIcons = [
  rankBeginner1,
  rankBeginner2,
  rankBeginner3,
  rankBeginner4,
];

export {
  logoTrimmed,
  logoIcon,
  ladderOutline,
  trophyOutline,
  medalOutline,
  beginnerRankIcons,
};
