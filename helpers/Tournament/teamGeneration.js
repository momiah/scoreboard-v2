export const generateMixedDoublesTeams = ({
  mixedDoublesMode,
  participants,
}) => {
  let teams = [];
  const participantsCopy = [...participants];

  if (mixedDoublesMode === "Random") {
    // Randomly shuffle and pair
    const shuffled = participantsCopy.sort(() => 0.5 - Math.random());
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        teams.push({
          teamId: `team_${teams.length + 1}`,
          player1: {
            firstName: shuffled[i].firstName,
            lastName: shuffled[i].lastName,
            username: shuffled[i].username,
            displayName: shuffled[i].displayName,
            userId: shuffled[i].userId,
          },
          player2: {
            firstName: shuffled[i + 1].firstName,
            lastName: shuffled[i + 1].lastName,
            username: shuffled[i + 1].username,
            displayName: shuffled[i + 1].displayName,
            userId: shuffled[i + 1].userId,
          },
        });
      }
    }
  } else if (mixedDoublesMode === "Balanced") {
    // Sort by XP (highest to lowest)
    const sortedByXP = participantsCopy.sort((a, b) => b.XP - a.XP);

    // Pair highest XP with lowest XP
    const highXP = sortedByXP.slice(0, Math.floor(sortedByXP.length / 2));
    const lowXP = sortedByXP.slice(Math.floor(sortedByXP.length / 2)).reverse();

    for (let i = 0; i < highXP.length; i++) {
      if (lowXP[i]) {
        teams.push({
          teamId: `team_${teams.length + 1}`,
          player1: {
            firstName: highXP[i].firstName,
            lastName: highXP[i].lastName,
            username: highXP[i].username,
            displayName: highXP[i].displayName,
            userId: highXP[i].userId,
          },
          player2: {
            firstName: lowXP[i].firstName,
            lastName: lowXP[i].lastName,
            username: lowXP[i].username,
            displayName: lowXP[i].displayName,
            userId: lowXP[i].userId,
          },
        });
      }
    }
  }

  return teams;
};
