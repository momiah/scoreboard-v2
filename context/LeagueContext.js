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
} from "firebase/firestore";
import moment from "moment";

// import { generatedLeagues } from "../components/Leagues/leagueMocks";
import { ccDefaultImage } from "../mockImages";
import { db } from "../services/firebase.config";

import { generateLeagueId } from "../helpers/generateLeagueId";
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
import { locationSchema } from "../schemas/schema";
import { notificationSchema } from "../schemas/schema";
import { calculatePlayerPerformance } from "../helpers/calculatePlayerPerformance";
import { calculateTeamPerformance } from "../helpers/calculateTeamPerformance";
import { formatDisplayName } from "../helpers/formatDisplayName";

const LeagueContext = createContext();

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
  } = useContext(UserContext);
  const [showMockData, setShowMockData] = useState(false);
  const [leagueNavigationId, setLeagueNavigationId] = useState("");
  const [tournamentNavigationId, setTournamentNavigationId] = useState("");
  const [leagueById, setLeagueById] = useState(null);

  useEffect(() => {
    fetchUpcomingLeagues();
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

  const addPlaytime = async (playtime, existingPlaytime = null) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueById.id);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);

      if (leagueDoc.exists()) {
        const currentPlaytime = leagueDoc.data().playingTime || [];
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

        // Update the league document with updated playtime array
        await updateDoc(leagueDocRef, { playingTime: updatedPlaytime });
      } else {
        console.error("League document not found.");
        Alert.alert("Error", "League not found.");
      }
    } catch (error) {
      console.error("Error saving playtime:", error);
      Alert.alert("Error", "Error saving playtime data");
    }
  };

  const deletePlaytime = async (playtimeToDelete) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueById.id);

      const leagueDoc = await getDoc(leagueDocRef);

      if (leagueDoc.exists()) {
        const currentPlaytime = leagueDoc.data().playingTime || [];

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
        await updateDoc(leagueDocRef, { playingTime: updatedPlaytime });
      } else {
        console.error("League document not found.");
        Alert.alert("Error", "League not found.");
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

  const fetchLeagueById = async (leagueId) => {
    try {
      const leagueDoc = await getDoc(doc(db, "leagues", leagueId));

      if (leagueDoc.exists()) {
        const leagueData = {
          leagueId: leagueDoc.id,
          ...leagueDoc.data(),
        };

        setLeagueById(leagueData);
        return leagueData;
      } else {
        console.log("No league found with the given ID");
      }
    } catch (error) {
      console.error("Error fetching league:", error);
    }
  };

  // Function to update a league
  const updateLeague = async (updatedLeague) => {
    try {
      const leagueDocRef = doc(db, "leagues", updatedLeague.id);

      // Update the league document in Firebase
      await updateDoc(leagueDocRef, updatedLeague);

      // Update the state in the context
      setUpcomingLeagues((prevLeagues) =>
        prevLeagues.map((league) =>
          league.id === updatedLeague.id ? updatedLeague : league
        )
      );
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

  const updatePendingInvites = async (leagueId, userId) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueSnap = await getDoc(leagueRef);

      if (leagueSnap.exists()) {
        const leagueData = leagueSnap.data();
        const pendingInvites = leagueData.pendingInvites || [];

        // Add user to pending invites if not already present
        await updateDoc(leagueRef, {
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

  const acceptLeagueInvite = async (userId, leagueId, notificationId) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueDoc = await getDoc(leagueRef);
      const leagueData = leagueDoc.data();
      const leagueParticipants = leagueData.leagueParticipants || [];
      const pendingInvites = leagueData.pendingInvites || [];

      // Add user to league and remove from pending invites
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

      await updateDoc(leagueRef, {
        leagueParticipants: [...leagueParticipants, newParticipantProfile],
        pendingInvites: updatedPending,
      });

      //Update users notification
      const notificationsRef = collection(db, "users", userId, "notifications");

      const notificationDocRef = doc(notificationsRef, notificationId);

      if (!leagueDoc.exists()) {
        console.error("League does not exist or has been deleted");
        await updateDoc(notificationDocRef, {
          isRead: true,
        });
        return;
      }

      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.ACCEPT,
      });

      // return if league doesnt exist

      console.log("League invite accepted successfully!");
    } catch (error) {
      console.error("Error accepting league invite:", error);
    }
  };

  const declineLeagueInvite = async (userId, leagueId, notificationId) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueDoc = await getDoc(leagueRef);
      const leagueData = leagueDoc.data();

      const pendingInvites = leagueData.pendingInvites || [];

      // Remove user from pending invites
      const updatedPending = pendingInvites.filter(
        (inv) => inv.userId !== userId
      );

      await updateDoc(leagueRef, {
        pendingInvites: updatedPending,
      });

      //Update users notification
      const notificationsRef = collection(db, "users", userId, "notifications");

      const notificationDocRef = doc(notificationsRef, notificationId);

      if (!leagueDoc.exists()) {
        console.error("League does not exist or has been deleted");
        await updateDoc(notificationDocRef, {
          isRead: true,
        });
        return;
      }

      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.DECLINE,
      });

      console.log("League invite declined successfully!");
    } catch (error) {
      console.error("Error accepting league invite:", error);
    }
  };

  const requestToJoinLeague = async (leagueId, userId, ownerId, username) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueSnap = await getDoc(leagueRef);

      if (leagueSnap.exists()) {
        const leagueData = leagueSnap.data();
        const pendingRequests = leagueData.pendingRequests || [];

        // Add user to pending invites if not already present
        await updateDoc(leagueRef, {
          pendingRequests: [...pendingRequests, { userId }],
        });

        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: ownerId,
          senderId: userId,
          message: `${username} has requested to join your league!`,
          type: notificationTypes.ACTION.JOIN_REQUEST.LEAGUE,

          data: {
            leagueId,
          },
        };

        await sendNotification(payload);

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

  const acceptLeagueJoinRequest = async (
    senderId,
    leagueId,
    notificationId,
    userId
  ) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueDoc = await getDoc(leagueRef);
      const leagueData = leagueDoc.data();
      const leagueParticipants = leagueData.leagueParticipants || [];
      const pendingRequests = leagueData.pendingRequests || [];

      const userAlreadyInLeague = leagueParticipants.filter(
        (participant) => participant.userId === senderId
      );

      if (userAlreadyInLeague.length > 0) {
        console.log("User is already a participant in this league");
        return;
      }

      // Add senderId to league and remove from pending requests
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
        profileImage: newParticipant.profilImage || ccImageEndpoint,
      };

      await updateDoc(leagueRef, {
        leagueParticipants: [...leagueParticipants, newParticipantProfile],
        pendingRequests: updatedPending,
      });

      // Update league owners notification
      const notificationsRef = collection(db, "users", userId, "notifications");

      const notificationDocRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.ACCEPT,
      });

      console.log("League join request accepted successfully!");
    } catch (error) {
      console.error("Error accepting league join request:", error);
    }
  };

  const declineLeagueJoinRequest = async (
    senderId,
    leagueId,
    notificationId,
    userId
  ) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueDoc = await getDoc(leagueRef);
      const leagueData = leagueDoc.data();

      // Remove senderId from pending requests
      const pendingRequests = leagueData.pendingRequests || [];

      const updatedPending = pendingRequests.filter(
        (pen) => pen.userId !== senderId
      );

      await updateDoc(leagueRef, {
        pendingRequests: updatedPending,
      });

      // Update league owners notification
      const notificationsRef = collection(db, "users", userId, "notifications");

      const notificationDocRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.DECLINE,
      });

      console.log("League join request declined successfully!");
    } catch (error) {
      console.error("Error accepting league join request:", error);
    }
  };

  const approveGame = async (
    gameId,
    leagueId,
    userId,
    senderId,
    notificationId
  ) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueDoc = await getDoc(leagueRef);
      const leagueData = leagueDoc.data();
      const leagueParticipants = leagueData.leagueParticipants;
      const leagueType = leagueData.leagueType;

      const games = leagueData.games || [];
      const gameIndex = games.findIndex((game) => game.gameId === gameId);

      if (gameIndex === -1) {
        console.error("Game not found in league");
        return;
      }

      const game = games[gameIndex];
      const approvalLimit = leagueData.approvalLimit || 1;

      // Retrieve currentUser username
      const currentUser = await getUserById(userId);
      const currentUserUsername = currentUser?.username;
      const approvers = game.approvers || [];

      // ✅ Update approvals correctly
      const updatedGame = {
        ...game,
        numberOfApprovals: (game.numberOfApprovals || 0) + 1,
        approvers: [
          ...approvers,
          {
            userId: currentUser?.userId,
            username: currentUserUsername,
          },
        ],
      };

      // ✅ Check approval limit
      if (updatedGame.numberOfApprovals >= approvalLimit) {
        updatedGame.approvalStatus = notificationTypes.RESPONSE.APPROVE_GAME;

        const playersToUpdate = leagueParticipants.filter((player) =>
          game.result.winner.players
            .concat(game.result.loser.players)
            .includes(formatDisplayName(player))
        );

        const userIds = playersToUpdate.map((player) => player.userId);

        const usersToUpdate = await Promise.all(userIds.map(getUserById));

        const playerPerformance = calculatePlayerPerformance(
          updatedGame,
          playersToUpdate,
          usersToUpdate
        );

        await updatePlayers(playerPerformance.playersToUpdate, leagueId);
        await updateUsers(playerPerformance.usersToUpdate);

        if (leagueType === "Doubles") {
          const teamsToUpdate = await calculateTeamPerformance(
            updatedGame,
            retrieveTeams,
            leagueId
          );

          await updateTeams(teamsToUpdate, leagueId);
        }
      }

      // Replace the game in the array
      const updatedGames = [...games];
      updatedGames[gameIndex] = updatedGame;

      // Save back to Firestore
      await updateDoc(leagueRef, {
        games: updatedGames,
      });

      // Update league owners notification
      const currentUserNotificationsRef = collection(
        db,
        "users",
        userId,
        "notifications"
      );

      const notificationDocRef = doc(
        currentUserNotificationsRef,
        notificationId
      );
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.ACCEPT,
      });

      // ✅ Send notification to sender
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: senderId,
        senderId: userId,
        message: `${currentUserUsername} has approved your game on ${leagueData.leagueName}!`,
        type: notificationTypes.INFORMATION.LEAGUE.TYPE,
        data: {
          leagueId,
          gameId,
        },
      };
      await sendNotification(payload);

      console.log("Game approved successfully!");
    } catch (error) {
      console.error("Error approving game:", error);
    }
  };

  const sendChatMessage = async (message, leagueId) => {
    try {
      const messageRef = doc(collection(db, "leagues", leagueId, "chat"));
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

  const declineGame = async (
    gameId,
    leagueId,
    userId,
    senderId,
    notificationId
  ) => {
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueDoc = await getDoc(leagueRef);
      const leagueData = leagueDoc.data();

      const games = leagueData.games || [];
      const gameIndex = games.findIndex((game) => game.gameId === gameId);

      if (gameIndex === -1) {
        console.error("Game not found in league");
        return;
      }

      const game = games[gameIndex];
      const declineLimit = 1;

      const currentUser = await getUserById(userId);
      const currentUserUsername = currentUser?.username;

      const updatedGame = {
        ...game,
        numberOfDeclines: (game.numberOfDeclines || 0) + 1,
      };

      const declinedGame = {
        ...updatedGame,
        approvalStatus: notificationTypes.RESPONSE.DECLINE,
        declinedBy: {
          userId: currentUser?.userId,
          username: currentUserUsername,
        },
      };

      const declinedGames = leagueData.declinedGames || [];

      let updatedGames = [...games];

      if (updatedGame.numberOfDeclines >= declineLimit) {
        declinedGames.push(declinedGame);
        updatedGames.splice(gameIndex, 1);
      } else {
        updatedGames[gameIndex] = updatedGame;
      }

      await updateDoc(leagueRef, {
        games: updatedGames,
        declinedGames: declinedGames,
      });

      const notificationDocRef = doc(
        collection(db, "users", userId, "notifications"),
        notificationId
      );
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.DECLINE,
      });

      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: senderId,
        senderId: userId,
        message: `${currentUserUsername} has declined your game on ${leagueData.leagueName}!`,
        type: notificationTypes.INFORMATION.LEAGUE.TYPE,
        data: {
          leagueId,
          gameId,
        },
      };

      await sendNotification(payload);

      console.log("Game declined and removed successfully!");
    } catch (error) {
      console.error("Error declining game:", error);
    }
  };

  const getPendingInviteUsers = async (league) => {
    const pendingUserData = [];

    for (const invite of league.pendingInvites || []) {
      const userDoc = await getDoc(doc(db, "users", invite.userId));
      if (userDoc.exists()) {
        pendingUserData.push(userDoc.data());
      }
    }

    return pendingUserData;
  };

  const removePendingInvite = async (leagueId, userId) => {
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueSnap = await getDoc(leagueRef);
    const leagueData = leagueSnap.data();

    const updatedPending = leagueData.pendingInvites.filter(
      (invite) => invite.userId !== userId
    );

    await updateDoc(leagueRef, { pendingInvites: updatedPending });
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

  return (
    <LeagueContext.Provider
      value={{
        // Playtime Management
        addPlaytime,
        deletePlaytime,

        // League Data Management
        addCompetition,
        updateLeague, // Exposing the updateLeague function
        fetchLeagues,
        fetchUpcomingLeagues,
        fetchLeagueById,
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

        // League State Management
        upcomingLeagues,
        leagueById,
        leagueNavigationId,
        setLeagueNavigationId,
        removePlayerFromLeague,
        acceptLeagueInvite,
        declineLeagueInvite,
        requestToJoinLeague,
        acceptLeagueJoinRequest,
        declineLeagueJoinRequest,
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
