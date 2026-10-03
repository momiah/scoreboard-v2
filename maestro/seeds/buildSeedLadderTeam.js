import { createRootTeam, TEAM_STATUS } from "@shared";
import { formatDisplayName } from "../../helpers/formatDisplayName";

const toTeamMember = (user) => ({
  userId: user.userId,
  username: user.username || "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  displayName: formatDisplayName(user),
  profileImage: user.profileImage || "",
});

export const buildSeedLadderTeam = ({ players, createdBy, teamName }) => {
  const team = createRootTeam({
    players: players.map(toTeamMember),
    createdBy: createdBy.userId,
    teamName,
    status: TEAM_STATUS.ACTIVE,
  });
  return { ...team, teamId: team.teamKey, XP: 0 };
};
