// helpers/backfillLeagueGamesPlayersAndResult.js
import {
  collection,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import { formatDisplayName } from "../helpers/formatDisplayName";

/** Build canonical in-game player object (always includes displayName). */
const toPlayerObject = (inputPlayer) => {
  if (!inputPlayer) return null;

  const player = {
    userId: inputPlayer.userId ?? null,
    firstName: String(inputPlayer.firstName ?? "").trim(),
    lastName: String(inputPlayer.lastName ?? "").trim(),
    username: String(inputPlayer.username ?? "").trim(),
  };

  return {
    ...player,
    displayName: formatDisplayName(player),
  };
};

/** Build fast lookups from leagueParticipants (derive keys at runtime). */
const buildParticipantLookup = (participants = []) => {
  const byUsernameLower = new Map();
  const byDisplayName = new Map();

  for (const participant of participants) {
    if (!participant) continue;

    // Derive a lowercased username key from the participant's username.
    const participantUsername = String(participant.username ?? "").trim();
    if (participantUsername) {
      byUsernameLower.set(participantUsername.toLowerCase(), participant);
    }

    // Derive a formatted display name string for matching stored formatted names.
    const formattedName = formatDisplayName(participant);
    if (formattedName) {
      byDisplayName.set(formattedName, participant);
    }
  }

  return { byUsernameLower, byDisplayName };
};

/** Users collection helper (queries by stored users.usernameLower). */
const findUserByUsernameLower = async (username) => {
  if (!username) return null;
  const usernameLower = String(username).trim().toLowerCase();
  if (!usernameLower) return null;

  const userQuery = query(
    collection(db, "users"),
    where("usernameLower", "==", usernameLower),
    limit(1)
  );

  const snapshot = await getDocs(userQuery);
  if (snapshot.empty) return null;

  const document = snapshot.docs[0];
  return { userId: document.id, ...document.data() };
};

/**
 * Resolve whatever is stored in team.playerX into a full player object.
 * - If object: normalize.
 * - If string: try participants by (usernameLower key) -> participants by formatted displayName -> users by usernameLower -> fallback shell.
 */
const resolvePlayerValue = async (playerValue, participantLookup) => {
  if (!playerValue) return null;

  // Case 1: already an object
  if (typeof playerValue === "object" && playerValue !== null) {
    return toPlayerObject(playerValue);
  }

  // Case 2: string
  if (typeof playerValue === "string") {
    const inputString = playerValue.trim();
    const inputStringLower = inputString.toLowerCase();

    // 2a) participants by derived usernameLower key
    const participantByUsername =
      participantLookup.byUsernameLower.get(inputStringLower);
    if (participantByUsername) {
      return toPlayerObject(participantByUsername);
    }

    // 2b) participants by formatted displayName ("First L")
    const participantByDisplayName =
      participantLookup.byDisplayName.get(inputString);
    if (participantByDisplayName) {
      return toPlayerObject(participantByDisplayName);
    }

    // 2c) users by usernameLower (stored field on users docs)
    const userByUsername = await findUserByUsernameLower(inputString);
    if (userByUsername) {
      return toPlayerObject({
        userId: userByUsername.userId,
        firstName: userByUsername.firstName,
        lastName: userByUsername.lastName,
        username: userByUsername.username,
      });
    }

    // 2d) fallback minimal object so UI stays stable
    return toPlayerObject({
      userId: null,
      firstName: inputString,
      lastName: "",
      username: inputString,
    });
  }

  return null;
};

/** Rebuild result.{winner,loser}.players as arrays of displayName strings. */
const rebuildResultPlayers = (leagueType, team1, team2) => {
  const score1 = Number(team1?.score ?? 0);
  const score2 = Number(team2?.score ?? 0);
  const team1Wins = score1 > score2;

  const winnerTeam = team1Wins ? "Team 1" : "Team 2";
  const loserTeam = team1Wins ? "Team 2" : "Team 1";

  const getDisplayNames = (team) =>
    leagueType === "Singles"
      ? [team?.player1?.displayName].filter(Boolean)
      : [team?.player1?.displayName, team?.player2?.displayName].filter(
          Boolean
        );

  const winnerSide = team1Wins ? team1 : team2;
  const loserSide = team1Wins ? team2 : team1;

  return {
    winner: {
      team: winnerTeam,
      players: getDisplayNames(winnerSide),
      score: team1Wins ? score1 : score2,
    },
    loser: {
      team: loserTeam,
      players: getDisplayNames(loserSide),
      score: team1Wins ? score2 : score1,
    },
  };
};

/**
 * Backfill:
 * - Normalize players into objects (with displayName)
 * - Resolve usernames or formatted names into full objects
 * - Rebuild result players as displayName arrays
 * - Only update if something actually changed
 */
export const backfillLeagueGamesPlayersAndResult = async () => {
  const leaguesSnapshot = await getDocs(collection(db, "leagues"));

  let leaguesUpdated = 0;
  let gamesScanned = 0;
  let gamesUpdated = 0;

  for (const leagueDoc of leaguesSnapshot.docs) {
    const leagueData = leagueDoc.data() || {};
    const games = Array.isArray(leagueData.games) ? leagueData.games : [];
    if (!games.length) continue;

    const leagueType = leagueData.leagueType || "Doubles";
    const participants = Array.isArray(leagueData.leagueParticipants)
      ? leagueData.leagueParticipants
      : [];
    const participantLookup = buildParticipantLookup(participants);

    const updatedGames = [];
    let leagueChanged = false;

    for (const game of games) {
      gamesScanned += 1;
      if (!game) {
        updatedGames.push(game);
        continue;
      }

      const oldTeam1 = game.team1 || {};
      const oldTeam2 = game.team2 || {};

      const team1Player1 = await resolvePlayerValue(
        oldTeam1.player1,
        participantLookup
      );
      const team1Player2 =
        leagueType === "Doubles"
          ? await resolvePlayerValue(oldTeam1.player2, participantLookup)
          : null;

      const team2Player1 = await resolvePlayerValue(
        oldTeam2.player1,
        participantLookup
      );
      const team2Player2 =
        leagueType === "Doubles"
          ? await resolvePlayerValue(oldTeam2.player2, participantLookup)
          : null;

      const newTeam1 = {
        ...oldTeam1,
        player1: team1Player1,
        player2: leagueType === "Doubles" ? team1Player2 : null,
        score: Number(oldTeam1.score ?? 0),
      };
      const newTeam2 = {
        ...oldTeam2,
        player1: team2Player1,
        player2: leagueType === "Doubles" ? team2Player2 : null,
        score: Number(oldTeam2.score ?? 0),
      };

      const newResult = rebuildResultPlayers(leagueType, newTeam1, newTeam2);

      const changed =
        JSON.stringify(game.team1) !== JSON.stringify(newTeam1) ||
        JSON.stringify(game.team2) !== JSON.stringify(newTeam2) ||
        JSON.stringify(game.result) !== JSON.stringify(newResult);

      if (changed) {
        gamesUpdated += 1;
        leagueChanged = true;
      }

      updatedGames.push({
        ...game,
        team1: newTeam1,
        team2: newTeam2,
        result: newResult,
      });
    }

    if (leagueChanged) {
      await updateDoc(leagueDoc.ref, { games: updatedGames });
      leaguesUpdated += 1;
    }
  }

  return { leaguesUpdated, gamesScanned, gamesUpdated };
};

export {
  toPlayerObject,
  buildParticipantLookup,
  resolvePlayerValue,
  rebuildResultPlayers,
};
