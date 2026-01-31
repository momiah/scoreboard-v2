import React, { createContext, useState, useEffect, useContext } from "react";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  increment,
} from "firebase/firestore";
import moment from "moment";

// import { generatedLeagues } from "../components/Leagues/leagueMocks";
import { ccDefaultImage } from "../mockImages";
import { db } from "../services/firebase.config";

import { generateCourtId } from "../helpers/generateCourtId";
import { generateUniqueUserId } from "../helpers/generateUniqueUserId";
import {
  userProfileSchema,
  scoreboardProfileSchema,
  profileDetailSchema,
  ccImageEndpoint,
} from "../schemas/schema";
import { UserContext } from "./UserContext";
import { notificationTypes } from "../schemas/schema";
import { COMPETITION_TYPES, COLLECTION_NAMES } from "../schemas/schema";
import { notificationSchema } from "../schemas/schema";
import { calculatePlayerPerformance } from "../helpers/calculatePlayerPerformance";
import { calculateTeamPerformance } from "../helpers/calculateTeamPerformance";
import { formatDisplayName } from "@/helpers/formatDisplayName";
import { getCompetitionConfig } from "@/helpers/getCompetitionConfig";

const LeagueContext = createContext();

// ============================================
// HELPER FUNCTIONS (for game approval)
// ============================================

/**
 * Find game in competition (handles both league and tournament structures)
 */
const findGameInCompetition = (competitionData, gameId, isTournament) => {
  if (isTournament) {
    const allGames =
      competitionData.fixtures?.flatMap((fixture) => fixture.games) || [];
    const index = allGames.findIndex((game) => game.gameId === gameId);
    return { game: allGames[index] || null, index, games: allGames };
  }

  const games = competitionData.games || [];
  const index = games.findIndex((game) => game.gameId === gameId);
  return { game: games[index] || null, index, games };
};

/**
 * Get player user IDs from a game
 */
const getPlayerUserIds = (game) => {
  return [
    game.team1.player1?.userId,
    game.team1.player2?.userId,
    game.team2.player1?.userId,
    game.team2.player2?.userId,
  ].filter(Boolean);
};

const LeagueProvider = ({ children }) => {
  const [upcomingLeagues, setUpcomingLeagues] = useState([]);
  const {
    sendNotification,
    getUserById,
    updatePlayers,
    updateTeams,
    updateUsers,
    retrieveTeams,
    currentUser,
    readNotification,
  } = useContext(UserContext);
  const [showMockData, setShowMockData] = useState(false);
  const [leagueNavigationId, setLeagueNavigationId] = useState("");
  const [tournamentNavigationId, setTournamentNavigationId] = useState("");
  const [leagueById, setLeagueById] = useState(null);
  const [tournamentById, setTournamentById] = useState(null);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);

  useEffect(() => {
    fetchUpcomingLeagues();
    fetchUpcomingTournaments();
  }, []);

  // NEED TO MODIFY LEAGUE SCHEMA TO INCLUDE COUNTRY CODE AT TOP LEVEL RATHER THAN NESTED
  // const fetchUpcomingLeagues = async () => {
  //   try {
  //     const leaguesRef = collection(db, "leagues");
  //     let leaguesQuery;

  //     console.log('location.countryCode:', currentUser?.location.countryCode);

  //     if (currentUser?.country) {
  //       leaguesQuery = query(
  //         leaguesRef,
  //         where("location.countryCode", "==", currentUser?.location.countryCode),
  //         // orderBy("startDate", "asc"),
  //         // limit(10)
  //       );
  //     } else {
  //       leaguesQuery = query(
  //         leaguesRef,
  //         orderBy("startDate", "asc"),
  //         limit(10)
  //       );
  //     }

  //     const snapshot = await getDocs(leaguesQuery);
  //     const leagues = snapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));
  //     setUpcomingLeagues(leagues);
  //   } catch (error) {
  //     console.error("Error fetching upcoming leagues:", error);
  //   }
  // };

  // NEED TO REPLACE FOR THE ABOVE TO QUERY RATHER THAN FILTERING ON THE FRONT END BELOW
  // MAX 200 LEAGUES UNTIL IT START TO SLOW DOWN

  const fetchUpcomingLeagues = async () => {
    try {
      const leaguesRef = collection(db, "leagues");

      // Simply get 30 most recently created leagues
      const q = query(leaguesRef, orderBy("createdAt", "desc"), limit(30));

      const snapshot = await getDocs(q);
      const leagues = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (currentUser?.location?.countryCode) {
        const filteredLeagues = leagues.filter(
          (league) =>
            league.location?.countryCode === currentUser.location.countryCode
        );
        setUpcomingLeagues(filteredLeagues);
        return;
      }

      setUpcomingLeagues(leagues);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };
  const fetchUpcomingTournaments = async () => {
    try {
      const tournamentsRef = collection(db, "tournaments");

      // Simply get 30 most recently created tournaments
      const q = query(tournamentsRef, orderBy("createdAt", "desc"), limit(30));

      const snapshot = await getDocs(q);
      const tournaments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // if (currentUser?.location?.countryCode) {
      //   const filteredTournaments = tournaments.filter(
      //     (tournament) =>
      //       tournament.location?.countryCode ===
      //       currentUser.location.countryCode
      //   );
      //   setUpcomingTournaments(filteredTournaments);
      //   return;
      // }

      setUpcomingTournaments(tournaments);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  const fetchLeagues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "leagues"));

      const leaguesData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          image: data.image || ccDefaultImage, // Set default image if none exists
        };
      });

      return leaguesData;
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  const addPlaytime = async ({
    playtime,
    existingPlaytime = null,
    competitionType,
    competitionId,
  }) => {
    try {
      const collectionName =
        competitionType === "league" ? "leagues" : "tournaments";

      const collectionRef = collection(db, collectionName);
      const docRef = doc(collectionRef, competitionId);

      const docSnapshot = await getDoc(docRef);

      if (docSnapshot.exists()) {
        const currentPlaytime = docSnapshot.data().playingTime || [];
        let updatedPlaytime;

        if (existingPlaytime) {
          updatedPlaytime = currentPlaytime.map((time) =>
            time.day === existingPlaytime.day &&
            time.startTime === existingPlaytime.startTime &&
            time.endTime === existingPlaytime.endTime
              ? playtime[0] // Replace with updated playtime
              : time
          );
        } else {
          updatedPlaytime = [...currentPlaytime, ...playtime];
        }

        // Update the document with updated playtime array
        await updateDoc(docRef, { playingTime: updatedPlaytime });
      } else {
        console.error("Document not found.");
        Alert.alert("Error", "Document not found.");
      }
    } catch (error) {
      console.error("Error saving playtime:", error);
      Alert.alert("Error", "Error saving playtime data");
    }
  };

  const deletePlaytime = async ({
    playtimeToDelete,
    competitionType,
    competitionId,
  }) => {
    try {
      const collectionRef = collection(
        db,
        competitionType === "league" ? "leagues" : "tournaments"
      );
      const docRef = doc(collectionRef, competitionId);

      const docSnapshot = await getDoc(docRef);

      if (docSnapshot.exists()) {
        const currentPlaytime = docSnapshot.data().playingTime || [];

        // Filter out the playtime to be deleted
        const updatedPlaytime = currentPlaytime.filter(
          (playtime) =>
            !(
              playtime.day === playtimeToDelete.day &&
              playtime.startTime === playtimeToDelete.startTime &&
              playtime.endTime === playtimeToDelete.endTime
            )
        );

        // Update Firebase with updated playtime array
        await updateDoc(docRef, { playingTime: updatedPlaytime });
      } else {
        console.error("Document not found.");
        Alert.alert("Error", "Document not found.");
      }
    } catch (error) {
      console.error("Error deleting playtime:", error);
      Alert.alert("Error", "Error deleting playtime");
    }
  };

  const handleLeagueDescription = async (newDescription) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueById.id);

      // Update the leagueDescription field in Firebase
      await updateDoc(leagueDocRef, { leagueDescription: newDescription });

      // Update the context state with new description
      setLeagueById((prev) => ({
        ...prev,
        leagueDescription: newDescription,
      }));
    } catch (error) {
      console.error("Error updating league description:", error);
      Alert.alert("Error", "Unable to update the league description.");
    }
  };

  const COMPETITION_CONFIG = {
    league: {
      collectionName: "leagues",
      idField: "leagueId",
      nameField: "leagueName",
      setNavigationId: (id) => setLeagueNavigationId(id),
      clearNavigationId: () => setLeagueNavigationId(""),
    },
    tournament: {
      collectionName: "tournaments",
      idField: "tournamentId",
      nameField: "tournamentName",
      setNavigationId: (id) => setTournamentNavigationId(id),
      clearNavigationId: () => setTournamentNavigationId(""),
    },
  };

  const createWelcomeChatMessage = async ({
    collectionName,
    documentId,
    title,
  }) => {
    const messageReference = doc(
      collection(db, collectionName, documentId, "chat")
    );
    await setDoc(messageReference, {
      _id: "welcome",
      text: `Welcome to the chat for ${title || ""}!`,
      createdAt: new Date(),
      user: {
        _id: "system",
        name: "CourtChamps",
        avatar: ccImageEndpoint,
      },
    });
  };

  const addCompetition = async ({
    data,
    competitionType,
    resetDelayMs = 2000,
  }) => {
    try {
      const config = COMPETITION_CONFIG[competitionType];
      if (!config) {
        console.warn("Unknown competitionType:", competitionType);
        return;
      }

      const {
        collectionName,
        idField,
        nameField,
        setNavigationId,
        clearNavigationId,
      } = config;

      const documentId = data?.[idField];
      const title = data?.[nameField];

      if (!documentId) {
        console.error(`Missing required id field "${idField}" on data.`);
        return;
      }

      await setDoc(doc(db, collectionName, documentId), { ...data });
      await createWelcomeChatMessage({ collectionName, documentId, title });

      setNavigationId(documentId);

      setTimeout(() => {
        clearNavigationId();
      }, resetDelayMs);
    } catch (error) {
      console.error("Error adding competition:", error);
    }
  };

  const fetchCompetitionById = async ({ competitionId, collectionName }) => {
    try {
      const competitionDoc = await getDoc(
        doc(db, collectionName, competitionId)
      );

      if (!competitionDoc.exists()) {
        console.log("No competition found with the given ID");
        return null;
      }

      const isTournament = collectionName === COLLECTION_NAMES.tournaments;
      const competitionIdField = isTournament ? "tournamentId" : "leagueId";

      const competitionData = {
        [competitionIdField]: competitionDoc.id,
        ...competitionDoc.data(),
      };

      const setCompetition = isTournament ? setTournamentById : setLeagueById;
      setCompetition(competitionData);

      return competitionData;
    } catch (error) {
      console.error("Error fetching competition:", error);
      return null;
    }
  };

  // Function to update a league
  const updateCompetition = async ({ competition, collectionName }) => {
    try {
      const competitionId =
        collectionName === "leagues"
          ? competition.leagueId
          : competition.tournamentId;
      const competitionDocRef = doc(db, collectionName, competitionId);

      // Update the competition document in Firebase
      await updateDoc(competitionDocRef, competition);
    } catch (error) {
      console.error("Error updating league:", error);
      Alert.alert("Error", "Unable to update the league.");
    }
  };

  const getCourts = async () => {
    const snapshot = await getDocs(collection(db, "courts"));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  const addCourt = async (courtData) => {
    try {
      const courtId = generateCourtId(courtData);
      await setDoc(doc(db, "courts", courtId), {
        ...courtData,
      });
      return courtId;
    } catch (error) {
      console.error("Error adding court: ", error);
      throw error; // Optional: Re-throw for error handling in components
    }
  };

  const updatePendingInvites = async (
    competitionId,
    userId,
    collectionName
  ) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const competitionSnap = await getDoc(competitionRef);

      if (competitionSnap.exists()) {
        const competitionData = competitionSnap.data();
        const pendingInvites = competitionData.pendingInvites || [];

        // Add user to pending invites if not already present
        await updateDoc(competitionRef, {
          pendingInvites: [...pendingInvites, { userId }],
        });

        return true;
      } else {
        console.log("League does not exist");
        return false;
      }
    } catch (error) {
      console.error("Error checking pending invites:", error);
      return false;
    }
  };

  const acceptCompetitionInvite = async ({
    userId,
    competitionId,
    notificationId,
    collectionName,
  }) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const competitionDoc = await getDoc(competitionRef);

      if (!competitionDoc.exists()) {
        console.error("Competition does not exist or has been deleted");
        const notificationsRef = collection(
          db,
          "users",
          userId,
          "notifications"
        );
        const notificationDocRef = doc(notificationsRef, notificationId);
        await updateDoc(notificationDocRef, {
          isRead: true,
        });
        return;
      }

      const competitionData = competitionDoc.data();
      const participantsKey =
        collectionName === "leagues"
          ? "leagueParticipants"
          : "tournamentParticipants";

      const competitionParticipants = competitionData[participantsKey] || [];
      const pendingInvites = competitionData.pendingInvites || [];

      // Add user to competition and remove from pending invites
      const updatedPending = pendingInvites.filter(
        (inv) => inv.userId !== userId
      );

      const newParticipant = await getUserById(userId);

      const newParticipantProfile = {
        ...scoreboardProfileSchema,
        username: newParticipant.username,
        firstName: newParticipant.firstName.split(" ")[0],
        lastName: newParticipant.lastName.split(" ")[0],
        userId: newParticipant.userId,
        memberSince: newParticipant.profileDetail?.memberSince || "",
        profileImage: newParticipant.profileImage || ccImageEndpoint,
      };

      await updateDoc(competitionRef, {
        [participantsKey]: [...competitionParticipants, newParticipantProfile],
        pendingInvites: updatedPending,
      });

      // Update user's notification
      const notificationsRef = collection(db, "users", userId, "notifications");
      const notificationDocRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.ACCEPT,
      });

      console.log("Competition invite accepted successfully!");
    } catch (error) {
      console.error("Error accepting competition invite:", error);
    }
  };

  const declineCompetitionInvite = async ({
    userId,
    competitionId,
    notificationId,
    collectionName,
  }) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const competitionDoc = await getDoc(competitionRef);

      if (!competitionDoc.exists()) {
        console.error("Competition does not exist or has been deleted");
        const notificationsRef = collection(
          db,
          "users",
          userId,
          "notifications"
        );
        const notificationDocRef = doc(notificationsRef, notificationId);
        await updateDoc(notificationDocRef, {
          isRead: true,
        });
        return;
      }

      const competitionData = competitionDoc.data();
      const pendingInvites = competitionData.pendingInvites || [];

      // Remove user from pending invites
      const updatedPending = pendingInvites.filter(
        (inv) => inv.userId !== userId
      );

      await updateDoc(competitionRef, {
        pendingInvites: updatedPending,
      });

      // Update user's notification
      const notificationsRef = collection(db, "users", userId, "notifications");
      const notificationDocRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.DECLINE,
      });

      console.log("Competition invite declined successfully!");
    } catch (error) {
      console.error("Error declining competition invite:", error);
    }
  };

  const requestToJoinLeague = async ({
    competitionId,
    currentUser,
    ownerId,
    collectionName,
  }) => {
    try {
      const collectionRef = doc(db, collectionName, competitionId);
      const competitionSnap = await getDoc(collectionRef);

      if (competitionSnap.exists()) {
        const competitionData = competitionSnap.data();
        const pendingRequests = competitionData.pendingRequests || [];

        // Add user to pending invites if not already present
        await updateDoc(collectionRef, {
          pendingRequests: [
            ...pendingRequests,
            { userId: currentUser?.userId },
          ],
        });

        const displayName = formatDisplayName(currentUser);
        const isLeague = collectionName === COLLECTION_NAMES.leagues;
        const paramKey = isLeague ? "leagueId" : "tournamentId";
        const competitionType = isLeague ? "league" : "tournament";
        const notificationType = isLeague
          ? notificationTypes.ACTION.JOIN_REQUEST.LEAGUE
          : notificationTypes.ACTION.JOIN_REQUEST.TOURNAMENT;

        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: ownerId,
          senderId: currentUser?.userId,
          message: `${displayName} has requested to join your ${competitionType}!`,
          type: notificationType,
          data: {
            [paramKey]: competitionId,
          },
        };

        await sendNotification(payload);

        return true;
      } else {
        console.log("Competition does not exist");
        return false;
      }
    } catch (error) {
      console.error("Error checking pending invites:", error);
      return false;
    }
  };

  const acceptCompetitionJoinRequest = async ({
    senderId,
    competitionId,
    notificationId,
    userId,
    collectionName,
  }) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const competitionDoc = await getDoc(competitionRef);
      const competitionData = competitionDoc.data();

      // Define the field name as a string
      const participantsKey =
        collectionName === "leagues"
          ? "leagueParticipants"
          : "tournamentParticipants";

      const competitionParticipants = competitionData[participantsKey] || [];
      const pendingRequests = competitionData.pendingRequests || [];

      const userAlreadyInCompetition = competitionParticipants.some(
        (participant) => participant.userId === senderId
      );

      if (userAlreadyInCompetition) {
        console.log("User is already a participant in this competition");
        return;
      }

      const updatedPending = pendingRequests.filter(
        (pen) => pen.userId !== senderId
      );

      const newParticipant = await getUserById(senderId);

      const newParticipantProfile = {
        ...scoreboardProfileSchema,
        username: newParticipant.username,
        firstName: newParticipant.firstName.split(" ")[0],
        lastName: newParticipant.lastName.split(" ")[0],
        userId: newParticipant.userId,
        memberSince: newParticipant.profileDetail?.memberSince || "",
        profileImage: newParticipant.profileImage || ccImageEndpoint,
      };

      await updateDoc(competitionRef, {
        [participantsKey]: [...competitionParticipants, newParticipantProfile],
        pendingRequests: updatedPending,
      });

      // Update notification
      const notificationsRef = collection(db, "users", userId, "notifications");
      const notificationDocRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.ACCEPT,
      });

      console.log("Competition join request accepted successfully!");
    } catch (error) {
      console.error("Error accepting competition join request:", error);
    }
  };

  const declineCompetitionJoinRequest = async ({
    senderId,
    competitionId,
    notificationId,
    userId,
    collectionName,
  }) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const competitionDoc = await getDoc(competitionRef);
      const competitionData = competitionDoc.data();

      // Remove senderId from pending requests
      const pendingRequests = competitionData.pendingRequests || [];

      const updatedPending = pendingRequests.filter(
        (pen) => pen.userId !== senderId
      );

      await updateDoc(competitionRef, {
        pendingRequests: updatedPending,
      });

      // Update competition owner's notification
      const notificationsRef = collection(db, "users", userId, "notifications");
      const notificationDocRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.DECLINE,
      });

      console.log("Competition join request declined successfully!");
    } catch (error) {
      console.error("Error declining competition join request:", error);
    }
  };

  const approveGame = async ({
    gameId,
    competitionId,
    userId,
    senderId,
    notificationId,
    notificationType,
  }) => {
    try {
      const config = getCompetitionConfig(notificationType);
      const isTournament = !config.isLeague; // ✅ Derive from isLeague

      const competitionRef = doc(db, config.collectionName, competitionId);
      const competitionSnap = await getDoc(competitionRef);

      if (!competitionSnap.exists()) {
        console.error("Competition not found");
        return;
      }

      const competitionData = competitionSnap.data();
      const {
        game,
        index: gameIndex,
        games,
      } = findGameInCompetition(competitionData, gameId, isTournament);

      if (!game || gameIndex === -1) {
        console.error("Game not found in competition");
        return;
      }

      const currentUserData = await getUserById(userId);
      if (!currentUserData) {
        console.error("User not found");
        return;
      }

      const approvalLimit = competitionData.approvalLimit || 1;
      const existingApprovers = game.approvers || [];

      // Check if already approved by this user
      if (existingApprovers.some((a) => a.userId === userId)) {
        console.error("User has already approved this game");
        return;
      }

      const updatedGame = {
        ...game,
        numberOfApprovals: (game.numberOfApprovals || 0) + 1,
        approvers: [
          ...existingApprovers,
          {
            userId: currentUserData.userId,
            username: currentUserData.username,
          },
        ],
      };

      const isFullyApproved = updatedGame.numberOfApprovals >= approvalLimit;

      if (isFullyApproved) {
        updatedGame.approvalStatus = notificationTypes.RESPONSE.APPROVED_GAME;

        const playerUserIds = getPlayerUserIds(updatedGame);

        const playersToUpdate = competitionData[config.participantsKey].filter(
          (player) => playerUserIds.includes(player.userId)
        );

        const usersToUpdate = await Promise.all(
          playersToUpdate.map((player) => getUserById(player.userId))
        );

        const playerPerformance = calculatePlayerPerformance(
          updatedGame,
          playersToUpdate,
          usersToUpdate
        );

        await updatePlayers({
          updatedPlayers: playerPerformance.playersToUpdate,
          competitionId,
          collectionName: config.collectionName,
        });

        await updateUsers(playerPerformance.usersToUpdate);

        if (competitionData[config.typeKey] === "Doubles") {
          const teams = await retrieveTeams(
            competitionId,
            config.collectionName
          );
          const teamsToUpdate = await calculateTeamPerformance({
            game: updatedGame,
            allTeams: teams,
          });
          await updateTeams({
            updatedTeams: teamsToUpdate,
            competitionId,
            collectionName: config.collectionName,
          });
        }
      }

      // Save updated game
      if (isTournament) {
        await updateTournamentGame({
          tournamentId: competitionId,
          gameId,
          gameResult: updatedGame,
        });

        if (isFullyApproved) {
          await updateDoc(competitionRef, {
            gamesCompleted: increment(1),
          });
        }
      } else {
        const updatedGames = [...games];
        updatedGames[gameIndex] = updatedGame;
        await updateDoc(competitionRef, { games: updatedGames });
      }

      await readNotification(
        notificationId,
        userId,
        notificationTypes.RESPONSE.ACCEPT
      );

      await sendNotification({
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: senderId,
        senderId: userId,
        message: `${currentUserData.username} has approved your game on ${
          competitionData[config.nameKey]
        }!`,
        type: notificationTypes.INFORMATION[
          isTournament ? "TOURNAMENT" : "LEAGUE"
        ].TYPE,
        data: {
          [config.paramKey]: competitionId,
          gameId,
        },
      });

      console.log("Game approved successfully!");
    } catch (error) {
      console.error("Error approving game:", error);
    }
  };

  const declineGame = async ({
    gameId,
    competitionId,
    userId,
    senderId,
    notificationId,
    notificationType,
  }) => {
    try {
      const config = getCompetitionConfig(notificationType);
      const isTournament = !config.isLeague;

      const competitionRef = doc(db, config.collectionName, competitionId);
      const competitionSnap = await getDoc(competitionRef);

      if (!competitionSnap.exists()) {
        console.error("Competition not found");
        return;
      }

      const competitionData = competitionSnap.data();
      const {
        game,
        index: gameIndex,
        games,
      } = findGameInCompetition(competitionData, gameId, isTournament);

      if (!game || gameIndex === -1) {
        console.error("Game not found in competition");
        return;
      }

      const currentUserData = await getUserById(userId);
      if (!currentUserData) {
        console.error("User not found");
        return;
      }

      const declineLimit = competitionData.declineLimit || 1;

      const updatedGame = {
        ...game,
        numberOfDeclines: (game.numberOfDeclines || 0) + 1,
      };

      const isFullyDeclined = updatedGame.numberOfDeclines >= declineLimit;
      const declinedGames = competitionData.declinedGames || [];
      let updatedGames = [...games];

      if (isFullyDeclined) {
        if (isTournament) {
          // Tournament: Reset game to original state (keep the fixture slot)
          const resetGame = {
            gameId: game.gameId,
            team1: {
              player1: game.team1.player1,
              player2: game.team1.player2 || null,
              score: null,
            },
            team2: {
              player1: game.team2.player1,
              player2: game.team2.player2 || null,
              score: null,
            },
            result: null,
            approvalStatus: "Scheduled",
            numberOfApprovals: 0,
            numberOfDeclines: 0,
            approvers: [],
            reporter: null,
            reportedAt: null,
            reportedTime: null,
            hasScores: false,
            gamescore: null,
            // Preserve fixture metadata
            court: game.court,
            gameNumber: game.gameNumber,
            createdAt: game.createdAt,
            createdTime: game.createdTime,
          };

          await updateTournamentGame({
            tournamentId: competitionId,
            gameId,
            gameResult: resetGame,
          });

          // Optionally track declined attempts separately
          declinedGames.push({
            ...updatedGame,
            approvalStatus: notificationTypes.RESPONSE.REJECTED_GAME,
            declinedBy: {
              userId: currentUserData.userId,
              username: currentUserData.username,
            },
            declinedAt: new Date(),
          });

          await updateDoc(competitionRef, { declinedGames });
        } else {
          // League: Remove the game completely (current behavior)
          const declinedGame = {
            ...updatedGame,
            approvalStatus: notificationTypes.RESPONSE.REJECTED_GAME,
            declinedBy: {
              userId: currentUserData.userId,
              username: currentUserData.username,
            },
          };

          declinedGames.push(declinedGame);
          updatedGames.splice(gameIndex, 1);

          await updateDoc(competitionRef, {
            games: updatedGames,
            declinedGames,
          });
        }
      } else {
        // Not fully declined yet - just update the decline count
        if (isTournament) {
          await updateTournamentGame({
            tournamentId: competitionId,
            gameId,
            gameResult: updatedGame,
          });
        } else {
          updatedGames[gameIndex] = updatedGame;
          await updateDoc(competitionRef, { games: updatedGames });
        }
      }

      await readNotification(
        notificationId,
        userId,
        notificationTypes.RESPONSE.DECLINE
      );

      await sendNotification({
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: senderId,
        senderId: userId,
        message: `${currentUserData.username} has declined your game on ${
          competitionData[config.nameKey]
        }!`,
        type: notificationTypes.INFORMATION[
          isTournament ? "TOURNAMENT" : "LEAGUE"
        ].TYPE,
        data: {
          [config.paramKey]: competitionId,
          gameId,
        },
      });

      console.log("Game declined successfully!");
    } catch (error) {
      console.error("Error declining game:", error);
    }
  };

  const sendChatMessage = async ({
    message,
    competitionId,
    competitionType = COMPETITION_TYPES.LEAGUE,
  }) => {
    const collectionRef =
      competitionType === COMPETITION_TYPES.TOURNAMENT
        ? "tournaments"
        : "leagues";
    try {
      const messageRef = doc(
        collection(db, collectionRef, competitionId, "chat")
      );
      const messageToSend = {
        _id: messageRef.id,
        text: message.text,
        createdAt: message.createdAt,
        user: {
          _id: message.user._id,
          name: message.user.name,
          avatar: message.user.avatar || ccDefaultImage,
        },
      };
      await setDoc(messageRef, messageToSend);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getPendingInviteUsers = async (competition) => {
    const pendingUserData = [];

    for (const invite of competition.pendingInvites || []) {
      const userDoc = await getDoc(doc(db, "users", invite.userId));
      if (userDoc.exists()) {
        pendingUserData.push(userDoc.data());
      }
    }

    return pendingUserData;
  };

  const removePendingInvite = async (competitionId, userId, collectionName) => {
    const competitionRef = doc(db, collectionName, competitionId);
    const competitionSnap = await getDoc(competitionRef);
    const competitionData = competitionSnap.data();

    const updatedPending = competitionData.pendingInvites.filter(
      (invite) => invite.userId !== userId
    );

    await updateDoc(competitionRef, { pendingInvites: updatedPending });
  };

  const assignLeagueAdmin = async (leagueId, user) => {
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);
    const leagueData = leagueSnap.data();

    const updatedAdmins = [
      ...(leagueData.leagueAdmins || []),
      {
        userId: user.userId,
        userName: user.username,
      },
    ];

    await updateDoc(leagueRef, { leagueAdmins: updatedAdmins });
  };

  const revokeLeagueAdmin = async (leagueId, userId) => {
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);
    const leagueData = leagueSnap.data();

    const updatedAdmins = (leagueData.leagueAdmins || []).filter(
      (admin) => admin.userId !== userId
    );

    await updateDoc(leagueRef, { leagueAdmins: updatedAdmins });
  };

  // REMOVE PLAYER FROM LEAGUE
  const removePlayerFromLeague = async (leagueId, userId, reason) => {
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);
    const leagueData = leagueSnap.data();

    const removedParticipants = leagueData.removedParticipants || [];
    const removedParticipant = leagueData.leagueParticipants.find(
      (participant) => participant.userId === userId
    );

    const updatedParticipants = (leagueData.leagueParticipants || []).filter(
      (participant) => participant.userId !== userId
    );

    // Add user to removed participants
    removedParticipants.push({
      profile: removedParticipant,
      removedAt: new Date(),
      reason,
    });

    // Remove user from leagueAdmins if they are an admin
    const updatedAdmins = (leagueData.leagueAdmins || []).filter(
      (admin) => admin.userId !== userId
    );

    await updateDoc(leagueRef, {
      leagueParticipants: updatedParticipants,
      leagueAdmins: updatedAdmins,
      removedParticipants,
    });

    // send notification to removed user
    const payload = {
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: userId,
      senderId: leagueData.leagueOwner.userId,
      message: `You have been removed from ${leagueData.leagueName} for the following reason: ${reason}`,
      type: notificationTypes.INFORMATION.LEAGUE.TYPE,
      data: {
        leagueId,
      },
    };
    await sendNotification(payload);
    console.log("Player removed from league successfully!");
  };

  const fetchUserPendingRequests = async (userId) => {
    try {
      const leaguesRef = collection(db, "leagues");
      const snapshot = await getDocs(leaguesRef);

      const result = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (league) =>
            Array.isArray(league.pendingRequests) &&
            league.pendingRequests.some((p) => p.userId === userId)
        );

      return result;
    } catch (err) {
      console.error("Failed to fetch pending requests", err);
      return [];
    }
  };

  // Withdraw user request from a league
  const withdrawJoinRequest = async (leagueId, userId) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueSnap = await getDoc(leagueRef);

      if (!leagueSnap.exists()) return;

      const leagueData = leagueSnap.data();
      const pendingRequests = leagueData.pendingRequests || [];

      const updatedPending = pendingRequests.filter(
        (req) => req.userId !== userId
      );

      await updateDoc(leagueRef, { pendingRequests: updatedPending });
    } catch (error) {
      console.error("Error withdrawing join request:", error);
    }
  };

  // Mocks
  const generateNewLeagueParticipants = async (number, leagueId) => {
    const newPlayers = Array.from({ length: number }, (_, i) => {
      const userId = generateUniqueUserId();
      const username = `player${i + 1}`;
      const memberSince = moment().format("MMM YYYY");

      return {
        username,
        userId,
        memberSince,
        ...JSON.parse(JSON.stringify(scoreboardProfileSchema)),
      };
    });

    try {
      // Add each player to 'users' collection
      for (const player of newPlayers) {
        const userDoc = {
          ...userProfileSchema,
          userId: player.userId,
          username: player.username,
          firstName: `First${player.username}`,
          lastName: `Last${player.username}`,
          email: `${player.username}@example.com`,
          profileDetail: {
            ...profileDetailSchema,
            lastActive: player.memberSince,
          },
        };

        await setDoc(doc(db, "users", player.userId), userDoc);
      }

      // Add newPlayers to league
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueSnap = await getDoc(leagueRef);

      if (!leagueSnap.exists()) {
        throw new Error("League does not exist!");
      }

      const existingParticipants = leagueSnap.data().leagueParticipants || [];

      await updateDoc(leagueRef, {
        leagueParticipants: [...existingParticipants, ...newPlayers],
      });

      console.log(
        `✅ Added ${number} players to league '${leagueId}' and users collection.`
      );
    } catch (err) {
      console.error("❌ Error writing to Firestore:", err);
    }
  };

  const addTournamentFixtures = async ({
    tournamentId,
    fixtures,
    numberOfCourts,
    currentUser,
    mode,
    generationType,
  }) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);

      const tournamentData = tournamentSnap.data();
      const tournamentParticipants =
        tournamentData.tournamentParticipants || [];
      const tournamentName = tournamentData.tournamentName;

      const numberOfGames = fixtures.reduce(
        (total, round) => total + round.games.length,
        0
      );

      await updateDoc(tournamentRef, {
        fixtures: fixtures, // The fixtures array from your generated data
        fixturesGenerated: true,
        fixturesGeneratedAt: new Date(),
        numberOfCourts,
        generationMode: mode,
        generationType: generationType,
        numberOfGames: numberOfGames,
        gamesCompleted: 0,
      });

      for (const participant of tournamentParticipants) {
        const userId = participant.userId;
        if (userId === currentUser.userId) continue;

        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: userId,
          senderId: tournamentData.tournamentOwner.userId,
          message: `Game fixtures generated for ${tournamentName}! Check out your upcoming matches.`,
          type: notificationTypes.INFORMATION.TOURNAMENT.TYPE,
          data: {
            tournamentId,
          },
        };
        await sendNotification(payload);
      }

      console.log("Fixtures successfully written to database");
      return { success: true };
    } catch (error) {
      console.error("Error writing fixtures to database:", error);
      throw error;
    }
  };

  const updateTournamentGame = async ({
    tournamentId,
    gameId,
    gameResult,
    removeGame = false,
  }) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);

      if (!tournamentDoc.exists()) {
        throw new Error("Tournament not found");
      }

      const tournamentData = tournamentDoc.data();
      const fixtures = tournamentData.fixtures || [];

      let updatedFixtures;

      if (removeGame) {
        // Remove the game from fixtures
        updatedFixtures = fixtures.map((round) => ({
          ...round,
          games: round.games.filter((game) => game.gameId !== gameId),
        }));
      } else {
        // Update the game with new result
        updatedFixtures = fixtures.map((round) => ({
          ...round,
          games: round.games.map((game) =>
            game.gameId === gameId ? gameResult : game
          ),
        }));
      }

      await updateDoc(tournamentRef, {
        fixtures: updatedFixtures,
        lastUpdated: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating tournament game:", error);
      throw error;
    }
  };

  const fetchTournamentParticipants = async (tournamentId) => {
    try {
      const tournamentDoc = await getDoc(doc(db, "tournaments", tournamentId));

      if (!tournamentDoc.exists()) {
        console.log("No tournament found with the given ID");
        return [];
      }

      const tournamentData = tournamentDoc.data();
      return tournamentData.tournamentParticipants || [];
    } catch (error) {
      console.error("Error fetching tournament participants:", error);
      return [];
    }
  };

  return (
    <LeagueContext.Provider
      value={{
        // Playtime Management
        addPlaytime,
        deletePlaytime,

        // League Data Management
        addCompetition,
        updateCompetition, // Exposing the updateCompetition function
        fetchLeagues,
        fetchUpcomingLeagues,
        fetchCompetitionById,
        getCourts,
        addCourt,
        updatePendingInvites,
        getPendingInviteUsers,
        removePendingInvite,
        assignLeagueAdmin,
        revokeLeagueAdmin,
        fetchUserPendingRequests,
        withdrawJoinRequest,
        sendChatMessage,

        // Tournament State Management
        tournamentNavigationId,
        setTournamentNavigationId,
        upcomingTournaments,
        setUpcomingTournaments,
        fetchUpcomingTournaments,
        tournamentById,
        setTournamentById,

        // Tournament Data Management
        addTournamentFixtures,
        updateTournamentGame,
        fetchTournamentParticipants,

        // League State Management
        upcomingLeagues,
        leagueById,
        leagueNavigationId,
        setLeagueNavigationId,
        removePlayerFromLeague,
        acceptCompetitionInvite,
        declineCompetitionInvite,
        requestToJoinLeague,
        acceptCompetitionJoinRequest,
        declineCompetitionJoinRequest,
        approveGame,
        declineGame,

        // Mock Data Management
        setShowMockData,
        showMockData,
        generateNewLeagueParticipants,

        // League Description Management
        handleLeagueDescription,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export { LeagueContext, LeagueProvider };
