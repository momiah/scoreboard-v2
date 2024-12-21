import { ranks } from "../rankingMedals/ranking/ranks";

// const ranks = [
//   { name: "Recruit", xp: 0 },

//   { name: "Apprentice", xp: 200 },
//   { name: "Apprentice II", xp: 300 },
//   { name: "Private", xp: 400 },
//   { name: "Private II", xp: 500 },
//   { name: "Corporal", xp: 600 },
//   { name: "Corporal II", xp: 700 },
//   { name: "Sergeant", xp: 800 },
//   { name: "Sergeant II", xp: 900 },
//   { name: "Sergeant III", xp: 1000 },
//   { name: "Gunnery Sergeant", xp: 1100 },
//   { name: "Gunnery Sergeant II", xp: 1200 },
//   { name: "Gunnery Sergeant III", xp: 1300 },
//   { name: "Gunnery Sergeant IV", xp: 1400 },
//   { name: "Lieutenant", xp: 1500 },
//   { name: "Lieutenant II", xp: 1600 },
//   { name: "Lieutenant III", xp: 1700 },
//   { name: "Captain", xp: 1800 },
//   { name: "Captain II", xp: 1900 },
//   { name: "Captain III", xp: 2000 },
//   { name: "Captain IV", xp: 2100 },
//   { name: "Major", xp: 2200 },
//   { name: "Major II", xp: 2300 },
//   { name: "Major III", xp: 2400 },
//   { name: "Major IV", xp: 2500 },
//   { name: "Commander", xp: 2600 },
//   { name: "Commander II", xp: 2700 },
//   { name: "Commander III", xp: 2800 },
//   { name: "Commander IV", xp: 2900 },
//   { name: "Colonel", xp: 3000 },
//   { name: "Colonel II", xp: 3100 },
//   { name: "Colonel III", xp: 3200 },
//   { name: "Colonel IV", xp: 3300 },
//   { name: "Brigadier", xp: 3400 },
//   { name: "Brigadier II", xp: 3500 },
//   { name: "Brigadier III", xp: 3600 },
//   { name: "Brigadier IV", xp: 3700 },
//   { name: "General", xp: 3800 },
//   { name: "General II", xp: 3900 },
//   { name: "General III", xp: 4000 },
//   { name: "General IV", xp: 4100 },
// ];

export const medalNames = (xp) => {
  const rank = ranks.find((rank, index) => {
    const nextRank = ranks[index + 1];
    if (nextRank) {
      return xp >= rank.xp && xp < nextRank.xp;
    } else {
      // If there's no next rank, assume xp is greater than the last rank's xp
      return xp >= rank.xp;
    }
  });
  return rank ? rank.name : "Recruit";
};
