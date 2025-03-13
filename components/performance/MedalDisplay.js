// MedalDisplay.js
import React, { useContext } from "react";
import { Image } from "react-native";
import { GameContext } from "../../context/GameContext";

const MedalDisplay = ({ xp, size }) => {
  const { getRankByXP } = useContext(GameContext);
  const rank = getRankByXP(xp);

  return (
    <Image
      source={rank.icon}
      style={{ width: size, height: size, resizeMode: "contain" }}
    />
  );
};

// Move memo() to the export
export default React.memo(MedalDisplay);

// Function to map XP to medal image // Halo 3 ranks
// const getMedalByXP = (xp) => {
//   if (xp >= 4100) return rankingMedals.general_G4;
//   if (xp >= 4000) return rankingMedals.general_G3;
//   if (xp >= 3900) return rankingMedals.general_G2;
//   if (xp >= 3800) return rankingMedals.general;
//   if (xp >= 3700) return rankingMedals.brigadier_G4;
//   if (xp >= 3600) return rankingMedals.brigadier_G3;
//   if (xp >= 3500) return rankingMedals.brigadier_G2;
//   if (xp >= 3400) return rankingMedals.brigadier;
//   if (xp >= 3300) return rankingMedals.colonel_G4;
//   if (xp >= 3200) return rankingMedals.colonel_G3;
//   if (xp >= 3100) return rankingMedals.colonel_G2;
//   if (xp >= 3000) return rankingMedals.colonel;
//   if (xp >= 2900) return rankingMedals.commander_G4;
//   if (xp >= 2800) return rankingMedals.commander_G3;
//   if (xp >= 2700) return rankingMedals.commander_G2;
//   if (xp >= 2600) return rankingMedals.commander;
//   if (xp >= 2500) return rankingMedals.major_G4;
//   if (xp >= 2400) return rankingMedals.major_G3;
//   if (xp >= 2300) return rankingMedals.major_G2;
//   if (xp >= 2200) return rankingMedals.major;
//   if (xp >= 2100) return rankingMedals.captain_G4;
//   if (xp >= 2000) return rankingMedals.captain_G3;
//   if (xp >= 1900) return rankingMedals.captain_G2;
//   if (xp >= 1800) return rankingMedals.captain;
//   if (xp >= 1700) return rankingMedals.lieutenant_G3;
//   if (xp >= 1600) return rankingMedals.lieutenant_G2;
//   if (xp >= 1500) return rankingMedals.lieutenant;
//   if (xp >= 1400) return rankingMedals.gunnerySergeant_G4;
//   if (xp >= 1300) return rankingMedals.gunnerySergeant_G3;
//   if (xp >= 1200) return rankingMedals.gunnerySergeant_G2;
//   if (xp >= 1100) return rankingMedals.gunnerySergeant;
//   if (xp >= 1000) return rankingMedals.sergeant_G3;
//   if (xp >= 900) return rankingMedals.sergeant_G2;
//   if (xp >= 800) return rankingMedals.sergeant;
//   if (xp >= 700) return rankingMedals.corporal_G2;
//   if (xp >= 600) return rankingMedals.corporal;
//   if (xp >= 500) return rankingMedals.private_G2;
//   if (xp >= 400) return rankingMedals.private;
//   if (xp >= 300) return rankingMedals.apprentice_G2;
//   if (xp >= 200) return rankingMedals.apprentice;

//   return rankingMedals.recruit; // Default to recruit for XP < 200
// };
