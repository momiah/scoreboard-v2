import { canHandleHighQualityImages } from "../utils/canRenderHighQualityImages";

// const gameMedals = {
//   //Old halo 3 medals
//   // win_streak_3: require("./WinStreak_3.png"),
//   // win_streak_5: require("./WinStreak_5.png"),
//   // win_streak_7: require("./WinStreak_7.png"),
//   // demon_win: require("./Demon_Win.png"),
// };

const highQualityMedals = {
  win_streak_3: require("./winStreak3.png"),
  win_streak_5: require("./winStreak5.png"),
  win_streak_7: require("./winStreak7.png"),
  demon_win: require("./assassin.png"),
};

const lowQualityMedals = {
  win_streak_3: require("./ranking/micro-rank-icons/micro-winStreak3.png"),
  win_streak_5: require("./ranking/micro-rank-icons/micro-winStreak5.png"),
  win_streak_7: require("./ranking/micro-rank-icons/micro-winStreak7.png"),
  demon_win: require("./ranking/micro-rank-icons/micro-assassin.png"),
};

const gameMedals = canHandleHighQualityImages()
  ? highQualityMedals
  : lowQualityMedals;

export default gameMedals;
