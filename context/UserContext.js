import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";

import {
  doc,
  where,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  deleteDoc,
  query,
  limit as limitQuery,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../services/firebase.config";
import { deleteUser } from "firebase/auth";

import { PopupContext } from "./PopupContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileDetailSchema } from "../schemas/schema";
import {
  getUserById,
  retrieveTeams,
  updateUsers,
  updateTeams,
} from "../devFunctions/firebaseFunctions";

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
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
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
          "notifications",
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
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            );

            setNotifications(notificationsData);
          },
          (error) => {
            console.error("Error in notifications listener:", error);
          },
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

  const retrievePlayersFromCompetition = useCallback(
    async (competitionId, collectionName) => {
      try {
        const collectionRef = collection(db, collectionName);
        const docRef = doc(collectionRef, competitionId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.error("Competition not found");
          return [];
        }

        const data = docSnap.data();
        const participants =
          collectionName === "leagues"
            ? data.leagueParticipants
            : data.tournamentParticipants;

        return participants || [];
      } catch (error) {
        console.error("Error retrieving players:", error);
        return [];
      }
    },
    [],
  );

  async function checkUserRole({
    competitionData,
    competitionType = "league",
  }) {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return "hide";

      if (
        !competitionData ||
        !competitionData[`${competitionType}Owner`] ||
        !competitionData[`${competitionType}Admins`] ||
        !competitionData[`${competitionType}Participants`] ||
        !competitionData.pendingInvites ||
        !competitionData.pendingRequests
      ) {
        console.error("Invalid competition data:", competitionData);
        return "hide";
      }

      // 1) Tournament owner
      if (competitionData[`${competitionType}Owner`] === userId) {
        return "owner";
      }
      // 2) Admin
      if (
        competitionData[`${competitionType}Admins`].some(
          (a) => a.userId === userId,
        )
      ) {
        return "admin";
      }
      // 3) Participant
      if (
        competitionData[`${competitionType}Participants`].some(
          (p) => p.userId === userId,
        )
      ) {
        return "participant";
      }
      // 4) Pending invite (you’ve been invited)
      if (competitionData.pendingInvites.some((inv) => inv.userId === userId)) {
        return "invitationPending";
      }
      // 5) Pending request (you’ve asked to join)
      if (
        competitionData.pendingRequests.some((req) => req.userId === userId)
      ) {
        return "requestPending";
      }
      // 6) Default
      return "user";
    } catch (error) {
      console.error("Error checking user role:", error);
      return "hide";
    }
  }

  const fetchPlayers = useCallback(
    async (competitionId, collectionName = "leagues") => {
      try {
        const players = await retrievePlayersFromCompetition(
          competitionId,
          collectionName,
        );
        setPlayers(players);
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    },
    [retrievePlayersFromCompetition],
  );

  const [loading, setLoading] = useState(true); // Track loading state

  const getTopUsers = async (limit = 5) => {
    try {
      const usersRef = collection(db, "users");
      const topQuery = query(
        usersRef,
        orderBy("profileDetail.XP", "desc"),
        orderBy("profileDetail.numberOfWins", "desc"),
        orderBy("profileDetail.winPercentage", "desc"),
        orderBy("profileDetail.totalPointDifference", "desc"),
        orderBy("username", "asc"),
        limitQuery(limit), // Firestore only fetches 5 docs instead of entire collection
      );

      const snapshot = await getDocs(topQuery);
      return snapshot.docs.map((doc, index) => ({
        userId: doc.id,
        ...doc.data(),
        globalRank: index + 1,
      }));
    } catch (error) {
      console.error("Error fetching top users:", error);
      return [];
    }
  };

  const getAllUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const usersQuery = query(
        usersRef,
        orderBy("profileDetail.XP", "desc"),
        orderBy("profileDetail.numberOfWins", "desc"),
        orderBy("profileDetail.winPercentage", "desc"),
        orderBy("profileDetail.totalPointDifference", "desc"),
        orderBy("username", "asc"),
      );

      const querySnapshot = await getDocs(usersQuery);
      const users = querySnapshot.docs.map((doc) => ({
        userId: doc.id,
        ...doc.data(),
      }));

      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  // Paginated version of getAllUsers for AllPlayers screen
  const getAllUsersPaginated = async (
    page = 1,
    pageSize = 25,
    searchParam = "",
  ) => {
    try {
      const usersRef = collection(db, "users");

      // Sort using consistent ranking criteria
      const baseQuery = query(
        usersRef,
        orderBy("profileDetail.XP", "desc"),
        orderBy("profileDetail.numberOfWins", "desc"),
        orderBy("profileDetail.winPercentage", "desc"),
        orderBy("profileDetail.totalPointDifference", "desc"),
        orderBy("username", "asc"),
      );

      // Fetch all matching documents (or page + offset)
      const allSnapshot = await getDocs(baseQuery);

      // Map all users with globalRank
      let allUsers = allSnapshot.docs.map((doc, index) => ({
        userId: doc.id,
        ...doc.data(),
        globalRank: index + 1,
      }));

      if (searchParam && searchParam.trim() !== "") {
        const param = searchParam.toLowerCase(); // "pr" becomes "pr"
        allUsers = allUsers.filter((user) => {
          return user.username?.toLowerCase().startsWith(param); // "ProLikeMo" becomes "prolikemo"
        });
      }

      // Get only users for this page
      const start = (page - 1) * pageSize;
      const paginatedUsers = allUsers.slice(start, start + pageSize);

      return {
        users: paginatedUsers,
        totalUsers: allUsers.length,
        totalPages: Math.ceil(allUsers.length / pageSize),
      };
    } catch (error) {
      console.error("Error fetching paginated users:", error);
      return { users: [], totalUsers: 0, totalPages: 0 };
    }
  };

  const updatePlayers = async ({
    updatedPlayers,
    competitionId,
    collectionName,
  }) => {
    if (updatedPlayers.length === 0) {
      handleShowPopup("No players to update!");
      return;
    }

    try {
      const collectionDocRef = doc(db, collectionName, competitionId);

      // Fetch the current league document
      const collectionDoc = await getDoc(collectionDocRef);

      if (!collectionDoc.exists()) {
        handleShowPopup("League not found!");
        return;
      }

      const collectionData = collectionDoc.data();
      const existingPlayers =
        collectionName === "leagues"
          ? collectionData.leagueParticipants || []
          : collectionData.tournamentParticipants || [];

      // Update the existing players array with updated data
      const updatedParticipants = existingPlayers.map((player) => {
        const updatedPlayer = updatedPlayers.find(
          (p) => p.username === player.username,
        );
        return updatedPlayer ? { ...player, ...updatedPlayer } : player;
      });

      if (collectionName === "leagues") {
        // Update the leagueParticipants field in Firestore
        await updateDoc(collectionDocRef, {
          leagueParticipants: updatedParticipants,
        });
      } else if (collectionName === "tournaments") {
        // Update the tournamentParticipants field in Firestore
        await updateDoc(collectionDocRef, {
          tournamentParticipants: updatedParticipants,
        });
      }

      // handleShowPopup("Players updated successfully!");
    } catch (error) {
      console.error("Error updating player data:", error);
      handleShowPopup("Error updating player data");
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
      // const sorted = rankSorting(allUsers);

      // 3. Find index of the target user
      const userIndex = allUsers.findIndex((user) => user.userId === userId);

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
        (user) => user.location?.countryCode === countryCode,
      );

      // 2. Use the EXACT SAME sorting as AllPlayers
      // const sorted = rankSorting(filteredUsers);

      // 3. Find index of the target user
      const userIndex = filteredUsers.findIndex(
        (user) => user.userId === userId,
      );

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
            (participant) => participant.userId === userId,
          );
        });

      return userLeagues;
    } catch (error) {
      console.error("Error fetching leagues for user:", error);
      return [];
    }
  };

  const getTournamentsForUser = async (userId) => {
    try {
      const tournamentsRef = collection(db, "tournaments");
      const querySnapshot = await getDocs(tournamentsRef);

      const userTournaments = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((tournament) => {
          if (
            !tournament.tournamentParticipants ||
            !Array.isArray(tournament.tournamentParticipants)
          ) {
            return false;
          }
          return tournament.tournamentParticipants.some(
            (participant) => participant.userId === userId,
          );
        });

      return userTournaments;
    } catch (error) {
      console.error("Error fetching tournaments for user:", error);
      return [];
    }
  };

  const getCompetitionsForUser = async (userId, collectionName) => {
    try {
      const competitionsRef = collection(db, collectionName);

      // Determine the correct participants field name
      const participantsField =
        collectionName === "leagues"
          ? "leagueParticipants"
          : "tournamentParticipants";

      console.log(
        `Fetching active competitions for user ${userId} from ${collectionName}...`,
      );

      // Query only active competitions (prizes not yet distributed)
      const q = query(competitionsRef, where("prizesDistributed", "==", false));

      const querySnapshot = await getDocs(q);
      const competitions = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Check if user is in participants array
        const isParticipant = data[participantsField]?.some(
          (participant) => participant.userId === userId,
        );

        if (isParticipant) {
          competitions.push({
            id: doc.id,
            ...data,
          });
        }
      });

      console.log(
        `Found ${competitions.length} active ${collectionName} for user ${userId}`,
      );

      return competitions;
    } catch (error) {
      console.error(
        `Error fetching competitions from ${collectionName}:`,
        error,
      );
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

  const readNotification = async (notificationId, userId, response = null) => {
    try {
      if (!userId) throw new Error("User not authenticated");

      const userRef = doc(db, "users", userId);
      const notifRef = doc(userRef, "notifications", notificationId);

      const updateData = { isRead: true };
      if (response) {
        updateData.response = response;
      }

      await updateDoc(notifRef, updateData);
      console.log("Notification marked as read:", notificationId);
    } catch (error) {
      console.error(
        "Error marking notification as read:",
        error,
        notificationId,
        userId,
      );
    }
  };

  const sendNotification = async (notification) => {
    const error = [];
    const success = [];
    // console.log("Sending Notification:", JSON.stringify(notification, null, 2));
    try {
      const recipientId = notification.recipientId;
      if (!recipientId) {
        error.push("No recipientId");
      } else {
        success.push("Has recipientId");
      }

      // 🔥 Get the subcollection reference under the user
      const notifRef = collection(db, "users", recipientId, "notifications");
      if (!notifRef) {
        error.push("No notifRef");
      } else {
        success.push("Has notifRef");
      }

      // ➕ Add the notification as a new document
      await addDoc(notifRef, notification);

      // Lookup push tokens
      const recipientDoc = await getDoc(doc(db, "users", recipientId));
      if (!recipientDoc.exists()) {
        error.push("No recipientDoc");
      } else {
        success.push("Has recipientDoc");
      }
      const pushTokens = recipientDoc.data()?.pushTokens || [];

      if (pushTokens.length === 0) {
        error.push("No pushTokens");
      } else {
        success.push("Has pushTokens");
      }

      //send device notification
      if (pushTokens.length > 0) {
        const messages = pushTokens.map((token) => ({
          to: token,
          sound: "default",
          vibrate: [200, 100, 200],
          priority: "high",
          title: `Court Champs`,
          body: notification.message,
          data: {
            ...notification.data,
            type: notification.type,
          },
        }));
        if (messages.length === 0) {
          error.push("No messages");
        } else {
          success.push("Has messages");
        }
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          error.push("Push response not ok");
          error.push(`Response status: ${JSON.stringify(response)}`);
        } else {
          success.push("Push response ok");
        }
        console.log(`Push sent to ${pushTokens.length} devices`);
      }

      console.log("✅ Notification saved to subcollection!");
    } catch (error) {
      console.error("❌ Failed to send notification:", error);
      // Alert.alert(
      //   "Error",
      //   `5. Passed notification: ${JSON.stringify(notification)}.
      //     6. Success checks: ${success.join(",\n ")}.
      //     7. Error checks: ${error.join(",\n ")}.
      //    Failed to send notification: ${error.message} `
      // );
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
          "Session expired. Please log out and log back in, then try deleting your account again.",
        );
      }

      // Verify auth user matches current user
      if (user.uid !== userId) {
        await Logout();
        throw new Error(
          "Authentication mismatch. Please log in again to delete your account.",
        );
      }

      // Delete notifications subcollection
      try {
        const notificationsRef = collection(
          db,
          "users",
          userId,
          "notifications",
        );
        const notificationsSnapshot = await getDocs(notificationsRef);
        const notificationDeletes = notificationsSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref),
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
          "Please log out and log back in, then try deleting your account again for security reasons.",
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
        retrieveTeams,
        updateTeams,
        fetchPlayers,
        updatePlayers,
        getLeaguesForUser,
        getTournamentsForUser,
        getCompetitionsForUser,
        checkUserRole,

        // Ranking and sorting
        rankSorting,
        getGlobalRank,
        getCountryRank,
        getAllUsersPaginated,
        getTopUsers,

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
