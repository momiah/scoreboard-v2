import React, { createContext, useState, useEffect, useContext } from "react";

import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../services/firebase.config";
import { deleteUser } from "firebase/auth";

import { PopupContext } from "./PopupContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  profileDetailSchema,
  scoreboardProfileSchema,
  notificationSchema,
  notificationTypes,
} from "../schemas/schema";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const { showPopup, popupMessage, handleShowPopup } = useContext(PopupContext);
  const [players, setPlayers] = useState([]);

  const [currentUser, setCurrentUser] = useState(null); // Optional: Track logged-in user
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Optional: Track logging out state

  const [notifications, setNotifications] = useState([]); // Optional: Track notifications
  const [chatSummaries, setChatSummaries] = useState([]);

  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const loadInitialUser = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          const userData = await getUserById(userId);
          setCurrentUser(userData);

          // Register for push notifications
          await registerForPushNotificationsAsync(userId);
        }
      } catch (error) {
        console.error("Initial user load failed:", error);
      } finally {
        setInitializing(false);
      }
    };

    loadInitialUser();
  }, []);

  useEffect(() => {
    let unsubscribe;
    let isMounted = true;

    const setupChatSummaryListener = async () => {
      const userUid = currentUser?.userId;
      if (!userUid) return;

      const chatsRef = collection(db, "users", userUid, "chats");

      unsubscribe = onSnapshot(chatsRef, (snapshot) => {
        // 🛡️ Protect against null currentUser and unmounted component
        if (!isMounted || !currentUser?.userId) return;

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Optional: sort by createdAt descending
        data.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );

        setChatSummaries(data);
      });
    };

    setupChatSummaryListener();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.userId]);

  useEffect(() => {
    let unsubscribe;

    const setupListener = async () => {
      try {
        // const userId = await AsyncStorage.getItem("userId");
        const userUid = currentUser?.userId;

        if (!currentUser) {
          return;
        }

        // Create a reference to the user's notifications collection
        const notificationsRef = collection(
          db,
          "users",
          userUid,
          "notifications"
        );

        // Set up the snapshot listener
        unsubscribe = onSnapshot(
          notificationsRef,
          (snapshot) => {
            const notificationsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            // Sort by createdAt timestamp (newest first)
            notificationsData.sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
            );

            setNotifications(notificationsData);
          },
          (error) => {
            console.error("Error in notifications listener:", error);
          }
        );
      } catch (error) {
        console.error("Failed to set up notifications listener:", error);
      }
    };

    setupListener();

    // Clean up the listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.userId]);

  const Logout = async () => {
    try {
      setIsLoggingOut(true); // Set logging out state
      await AsyncStorage.removeItem("userId");

      await AsyncStorage.clear();
      setCurrentUser(null); // Clear current user state
      setNotifications([]); // Clear notifications state

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
      // handleShowPopup("Successfully logged out!");
      setIsLoggingOut(false); // Set logging out state to false

      return true;
    } catch (error) {
      console.error("Error during logout:", error);
      return false;
    }
  };

  const retrievePlayersFromLeague = async (leagueId) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueId);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);
      const leagueParticipants = leagueDoc.data().leagueParticipants;

      return leagueParticipants;
    } catch (error) {
      console.error("Error retrieving players:", error);
      return [];
    }
  };
  const retrieveTeams = async (leagueId) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueId);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);
      const leagueTeams = leagueDoc.data().leagueTeams;

      return leagueTeams;
    } catch (error) {
      console.error("Error retrieving teams:", error);
      return [];
    }
  };

  async function checkUserRole(leagueData) {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return "hide";

      if (
        !leagueData ||
        !leagueData.leagueOwner ||
        !leagueData.leagueAdmins ||
        !leagueData.leagueParticipants ||
        !leagueData.pendingInvites ||
        !leagueData.pendingRequests
      ) {
        console.error("Invalid league data:", leagueData);
        return "hide";
      }

      // 1) League owner
      if (leagueData.leagueOwner === userId) {
        return "owner";
      }
      // 2) Admin
      if (leagueData.leagueAdmins.some((a) => a.userId === userId)) {
        return "admin";
      }
      // 3) Participant
      if (leagueData.leagueParticipants.some((p) => p.userId === userId)) {
        return "participant";
      }
      // 4) Pending invite (you’ve been invited)
      if (leagueData.pendingInvites.some((inv) => inv.userId === userId)) {
        return "invitationPending";
      }
      // 5) Pending request (you’ve asked to join)
      if (leagueData.pendingRequests.some((req) => req.userId === userId)) {
        return "requestPending";
      }
      // 6) Default
      return "user";
    } catch (error) {
      console.error("Error checking user role:", error);
      return "hide";
    }
  }

  const fetchPlayers = async (leagueId) => {
    try {
      const players = await retrievePlayersFromLeague(leagueId);
      setPlayers(players); // Set the retrieved players in the state
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const [loading, setLoading] = useState(true); // Track loading state

  const getAllUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const users = querySnapshot.docs.map((doc) => ({
        // id: doc.id,
        ...doc.data(),
      }));
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  const updateUsers = async (usersToUpdate) => {
    try {
      const updatePromises = usersToUpdate.map(async (user) => {
        const userRef = doc(db, "users", user.userId);

        await updateDoc(userRef, {
          profileDetail: user.profileDetail,
        });
      });

      await Promise.all(updatePromises);
      // console.log("All users updated successfully.");
    } catch (error) {
      console.error("Error updating users:", error);
    }
  };

  const updatePlayers = async (updatedPlayers, leagueId) => {
    if (updatedPlayers.length === 0) {
      handleShowPopup("No players to update!");
      return;
    }

    try {
      const leagueDocRef = doc(db, "leagues", leagueId); // Reference to the league document

      // Fetch the current league document
      const leagueDoc = await getDoc(leagueDocRef);

      if (!leagueDoc.exists()) {
        handleShowPopup("League not found!");
        return;
      }

      const leagueData = leagueDoc.data();
      const existingPlayers = leagueData.leagueParticipants || [];

      // Update the existing players array with updated data
      const updatedParticipants = existingPlayers.map((player) => {
        const updatedPlayer = updatedPlayers.find(
          (p) => p.username === player.username
        );
        return updatedPlayer ? { ...player, ...updatedPlayer } : player;
      });

      // Update the leagueParticipants field in Firestore
      await updateDoc(leagueDocRef, {
        leagueParticipants: updatedParticipants,
      });

      // Optionally fetch the updated players to refresh the UI
      await fetchPlayers(leagueId);
      // handleShowPopup("Players updated successfully!");
    } catch (error) {
      console.error("Error updating player data:", error);
      handleShowPopup("Error updating player data");
    }
  };

  const updateTeams = async (updatedTeams, leagueId) => {
    if (updatedTeams.length === 0) {
      console.error("No teams to update!");
      return;
    }

    try {
      const leagueDocRef = doc(db, "leagues", leagueId);

      // Fetch the current league document
      const leagueDoc = await getDoc(leagueDocRef);
      if (!leagueDoc.exists()) {
        console.error("League not found!");
        return;
      }

      const leagueData = leagueDoc.data();
      const existingTeams = leagueData.leagueTeams || [];

      // Merge the updated teams into the existing ones
      const updatedTeamsArray = existingTeams.map((team) => {
        const updatedTeam = updatedTeams.find(
          (t) => t.teamKey === team.teamKey
        );
        return updatedTeam ? { ...team, ...updatedTeam } : team;
      });

      // Add any new teams that weren't already in existingTeams
      const newTeams = updatedTeams.filter(
        (updatedTeam) =>
          !existingTeams.some((team) => team.teamKey === updatedTeam.teamKey)
      );

      // Final teams list to update in Firestore
      const finalTeamsArray = [...updatedTeamsArray, ...newTeams];

      await updateDoc(leagueDocRef, { leagueTeams: finalTeamsArray });
    } catch (error) {
      console.error("Error updating team data:", error);
    }
  };

  const getUserById = async (userId) => {
    try {
      if (!userId) {
        return null;
      }

      // Reference the document in the 'users' collection by ID
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data(); // Include the document ID
      } else {
        console.error("No user found with the given ID.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  };

  const resetAllPlayerStats = async () => {
    try {
      const allPlayers = await retrievePlayersFromLeague();
      const allPlayersIds = allPlayers.map((player) => player.username);

      for (const playerId of allPlayersIds) {
        const scoreboardCollectionRef = collection(db, "scoreboard");
        const playersCollectionRef = collection(
          scoreboardCollectionRef,
          "players",
          "players"
        );

        const playerDocRef = doc(playersCollectionRef, playerId);
        await updateDoc(playerDocRef, profileDetailSchema);
      }

      handleShowPopup("All player stats reset successfully!");
      await fetchPlayers();
    } catch (error) {
      console.error("Error resetting player stats:", error);
      handleShowPopup("Error resetting player stats");
    }
  };

  const resetPlayerStats = async () => {
    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");
      const playersCollectionRef = collection(
        scoreboardCollectionRef,
        "players",
        "players"
      );

      // Use the player name (or ID) as the document ID
      const playerDocRef = doc(playersCollectionRef, "Abdul");
      await setDoc(playerDocRef, profileDetailSchema); // Write the data directly
      handleShowPopup("Player reset successfully!");
    } catch (error) {
      console.error("Error updating player data:", error);
      handleShowPopup("Error updating player data");
    }
  };

  const updatePlacementStats = async (userId, prizeXP, placement) => {
    try {
      // Fetch the user's document
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error(`User with ID ${userId} not found.`);
        return;
      }

      const userData = userDoc.data();

      // Ensure profileDetail exists
      const profileDetail = userData.profileDetail || {};

      // Update XP inside profileDetail
      const updatedXP = (profileDetail.XP || 0) + prizeXP;

      // Update leagueStats inside profileDetail
      const updatedLeagueStats = {
        first: profileDetail.leagueStats?.first || 0,
        second: profileDetail.leagueStats?.second || 0,
        third: profileDetail.leagueStats?.third || 0,
        fourth: profileDetail.leagueStats?.fourth || 0,
      };

      // Increment the corresponding placement stat
      if (placement === "1st") updatedLeagueStats.first += 1;
      if (placement === "2nd") updatedLeagueStats.second += 1;
      if (placement === "3rd") updatedLeagueStats.third += 1;
      if (placement === "4th") updatedLeagueStats.fourth += 1;

      // Update the user's document in Firebase
      await updateDoc(userDocRef, {
        profileDetail: {
          ...profileDetail,
          XP: updatedXP, // Update XP
          leagueStats: updatedLeagueStats, // Update leagueStats
        },
      });

      // console.log(
      //   `User ${userId} updated in profileDetail: +${prizeXP} XP, Incremented ${placement} place`
      // );
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    }
  };

  const rankSorting = (users) => {
    // Create a copy to avoid mutating original array
    return [...users].sort((a, b) => {
      // Add null safety checks
      const aDetail = a.profileDetail || {};
      const bDetail = b.profileDetail || {};

      if (bDetail.XP !== aDetail.XP) return bDetail.XP - aDetail.XP;
      if (bDetail.numberOfWins !== aDetail.numberOfWins)
        return bDetail.numberOfWins - aDetail.numberOfWins;
      if (bDetail.winPercentage !== aDetail.winPercentage)
        return bDetail.winPercentage - aDetail.winPercentage;
      if (bDetail.totalPointDifference !== aDetail.totalPointDifference)
        return bDetail.totalPointDifference - aDetail.totalPointDifference;

      // Fallback to username comparison
      return (a.username || "").localeCompare(b.username || "");
    });
  };

  const getGlobalRank = async (userId) => {
    try {
      // 1. Get all users using existing fetch logic
      const allUsers = await getAllUsers();

      // 2. Use the EXACT SAME sorting as AllPlayers
      const sorted = rankSorting(allUsers);

      // 3. Find index of the target user
      const userIndex = sorted.findIndex((user) => user.userId === userId);

      // 4. Return rank (index + 1)
      return userIndex >= 0 ? userIndex + 1 : null;
    } catch (error) {
      console.error("Rank check failed:", error);
      return null;
    }
  };

  const getCountryRank = async (userId, countryCode) => {
    try {
      // 1. Get all users using existing fetch logic
      const allUsers = await getAllUsers();

      // Filter users by country code
      const filteredUsers = allUsers.filter(
        (user) => user.location?.countryCode === countryCode
      );

      // 2. Use the EXACT SAME sorting as AllPlayers
      const sorted = rankSorting(filteredUsers);

      // 3. Find index of the target user
      const userIndex = sorted.findIndex((user) => user.userId === userId);

      // 4. Return rank (index + 1)
      return userIndex >= 0 ? userIndex + 1 : null;
    } catch (error) {
      console.error("Rank check failed:", error);
      return null;
    }
  };

  const getLeaguesForUser = async (userId) => {
    try {
      // Get all leagues from the "leagues" collection
      const leaguesRef = collection(db, "leagues");
      const querySnapshot = await getDocs(leaguesRef);

      // Filter the leagues where the user is a participant
      const userLeagues = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((league) => {
          // Check if leagueParticipants exists and is an array
          if (
            !league.leagueParticipants ||
            !Array.isArray(league.leagueParticipants)
          ) {
            return false;
          }
          // Return true if at least one participant has a matching userId
          return league.leagueParticipants.some(
            (participant) => participant.userId === userId
          );
        });

      return userLeagues;
    } catch (error) {
      console.error("Error fetching leagues for user:", error);
      return [];
    }
  };

  const updateUserProfile = async (updatedFields) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User not authenticated");

      console.log("Updating Fields:", updatedFields); // Debug log

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, updatedFields); // Surgical update

      setCurrentUser((prev) => ({
        ...prev,
        ...updatedFields,
      }));
      return true; // Keep for success confirmation
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  };

  const profileViewCount = async (profileUserId) => {
    try {
      const viewerId = await AsyncStorage.getItem("userId");

      // Don't count if user is viewing their own profile
      if (viewerId === profileUserId) return;

      const userRef = doc(db, "users", profileUserId);

      const userDoc = await getDoc(userRef);
      const currentViews = userDoc.data().profileViews || 0;

      await updateDoc(userRef, {
        profileViews: currentViews + 1,
      });
    } catch (error) {
      console.error("Error updating profile view count:", error);
    }
  };

  const readChat = async (leagueId, userId) => {
    try {
      const chatRef = doc(db, "users", userId, "chats", leagueId);
      await updateDoc(chatRef, {
        isRead: true,
        messageCount: 0,
      });
    } catch (error) {
      console.error("Failed to mark chat as read:", error);
    }
  };

  const readNotification = async (notificationId, userId) => {
    try {
      // const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User not authenticated");
      const userRef = doc(db, "users", userId);
      const notifRef = doc(userRef, "notifications", notificationId);
      await updateDoc(notifRef, {
        isRead: true,
      });
      console.log("Notification marked as read:", notificationId);
    } catch (error) {
      console.error(
        "Error marking notification as read:",
        error,
        notificationId,
        userId
      );
    }
  };

  const sendNotification = async (notification) => {
    console.log("Sending Notification:", JSON.stringify(notification, null, 2));
    try {
      const recipientId = notification.recipientId;

      // 🔥 Get the subcollection reference under the user
      const notifRef = collection(db, "users", recipientId, "notifications");

      // ➕ Add the notification as a new document
      await addDoc(notifRef, notification);

      // Lookup push tokens
      const recipientDoc = await getDoc(doc(db, "users", recipientId));
      const pushTokens = recipientDoc.data()?.pushTokens || [];

      //send device notification
      if (pushTokens.length > 0) {
        const messages = pushTokens.map((token) => ({
          to: token,
          sound: 'default',
          title: `New Notification in Court Champs - ${notification.type.toUpperCase()}`,
          body: notification.message,
          data: {
            ...notification.data,
            type: notification.type,
          }
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
        console.log(`Push sent to ${pushTokens.length} devices`);
    }

      console.log("✅ Notification saved to subcollection!");
    } catch (error) {
      console.error("❌ Failed to send notification:", error);
    }
  };


  const sendSupportRequest = async ({ subject, message, currentUser }) => {
    if (!currentUser) throw new Error("No user authenticated");

    const supportData = {
      userId: currentUser?.userId,
      username: currentUser?.username,
      email: currentUser?.email,
      subject,
      message,
      createdAt: new Date(),
    };

    await addDoc(collection(db, "account-support"), supportData);
  };

  const sendFeedback = async ({ subject, message, currentUser }) => {
    if (!currentUser) throw new Error("User not authenticated");

    const feedbackData = {
      userId: currentUser?.userId,
      username: currentUser?.username,
      email: currentUser?.email,
      subject,
      message,
      createdAt: new Date(),
    };

    await addDoc(collection(db, "feedback"), feedbackData);
  };

  const deleteAccount = async () => {
    try {
      setIsLoggingOut(true);

      if (!currentUser?.userId) {
        throw new Error("User not authenticated");
      }

      const userId = currentUser.userId;

      // Check if Firebase Auth user exists
      let user = auth.currentUser;
      if (!user) {
        throw new Error(
          "Session expired. Please log out and log back in, then try deleting your account again."
        );
      }

      // Verify auth user matches current user
      if (user.uid !== userId) {
        await Logout();
        throw new Error(
          "Authentication mismatch. Please log in again to delete your account."
        );
      }

      // Delete notifications subcollection
      try {
        const notificationsRef = collection(
          db,
          "users",
          userId,
          "notifications"
        );
        const notificationsSnapshot = await getDocs(notificationsRef);
        const notificationDeletes = notificationsSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref)
        );
        await Promise.all(notificationDeletes);
      } catch (error) {
        console.log("Error deleting notifications:", error);
      }

      // Delete chats subcollection
      try {
        const chatsRef = collection(db, "users", userId, "chats");
        const chatsSnapshot = await getDocs(chatsRef);
        const chatDeletes = chatsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(chatDeletes);
      } catch (error) {
        console.log("Error deleting chats:", error);
      }

      // Delete the main user document
      const userDocRef = doc(db, "users", userId);
      await deleteDoc(userDocRef);

      // Delete Firebase Authentication account
      await deleteUser(user);

      // Clear local storage and state
      await AsyncStorage.clear();
      setCurrentUser(null);
      setNotifications([]);
      setChatSummaries([]);

      return true;
    } catch (error) {
      console.error("Error deleting account:", error);

      if (
        error.message.includes("Session expired") ||
        error.message.includes("Authentication mismatch")
      ) {
        Alert.alert("Authentication Error", error.message);
      } else if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Re-authentication Required",
          "Please log out and log back in, then try deleting your account again for security reasons."
        );
      } else {
        Alert.alert("Error", "Error deleting account. Please try again.");
      }

      throw error;
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        // Popup and UI-related state
        showPopup,
        popupMessage,

        // Authentication and user management
        currentUser,
        setCurrentUser,
        Logout,
        isLoggingOut,
        setIsLoggingOut,
        updateUserProfile,
        getUserById,
        sendSupportRequest,
        sendFeedback,
        deleteAccount,

        //Notification
        sendNotification,
        notifications,
        readNotification,
        chatSummaries,
        readChat,

        // League-related operations
        retrievePlayersFromLeague,
        retrieveTeams,
        updateTeams,
        fetchPlayers,
        updatePlayers,
        getLeaguesForUser,
        checkUserRole,

        // Player and stats management
        resetPlayerStats,
        resetAllPlayerStats,
        updatePlacementStats,

        // Ranking and sorting
        rankSorting,
        getGlobalRank,
        getCountryRank,

        // Profile-related operations
        profileViewCount,

        // General utilities
        loading,
        setLoading,
        getAllUsers,
        updateUsers,
        players,
        setPlayers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };

// const getNotifications = async (userId) => {
//   try {
//     const userRef = doc(db, "users", userId);
//     const userDoc = await getDoc(userRef);

//     if (userDoc.exists()) {
//       const notifications = userDoc.data().notifications || [];
//       return notifications;
//     } else {
//       console.error("No such document!");
//       return [];
//     }
//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     return [];
//   }
// }
