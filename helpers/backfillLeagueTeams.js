// helpers/backfillLeagueTeams.js
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { calculateTeamPerformance } from "./calculateTeamPerformance";

/** ✅ PURE helper: rebuild teams from games (no Firestore). */
export const computeLeagueTeamsFromGames = async (games, leagueId) => {
  const rebuiltTeams = [];
  const retrieveTeams = async () => rebuiltTeams;

  const ensureTeamInList = (teamList, team) => {
    if (!team || !team.teamKey) return;
    const i = teamList.findIndex((t) => t.teamKey === team.teamKey);
    if (i === -1) teamList.push(team);
    else teamList[i] = team;
  };

  for (const game of games) {
    if (!game) continue;

    const allTeams = await retrieveTeams();
    const [winnerTeam, loserTeam] = await calculateTeamPerformance({
      game,
      allTeams,
    });
    ensureTeamInList(rebuiltTeams, winnerTeam);
    ensureTeamInList(rebuiltTeams, loserTeam);
  }

  return rebuiltTeams;
};

// (kept as-is) the Firestore backfill that uses the pure helper above
export const backfillLeagueTeams = async () => {
  const leaguesSnapshot = await getDocs(collection(db, "leagues"));
  let leaguesUpdated = 0;
  let gamesScanned = 0;
  let totalTeamsBuilt = 0;

  for (const leagueDoc of leaguesSnapshot.docs) {
    const leagueData = leagueDoc.data() || {};
    const games = Array.isArray(leagueData.games) ? leagueData.games : [];
    if (!games.length) continue;

    const leagueId = leagueDoc.id;
    const rebuiltTeams = await computeLeagueTeamsFromGames(games, leagueId);
    gamesScanned += games.length;
    totalTeamsBuilt += rebuiltTeams.length;

    await updateDoc(leagueDoc.ref, { leagueTeams: rebuiltTeams });
    leaguesUpdated += 1;
  }

  return { leaguesUpdated, gamesScanned, totalTeamsBuilt };
};
