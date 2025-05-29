// export const ranks = [
//   // Tier 1
//   { name: "Beginner", xp: 0, icon: require("./bronze_rank1-min.png") }, // +100 Rank Group 1
//   { name: "Beginner II", xp: 100, icon: require("./silver_rank1-min.png") },
//   { name: "Beginner III", xp: 200, icon: require("./ruby_rank1-min.png") },
//   { name: "Beginner IV", xp: 300, icon: require("./gold_rank1-min.png") },

//   { name: "Rookie", xp: 450, icon: require("./bronze_rank2-min.png") }, // +150 Rank Group 2
//   { name: "Rookie II", xp: 600, icon: require("./silver_rank2-min.png") },
//   { name: "Rookie III", xp: 750, icon: require("./ruby_rank2-min.png") },
//   { name: "Rookie IV", xp: 900, icon: require("./gold_rank2-min.png") },

//   { name: "Apprentice", xp: 1100, icon: require("./bronze_rank3-min.png") }, // +200  Rank Group 3
//   { name: "Apprentice II", xp: 1300, icon: require("./silver_rank3-min.png") },
//   { name: "Apprentice III", xp: 1500, icon: require("./ruby_rank3-min.png") },
//   { name: "Apprentice IV", xp: 1700, icon: require("./gold_rank3-min.png") },

//   { name: "Challenger", xp: 1950, icon: require("./bronze_rank4-min.png") }, // +250 Rank Group 4
//   { name: "Challenger II", xp: 2200, icon: require("./silver_rank4-min.png") },
//   { name: "Challenger III", xp: 2450, icon: require("./ruby_rank4-min.png") },
//   { name: "Challenger IV", xp: 2700, icon: require("./gold_rank4-min.png") },

//   // Tier 2
//   { name: "Competitor", xp: 3000, icon: require("./bronze_rank5-min.png") }, // +300 Rank Group 5
//   { name: "Competitor II", xp: 3300, icon: require("./silver_rank5-min.png") },
//   { name: "Competitor III", xp: 3600, icon: require("./ruby_rank5-min.png") },
//   { name: "Competitor IV", xp: 3900, icon: require("./gold_rank5-min.png") },

//   { name: "Intermediate", xp: 4250, icon: require("./bronze_rank6-min.png") }, // +350 Rank Group 6
//   {
//     name: "Intermediate II",
//     xp: 4600,
//     icon: require("./silver_rank6-min.png"),
//   },
//   { name: "Intermediate III", xp: 4950, icon: require("./ruby_rank6-min.png") },
//   { name: "Intermediate IV", xp: 5300, icon: require("./gold_rank6-min.png") },

//   { name: "Proficient", xp: 5700, icon: require("./bronze_rank7-min.png") }, // +400 Rank Group 7
//   { name: "Proficient II", xp: 6100, icon: require("./silver_rank7-min.png") },
//   { name: "Proficient III", xp: 6500, icon: require("./ruby_rank7-min.png") },
//   { name: "Proficient IV", xp: 6900, icon: require("./gold_rank7-min.png") },

//   { name: "Advanced", xp: 7350, icon: require("./bronze_rank8-min.png") }, // +450 Rank Group 8
//   { name: "Advanced II", xp: 7800, icon: require("./silver_rank8-min.png") },
//   { name: "Advanced III", xp: 8250, icon: require("./ruby_rank8-min.png") },
//   { name: "Advanced IV", xp: 8700, icon: require("./gold_rank8-min.png") },

//   // Tier 3
//   { name: "Expert", xp: 9200, icon: require("./bronze_rank9-min.png") }, // +500 Rank Group 9
//   { name: "Expert II", xp: 9700, icon: require("./silver_rank9-min.png") },
//   { name: "Expert III", xp: 10200, icon: require("./ruby_rank9-min.png") },
//   { name: "Expert IV", xp: 10700, icon: require("./gold_rank9-min.png") },

//   { name: "Elite", xp: 11350, icon: require("./bronze_rank10-min.png") }, // +550 Rank Group 10
//   { name: "Elite II", xp: 11900, icon: require("./silver_rank10-min.png") },
//   { name: "Elite III", xp: 12450, icon: require("./ruby_rank10-min.png") },
//   { name: "Elite IV", xp: 13000, icon: require("./gold_rank10-min.png") },

//   { name: "Master", xp: 13600, icon: require("./bronze_rank11-min.png") }, // +600 Rank Group 11
//   { name: "Master II", xp: 14200, icon: require("./silver_rank11-min.png") },
//   { name: "Master III", xp: 14800, icon: require("./ruby_rank11-min.png") },
//   { name: "Master IV", xp: 15400, icon: require("./gold_rank11-min.png") },

//   { name: "Grandmaster", xp: 16000, icon: require("./bronze_rank12-min.png") }, // +650 Rank Group 12
//   {
//     name: "Grandmaster II",
//     xp: 16650,
//     icon: require("./silver_rank12-min.png"),
//   },
//   {
//     name: "Grandmaster III",
//     xp: 17350,
//     icon: require("./ruby_rank12-min.png"),
//   },
//   { name: "Grandmaster IV", xp: 18000, icon: require("./gold_rank12-min.png") },

//   // Tier 4
//   { name: "Demon", xp: 18700, icon: require("./bronze_rank13-min.png") }, // +700 Rank Group 13
//   { name: "Demon II", xp: 19400, icon: require("./silver_rank13-min.png") },
//   { name: "Demon III", xp: 20100, icon: require("./ruby_rank13-min.png") },
//   { name: "Demon IV", xp: 21800, icon: require("./gold_rank13-min.png") },

//   { name: "Champion", xp: 22550, icon: require("./bronze_rank14-min.png") }, // +750 Rank Group 14
//   { name: "Champion II", xp: 23300, icon: require("./silver_rank14-min.png") },
//   { name: "Champion III", xp: 24050, icon: require("./ruby_rank14-min.png") },
//   { name: "Champion IV", xp: 24800, icon: require("./gold_rank14-min.png") },

//   { name: "Legend I", xp: 25600, icon: require("./bronze_rank15-min.png") }, // +800 Rank Group 15
//   { name: "Legend II", xp: 26400, icon: require("./silver_rank15-min.png") },
//   { name: "Legend III", xp: 27200, icon: require("./ruby_rank15-min.png") },
//   { name: "Legend IV", xp: 28000, icon: require("./gold_rank15-min.png") },

//   { name: "Immortal I", xp: 28850, icon: require("./bronze_rank16-min.png") }, // +850 Rank Group 16
//   { name: "Immortal II", xp: 29700, icon: require("./silver_rank16-min.png") },
//   { name: "Immortal III", xp: 30550, icon: require("./ruby_rank16-min.png") },
//   { name: "Immortal IV", xp: 31400, icon: require("./gold_rank16-min.png") },

//   // { name: "Immortal V", xp: 35000, icon: require('./bronze_rank17-min.png') }, // +900 Rank Group 17
// ];

export const ranks = [
  // Tier 1
  { name: "Beginner", xp: 0, icon: require("./bronze_rank1-min.png") }, // Group 1 - Step: 100
  { name: "Beginner II", xp: 100, icon: require("./silver_rank1-min.png") },
  { name: "Beginner III", xp: 200, icon: require("./ruby_rank1-min.png") },
  { name: "Beginner IV", xp: 300, icon: require("./gold_rank1-min.png") },

  { name: "Rookie", xp: 400, icon: require("./bronze_rank2-min.png") }, // Group 2 - Step: 200
  { name: "Rookie II", xp: 600, icon: require("./silver_rank2-min.png") },
  { name: "Rookie III", xp: 800, icon: require("./ruby_rank2-min.png") },
  { name: "Rookie IV", xp: 1000, icon: require("./gold_rank2-min.png") },

  { name: "Apprentice", xp: 1300, icon: require("./bronze_rank3-min.png") }, // Group 3 - Step: 300
  { name: "Apprentice II", xp: 1600, icon: require("./silver_rank3-min.png") },
  { name: "Apprentice III", xp: 1900, icon: require("./ruby_rank3-min.png") },
  { name: "Apprentice IV", xp: 2200, icon: require("./gold_rank3-min.png") },

  { name: "Challenger", xp: 2600, icon: require("./bronze_rank4-min.png") }, // Group 4 - Step: 400
  { name: "Challenger II", xp: 3000, icon: require("./silver_rank4-min.png") },
  { name: "Challenger III", xp: 3400, icon: require("./ruby_rank4-min.png") },
  { name: "Challenger IV", xp: 3800, icon: require("./gold_rank4-min.png") },

  // Tier 2
  { name: "Competitor", xp: 4300, icon: require("./bronze_rank5-min.png") }, // Group 5 - Step: 500
  { name: "Competitor II", xp: 4800, icon: require("./silver_rank5-min.png") },
  { name: "Competitor III", xp: 5300, icon: require("./ruby_rank5-min.png") },
  { name: "Competitor IV", xp: 5800, icon: require("./gold_rank5-min.png") },

  { name: "Intermediate", xp: 6400, icon: require("./bronze_rank6-min.png") }, // Group 6 - Step: 600
  {
    name: "Intermediate II",
    xp: 7000,
    icon: require("./silver_rank6-min.png"),
  },
  { name: "Intermediate III", xp: 7600, icon: require("./ruby_rank6-min.png") },
  { name: "Intermediate IV", xp: 8200, icon: require("./gold_rank6-min.png") },

  { name: "Proficient", xp: 8900, icon: require("./bronze_rank7-min.png") }, // Group 7 - Step: 700
  { name: "Proficient II", xp: 9600, icon: require("./silver_rank7-min.png") },
  { name: "Proficient III", xp: 10300, icon: require("./ruby_rank7-min.png") },
  { name: "Proficient IV", xp: 11000, icon: require("./gold_rank7-min.png") },

  { name: "Advanced", xp: 11800, icon: require("./bronze_rank8-min.png") }, // Group 8 - Step: 800
  { name: "Advanced II", xp: 12600, icon: require("./silver_rank8-min.png") },
  { name: "Advanced III", xp: 13400, icon: require("./ruby_rank8-min.png") },
  { name: "Advanced IV", xp: 14200, icon: require("./gold_rank8-min.png") },

  // Tier 3
  { name: "Expert", xp: 15100, icon: require("./bronze_rank9-min.png") }, // Group 9 - Step: 900
  { name: "Expert II", xp: 16000, icon: require("./silver_rank9-min.png") },
  { name: "Expert III", xp: 16900, icon: require("./ruby_rank9-min.png") },
  { name: "Expert IV", xp: 17800, icon: require("./gold_rank9-min.png") },

  { name: "Elite", xp: 18800, icon: require("./bronze_rank10-min.png") }, // Group 10 - Step: 1000
  { name: "Elite II", xp: 19800, icon: require("./silver_rank10-min.png") },
  { name: "Elite III", xp: 20800, icon: require("./ruby_rank10-min.png") },
  { name: "Elite IV", xp: 21800, icon: require("./gold_rank10-min.png") },

  { name: "Master", xp: 22900, icon: require("./bronze_rank11-min.png") }, // Group 11 - Step: 1100
  { name: "Master II", xp: 24000, icon: require("./silver_rank11-min.png") },
  { name: "Master III", xp: 25100, icon: require("./ruby_rank11-min.png") },
  { name: "Master IV", xp: 26200, icon: require("./gold_rank11-min.png") },

  { name: "Grandmaster", xp: 27400, icon: require("./bronze_rank12-min.png") }, // Group 12 - Step: 1200
  {
    name: "Grandmaster II",
    xp: 28600,
    icon: require("./silver_rank12-min.png"),
  },
  {
    name: "Grandmaster III",
    xp: 29800,
    icon: require("./ruby_rank12-min.png"),
  },
  { name: "Grandmaster IV", xp: 31000, icon: require("./gold_rank12-min.png") },

  // Tier 4
  { name: "Demon", xp: 32300, icon: require("./bronze_rank13-min.png") }, // Group 13 - Step: 1300
  { name: "Demon II", xp: 33600, icon: require("./silver_rank13-min.png") },
  { name: "Demon III", xp: 34900, icon: require("./ruby_rank13-min.png") },
  { name: "Demon IV", xp: 36200, icon: require("./gold_rank13-min.png") },

  { name: "Champion", xp: 37600, icon: require("./bronze_rank14-min.png") }, // Group 14 - Step: 1400
  { name: "Champion II", xp: 39000, icon: require("./silver_rank14-min.png") },
  { name: "Champion III", xp: 40400, icon: require("./ruby_rank14-min.png") },
  { name: "Champion IV", xp: 41800, icon: require("./gold_rank14-min.png") },

  { name: "Legend I", xp: 43300, icon: require("./bronze_rank15-min.png") }, // Group 15 - Step: 1500
  { name: "Legend II", xp: 44800, icon: require("./silver_rank15-min.png") },
  { name: "Legend III", xp: 46300, icon: require("./ruby_rank15-min.png") },
  { name: "Legend IV", xp: 47800, icon: require("./gold_rank15-min.png") },

  { name: "Immortal I", xp: 49400, icon: require("./bronze_rank16-min.png") }, // Group 16 - Step: 1600
  { name: "Immortal II", xp: 51000, icon: require("./silver_rank16-min.png") },
  { name: "Immortal III", xp: 52600, icon: require("./ruby_rank16-min.png") },
  { name: "Immortal IV", xp: 54200, icon: require("./gold_rank16-min.png") },

  // { name: "Immortal V", xp: 35000, icon: require("./purple_rank16.png") }, // +900 Rank Group 17
  // { name: "Immortal VI", xp: 35000, icon: require("./purple_rank16_v2.png") }, // +900 Rank Group 17
  // { name: "Immortal VII", xp: 35000, icon: require("./purple_rank16_v3.png") }, // +900 Rank Group 17
];

export function getRankByXP(xp) {
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (xp >= ranks[i].xp) {
      return ranks[i].icon;
    }
  }
  return null; // or you can return a default rank if needed
}
