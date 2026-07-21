import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  ReactNode,
} from "react";
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
  where,
  runTransaction,
  deleteDoc,
  QueryConstraint,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  writeBatch,
  UpdateData,
  DocumentData,
} from "firebase/firestore";
import { Alert } from "react-native";
import { ccDefaultImage } from "../mockImages";
import { db } from "../services/firebase.config";
import { LeagueContextType } from "./types/LeagueContextType";

import { generateCourtId } from "../helpers/generateCourtId";
import { clubFeed } from "../helpers/clubFeed";
import { AppEventsLogger } from "react-native-fbsdk-next";
import {
  scoreboardProfileSchema,
  ccImageEndpoint,
  notificationTypes,
  COMPETITION_TYPES,
  COLLECTION_NAMES,
  CompetitionType,
  notificationSchema,
  CollectionName,
  PlayingTime,
  Court,
  PendingInvites,
  CompetitionAdmins,
  PendingRequests,
  GameVideo,
  SelectedPlayers,
} from "@shared";
import { UserContext } from "./UserContext";
import {
  UserProfile,
  ScoreboardProfile,
  League,
  Tournament,
  Club,
  Player,
  Fixtures,
  Game,
  TeamStats,
  CompetitionOwner,
} from "@shared";
import {
  calculatePlayerPerformance,
  calculateTeamPerformance,
  recalculateParticipantsFromFixtures,
  getOrderedApprovedGames,
  advanceBrackets,
} from "@shared/helpers";

import { formatDisplayName } from "@/helpers/formatDisplayName";
import { getCompetitionConfig } from "@/helpers/getCompetitionConfig";

const LeagueContext = createContext<LeagueContextType>({} as LeagueContextType);

// ============================================
// HELPER FUNCTIONS (for game approval)
// ============================================

/**
 * Find game in competition (handles both league and tournament structures)
 */

const findGameInCompetition = (
  competitionData: { fixtures?: Fixtures[]; games?: Game[] },
  gameId: string,
  isTournament: boolean,
) => {
  if (isTournament) {
    const allGames =
      competitionData.fixtures?.flatMap((fixture: Fixtures) => fixture.games) ||
      [];
    const index = allGames.findIndex((game: Game) => game.gameId === gameId);
    return { game: allGames[index] || null, index, games: allGames };
  }

  const games = competitionData.games || [];
  const index = games.findIndex((game: Game) => game.gameId === gameId);
  return { game: games[index] || null, index, games };
};

/**
 * Get player user IDs from a game
 */
export const getPlayerUserIds = (game: Game) => {
  return [
    game.team1.player1?.userId,
    game.team1.player2?.userId,
    game.team2.player1?.userId,
    game.team2.player2?.userId,
  ].filter(Boolean);
};

const LeagueProvider = ({ children }: { children: ReactNode }) => {
  const {
    sendNotification,
    sendPushNotification,
    getUserById,
    currentUser,
    readNotification,
  } = useContext(UserContext);
  const [showMockData, setShowMockData] = useState(false);
  const [leagueNavigationId, setLeagueNavigationId] = useState("");
  const [tournamentNavigationId, setTournamentNavigationId] = useState("");
  const [clubNavigationId, setClubNavigationId] = useState("");
  const [leagueById, setLeagueById] = useState<League | null>(null);
  const [tournamentById, setTournamentById] = useState<Tournament | null>(null);
  const [clubById, setClubById] = useState<Club | null>(null);
  const [upcomingLeagues, setUpcomingLeagues] = useState<League[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>(
    [],
  );
  const [upcomingClubs, setUpcomingClubs] = useState<Club[]>([]);
  const [upcomingClubsLoading, setUpcomingClubsLoading] = useState(false);

  const COMPETITION_CONFIG = {
    league: {
      collectionName: "leagues",
      idField: "leagueId",
      nameField: "leagueName",
      setNavigationId: (id: string) => setLeagueNavigationId(id),
      clearNavigationId: () => setLeagueNavigationId(""),

      participantsKey: "leagueParticipants",
      adminsKey: "leagueAdmins",
      ownerKey: "leagueOwner",
      paramKey: "leagueId",
      informationType: notificationTypes.INFORMATION.LEAGUE.TYPE,
    },
    tournament: {
      collectionName: "tournaments",
      idField: "tournamentId",
      nameField: "tournamentName",
      setNavigationId: (id: string) => setTournamentNavigationId(id),
      clearNavigationId: () => setTournamentNavigationId(""),

      participantsKey: "tournamentParticipants",
      adminsKey: "tournamentAdmins",
      ownerKey: "tournamentOwner",
      paramKey: "tournamentId",
      informationType: notificationTypes.INFORMATION.TOURNAMENT.TYPE,
    },
  };

  useEffect(() => {
    if (!currentUser?.userId) {
      setUpcomingClubs([]);
      setUpcomingClubsLoading(false);
      return;
    }
    fetchUpcomingLeagues();
    fetchUpcomingTournaments();
    fetchUpcomingClubs();
  }, [currentUser?.userId]);

  const fetchCompetitions = async ({
    competition,
    numberToLoad = 30,
    countryCode = null,
  }: {
    competition: CollectionName;
    numberToLoad?: number;
    countryCode?: string | null;
  }) => {
    try {
      const ref = collection(db, competition);
      const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")]; // newest first

      if (countryCode)
        constraints.push(where("countryCode", "==", countryCode));

      if (numberToLoad) constraints.push(limit(numberToLoad));

      const snapshot = await getDocs(query(ref, ...constraints));
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error fetching ${competition}:`, error);
      return [];
    }
  };

  const fetchUpcomingLeagues = async () => {
    const leagues = await fetchCompetitions({
      competition: "leagues",
      numberToLoad: 30,
    });
    setUpcomingLeagues(leagues as unknown as League[]);
  };

  const fetchUpcomingTournaments = async () => {
    const tournaments = await fetchCompetitions({
      competition: "tournaments",
      numberToLoad: 30,
    });
    setUpcomingTournaments(tournaments as unknown as Tournament[]);
  };

  const fetchUpcomingClubs = async () => {
    setUpcomingClubsLoading(true);
    try {
      const rows = await fetchCompetitions({
        competition: "clubs",
        numberToLoad: 30,
      });
      const clubs = (rows as { id?: string; clubId?: string }[]).map((row) => ({
        ...row,
        clubId: row.clubId ?? row.id ?? "",
      })) as Club[];
      setUpcomingClubs(clubs);
    } finally {
      setUpcomingClubsLoading(false);
    }
  };

  const fetchLeagues = (options = {}) =>
    fetchCompetitions({ competition: "leagues", ...options }) as Promise<
      League[]
    >;

  const fetchTournaments = (options = {}) =>
    fetchCompetitions({ competition: "tournaments", ...options }) as Promise<
      Tournament[]
    >;

  const addPlaytime = async ({
    playtime,
    existingPlaytime = null,
    competitionType,
    competitionId,
  }: {
    playtime: PlayingTime[];
    existingPlaytime?: PlayingTime | null;
    competitionType: CompetitionType;
    competitionId: string;
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
          updatedPlaytime = currentPlaytime.map((time: PlayingTime) =>
            time.day === existingPlaytime.day &&
              time.startTime === existingPlaytime.startTime &&
              time.endTime === existingPlaytime.endTime
              ? playtime[0] // Replace with updated playtime
              : time,
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
  }: {
    playtimeToDelete: PlayingTime;
    competitionType: CompetitionType;
    competitionId: string;
  }) => {
    try {
      const collectionRef = collection(
        db,
        competitionType === "league" ? "leagues" : "tournaments",
      );
      const docRef = doc(collectionRef, competitionId);

      const docSnapshot = await getDoc(docRef);

      if (docSnapshot.exists()) {
        const currentPlaytime = docSnapshot.data().playingTime || [];

        // Filter out the playtime to be deleted
        const updatedPlaytime = currentPlaytime.filter(
          (playtime: PlayingTime) =>
            !(
              playtime.day === playtimeToDelete.day &&
              playtime.startTime === playtimeToDelete.startTime &&
              playtime.endTime === playtimeToDelete.endTime
            ),
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

  const handleLeagueDescription = async (newDescription: string) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueById?.id);

      // Update the leagueDescription field in Firebase
      await updateDoc(leagueDocRef, { leagueDescription: newDescription });

      // Update the context state with new description
      setLeagueById((prev: League | null): League | null =>
        prev ? { ...prev, leagueDescription: newDescription } : null,
      );
    } catch (error) {
      console.error("Error updating league description:", error);
      Alert.alert("Error", "Unable to update the league description.");
    }
  };

  const createWelcomeChatMessage = async ({
    collectionName,
    documentId,
    title,
  }: {
    collectionName: CollectionName;
    documentId: string;
    title: string;
  }) => {
    const messageReference = doc(
      collection(db, collectionName, documentId, "chat"),
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
  }: {
    data: League & Tournament;
    competitionType: CompetitionType;
    resetDelayMs?: number;
  }) => {
    try {
      const config =
        COMPETITION_CONFIG[competitionType as keyof typeof COMPETITION_CONFIG];
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

      const documentId = data?.[
        idField as keyof (League & Tournament)
      ] as string;
      const title = data?.[nameField as keyof (League & Tournament)] as string;

      if (!documentId) {
        console.error(`Missing required id field "${idField}" on data.`);
        return;
      }

      const ownerId = (
        data[config.ownerKey as keyof (League & Tournament)] as {
          userId?: string;
        }
      )?.userId;

      await setDoc(doc(db, collectionName, documentId), {
        ...data,
        participantIds: ownerId ? [ownerId] : [],
      });
      await createWelcomeChatMessage({
        collectionName: collectionName as CollectionName,
        documentId,
        title: title ?? "",
      });
      // Refresh competitions list
      if (competitionType === "league") {
        await fetchUpcomingLeagues();
      } else {
        await fetchUpcomingTournaments();
      }

      // Surface in the club feed when the competition belongs to a club.
      if (data.clubId) {
        const owner = data[
          config.ownerKey as keyof (League & Tournament)
        ] as CompetitionOwner | undefined;
        const competitionImage =
          competitionType === "league"
            ? data.leagueImage
            : data.tournamentImage;
        await clubFeed.competitionCreated(data.clubId, {
          name: title ?? "",
          competitionType: competitionType as "league" | "tournament",
          competitionId: documentId,
          image: competitionImage ?? null,
          actor: owner
            ? {
              userId: owner.userId,
              username: owner.username,
              firstName: owner.firstName,
              lastName: owner.lastName,
            }
            : null,
        });
      }

      setNavigationId(documentId);

      setTimeout(() => {
        clearNavigationId();
      }, resetDelayMs);
    } catch (error) {
      console.error("Error adding competition:", error);
    }
  };

  const addClub = async ({
    data,
    ownerParticipant,
  }: {
    data: Club;
    ownerParticipant: Player;
  }) => {
    if (!data?.clubId) {
      console.error("addClub: missing clubId");
      return;
    }
    try {
      const batch = writeBatch(db);
      const clubRef = doc(db, COLLECTION_NAMES.clubs, data.clubId);
      batch.set(clubRef, { ...data });
      const participantRef = doc(
        db,
        COLLECTION_NAMES.clubs,
        data.clubId,
        "participants",
        ownerParticipant.userId,
      );
      batch.set(participantRef, { ...ownerParticipant });
      await batch.commit();

      await createWelcomeChatMessage({
        collectionName: "clubs",
        documentId: data.clubId,
        title: data.clubName ?? "",
      });

      AppEventsLogger.logEvent("CreatedClub", {
        club_name: data.clubName,
      });

      await fetchUpcomingClubs();

      setClubNavigationId(data.clubId);
      setTimeout(() => {
        setClubNavigationId("");
      }, 2500);
    } catch (error) {
      console.error("Error adding club:", error);
      throw error;
    }
  };

  const fetchClubById = useCallback(async (clubId: string): Promise<Club | null> => {
    try {
      const clubDoc = await getDoc(doc(db, COLLECTION_NAMES.clubs, clubId));
      if (!clubDoc.exists()) {
        setClubById(null);
        return null;
      }
      const clubData = {
        clubId: clubDoc.id,
        ...clubDoc.data(),
      } as Club;
      setClubById(clubData);
      return clubData;
    } catch (error) {
      console.error("Error fetching club:", error);
      setClubById(null);
      return null;
    }
  }, []);

  const fetchCompetitionById = async ({
    competitionId,
    collectionName,
    setState = true,
  }: {
    competitionId: string;
    collectionName: CollectionName;
    setState?: boolean;
  }): Promise<League | Tournament | null> => {
    try {
      const competitionDoc = await getDoc(
        doc(db, collectionName, competitionId),
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

      if (setState) {
        if (isTournament) {
          setTournamentById(competitionData as Tournament);
        } else {
          setLeagueById(competitionData as League);
        }
      }

      return competitionData as unknown as League | Tournament;
    } catch (error) {
      console.error("Error fetching competition:", error);
      return null;
    }
  };

  // Function to update a league
  const updateCompetition = async ({
    competition,
    collectionName,
  }: {
    competition: League | Tournament;
    collectionName: CollectionName;
  }) => {
    try {
      const competitionId =
        collectionName === "leagues"
          ? (competition as League).leagueId
          : (competition as Tournament).tournamentId;

      if (!competitionId) {
        console.error("Competition ID not found");
        return;
      }

      const competitionDocRef = doc(db, collectionName, competitionId);

      // Update the competition document in Firebase
      await updateDoc(competitionDocRef, { ...competition });
    } catch (error) {
      console.error("Error updating league:", error);
      Alert.alert("Error", "Unable to update the league.");
    }
  };

  const getCourts = async () => {
    const snapshot = await getDocs(collection(db, "courts"));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Court[];
  };

  const addCourt = async (courtData: Court) => {
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
    competitionId: string,
    userId: string,
    collectionName: CollectionName,
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
  }: {
    userId: string;
    competitionId: string;
    notificationId: string;
    collectionName: CollectionName;
  }) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const notificationDocRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId,
      );

      const participantsKey =
        collectionName === "leagues"
          ? "leagueParticipants"
          : "tournamentParticipants";

      const newParticipant = await getUserById(userId);

      if (!newParticipant) {
        console.error("User not found:", userId);
        return;
      }

      const newParticipantProfile = {
        ...scoreboardProfileSchema,
        username: newParticipant.username,
        firstName: newParticipant.firstName.split(" ")[0],
        lastName: newParticipant.lastName.split(" ")[0],
        userId: newParticipant.userId,
        memberSince: newParticipant.profileDetail?.memberSince || "",
        profileImage: newParticipant.profileImage || ccImageEndpoint,
      };

      await runTransaction(db, async (transaction) => {
        const competitionDoc = await transaction.get(competitionRef);

        if (!competitionDoc.exists()) {
          console.error("Competition does not exist or has been deleted");
          transaction.update(notificationDocRef, { isRead: true });
          return;
        }

        const competitionData = competitionDoc.data();
        const competitionParticipants = competitionData[participantsKey] || [];
        const pendingInvites = competitionData.pendingInvites || [];

        const alreadyParticipant = competitionParticipants.some(
          (p: { userId: string }) => p.userId === userId,
        );

        if (alreadyParticipant) {
          console.log("User is already a participant — skipping duplicate add");
          transaction.update(notificationDocRef, { isRead: true });
          return;
        }

        const updatedPending = pendingInvites.filter(
          (inv: { userId: string }) => inv.userId !== userId,
        );

        transaction.update(competitionRef, {
          [participantsKey]: [
            ...competitionParticipants,
            newParticipantProfile,
          ],
          pendingInvites: updatedPending,
          participantIds: arrayUnion(userId),
        });

        transaction.update(notificationDocRef, {
          isRead: true,
          response: notificationTypes.RESPONSE.ACCEPT,
        });
      });

      AppEventsLogger.logEvent("JoinedCompetition", {
        competition_type:
          collectionName === "leagues" ? "league" : "tournament",
        method: "invite",
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
  }: {
    userId: string;
    competitionId: string;
    notificationId: string;
    collectionName: CollectionName;
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
          "notifications",
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
        (inv: { userId: string }) => inv.userId !== userId,
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

  // Directly add players to a competition (no invite/notification).
  // Used for club competitions where members are added straight away.
  // Returns the userIds that were actually added.
  const addPlayersToCompetition = async ({
    competitionId,
    collectionName,
    userIds,
  }: {
    competitionId: string;
    collectionName: CollectionName;
    userIds: string[];
  }): Promise<string[]> => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const participantsKey =
        collectionName === "leagues"
          ? "leagueParticipants"
          : "tournamentParticipants";

      const competitionDoc = await getDoc(competitionRef);
      if (!competitionDoc.exists()) {
        throw new Error("Competition does not exist or has been deleted");
      }

      const competitionData = competitionDoc.data();
      const existingParticipants = competitionData[participantsKey] || [];
      const pendingInvites = competitionData.pendingInvites || [];
      const maxPlayers = competitionData.maxPlayers;

      const existingIds = new Set(
        existingParticipants.map((p: { userId: string }) => p.userId),
      );

      // Only genuinely-new users
      const newUserIds = userIds.filter((uid) => !existingIds.has(uid));
      if (newUserIds.length === 0) return [];

      // Guard: block the whole batch if it would exceed maxPlayers
      if (
        maxPlayers &&
        existingParticipants.length + newUserIds.length > maxPlayers
      ) {
        throw new Error("MAX_PLAYERS_EXCEEDED");
      }

      // Build participant profiles for the new users
      const profiles = await Promise.all(
        newUserIds.map(async (uid) => {
          const user = await getUserById(uid);
          if (!user) return null;
          return {
            ...scoreboardProfileSchema,
            username: user.username,
            firstName: user.firstName.split(" ")[0],
            lastName: user.lastName.split(" ")[0],
            userId: user.userId,
            memberSince: user.profileDetail?.memberSince || "",
            profileImage: user.profileImage || ccImageEndpoint,
          };
        }),
      );
      const toAdd = profiles.filter((p) => p !== null);
      if (toAdd.length === 0) return [];

      const addedIds = toAdd.map((p) => p!.userId);
      const addedIdSet = new Set(addedIds);
      const updatedPending = pendingInvites.filter(
        (inv: { userId: string }) => !addedIdSet.has(inv.userId),
      );

      await updateDoc(competitionRef, {
        [participantsKey]: [...existingParticipants, ...toAdd],
        pendingInvites: updatedPending,
      });

      AppEventsLogger.logEvent("JoinedCompetition", {
        competition_type:
          collectionName === "leagues" ? "league" : "tournament",
        method: "club_add",
      });

      console.log("Players added to competition successfully!");
      return addedIds;
    } catch (error) {
      console.error("Error adding players to competition:", error);
      throw error;
    }
  };

  const acceptClubInvite = async ({
    userId,
    clubId,
    notificationId,
  }: {
    userId: string;
    clubId: string;
    notificationId: string;
  }) => {
    try {
      const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
      const notificationDocRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId,
      );

      const newParticipant = await getUserById(userId);
      if (!newParticipant) {
        console.error("User not found:", userId);
        return;
      }

      const participantData: Player = {
        userId: newParticipant.userId,
        firstName: newParticipant.firstName,
        lastName: newParticipant.lastName,
        username: newParticipant.username,
      };

      await runTransaction(db, async (transaction) => {
        const clubDoc = await transaction.get(clubRef);

        if (!clubDoc.exists()) {
          console.error("Club does not exist or has been deleted");
          transaction.update(notificationDocRef, { isRead: true });
          return;
        }

        const clubData = clubDoc.data();
        const pendingInvites = clubData.pendingInvites || [];

        const updatedPending = pendingInvites.filter(
          (inv: { userId: string }) => inv.userId !== userId,
        );

        transaction.update(clubRef, { pendingInvites: updatedPending });

        const participantRef = doc(
          db,
          COLLECTION_NAMES.clubs,
          clubId,
          "participants",
          userId,
        );
        transaction.set(participantRef, participantData);

        transaction.update(notificationDocRef, {
          isRead: true,
          response: notificationTypes.RESPONSE.ACCEPT,
        });
      });

      AppEventsLogger.logEvent("JoinedClub", {
        club_id: clubId,
        method: "invite",
      });

      await clubFeed.playerJoined(clubId, {
        userId: participantData.userId,
        username: participantData.username,
        firstName: participantData.firstName,
        lastName: participantData.lastName,
        profileImage: newParticipant.profileImage,
      });

      console.log("Club invite accepted successfully!");
    } catch (error) {
      console.error("Error accepting club invite:", error);
    }
  };

  const declineClubInvite = async ({
    userId,
    clubId,
    notificationId,
  }: {
    userId: string;
    clubId: string;
    notificationId: string;
  }) => {
    try {
      const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
      const clubSnap = await getDoc(clubRef);

      if (!clubSnap.exists()) {
        console.error("Club does not exist or has been deleted");
        const notificationDocRef = doc(
          db,
          "users",
          userId,
          "notifications",
          notificationId,
        );
        await updateDoc(notificationDocRef, { isRead: true });
        return;
      }

      const clubData = clubSnap.data();
      const pendingInvites = clubData.pendingInvites || [];

      const updatedPending = pendingInvites.filter(
        (inv: { userId: string }) => inv.userId !== userId,
      );

      await updateDoc(clubRef, { pendingInvites: updatedPending });

      const notificationDocRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId,
      );
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.DECLINE,
      });

      console.log("Club invite declined successfully!");
    } catch (error) {
      console.error("Error declining club invite:", error);
    }
  };

  const requestToJoinClub = async ({
    clubId,
    currentUser,
    ownerId,
  }: {
    clubId: string;
    currentUser: UserProfile;
    ownerId: string;
  }): Promise<boolean> => {
    try {
      const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
      const clubSnap = await getDoc(clubRef);
      if (!clubSnap.exists()) return false;

      const data = clubSnap.data();
      const pendingRequests = data.pendingRequests || [];

      const alreadyRequested = pendingRequests.some(
        (r: { userId: string }) => r.userId === currentUser.userId,
      );
      if (alreadyRequested) return false;

      await updateDoc(clubRef, {
        pendingRequests: [...pendingRequests, { userId: currentUser.userId }],
      });

      const displayName = formatDisplayName(currentUser);
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: ownerId,
        senderId: currentUser.userId,
        message: `${displayName} has requested to join your club!`,
        type: notificationTypes.ACTION.JOIN_REQUEST.CLUB,
        data: { clubId },
      };

      await sendNotification(payload);
      return true;
    } catch (error) {
      console.error("Error requesting to join club:", error);
      return false;
    }
  };

  const acceptClubJoinRequest = async ({
    senderId,
    clubId,
    notificationId,
    userId,
  }: {
    senderId: string;
    clubId: string;
    notificationId: string;
    userId: string;
  }) => {
    try {
      const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
      const notificationDocRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId,
      );

      const newParticipant = await getUserById(senderId);
      if (!newParticipant) {
        console.error("Sender not found:", senderId);
        return;
      }

      const participantData: Player = {
        userId: newParticipant.userId,
        firstName: newParticipant.firstName,
        lastName: newParticipant.lastName,
        username: newParticipant.username,
      };

      await runTransaction(db, async (transaction) => {
        const clubDoc = await transaction.get(clubRef);
        if (!clubDoc.exists()) {
          transaction.update(notificationDocRef, { isRead: true });
          return;
        }

        const clubData = clubDoc.data();
        const pendingRequests = clubData.pendingRequests || [];
        const updatedPending = pendingRequests.filter(
          (r: { userId: string }) => r.userId !== senderId,
        );

        transaction.update(clubRef, { pendingRequests: updatedPending });

        const participantRef = doc(
          db,
          COLLECTION_NAMES.clubs,
          clubId,
          "participants",
          senderId,
        );
        transaction.set(participantRef, participantData);

        transaction.update(notificationDocRef, {
          isRead: true,
          response: notificationTypes.RESPONSE.ACCEPT,
        });
      });

      await clubFeed.playerJoined(clubId, {
        userId: participantData.userId,
        username: participantData.username,
        firstName: participantData.firstName,
        lastName: participantData.lastName,
        profileImage: newParticipant.profileImage,
      });

      console.log("Club join request accepted successfully!");
    } catch (error) {
      console.error("Error accepting club join request:", error);
    }
  };

  const declineClubJoinRequest = async ({
    senderId,
    clubId,
    notificationId,
    userId,
  }: {
    senderId: string;
    clubId: string;
    notificationId: string;
    userId: string;
  }) => {
    try {
      const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
      const clubSnap = await getDoc(clubRef);
      const data = clubSnap.data();
      const pendingRequests = data?.pendingRequests || [];
      const updatedPending = pendingRequests.filter(
        (r: { userId: string }) => r.userId !== senderId,
      );

      await updateDoc(clubRef, { pendingRequests: updatedPending });

      const notificationDocRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId,
      );
      await updateDoc(notificationDocRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.DECLINE,
      });

      console.log("Club join request declined successfully!");
    } catch (error) {
      console.error("Error declining club join request:", error);
    }
  };

  const requestToJoinLeague = async ({
    competitionId,
    currentUser,
    ownerId,
    collectionName,
    clubId,
  }: {
    competitionId: string;
    currentUser: UserProfile;
    ownerId: string;
    collectionName: CollectionName;
    clubId?: string | null;
  }) => {
    try {
      const collectionRef = doc(db, collectionName, competitionId);
      const competitionSnap = await getDoc(collectionRef);

      if (!competitionSnap.exists()) {
        console.log("Competition does not exist");
        return false;
      }

      const competitionData = competitionSnap.data();
      const pendingRequests = competitionData.pendingRequests || [];

      const alreadyRequested = pendingRequests.some(
        (r: { userId: string }) => r.userId === currentUser?.userId,
      );
      if (alreadyRequested) return false;

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

      // If this competition belongs to a club, notify the club owner instead
      let recipientId = ownerId;
      let clubName: string | null = null;
      if (clubId) {
        const clubSnap = await getDoc(doc(db, COLLECTION_NAMES.clubs, clubId));
        if (clubSnap.exists()) {
          const clubData = clubSnap.data();
          recipientId = clubData.clubOwner?.userId ?? ownerId;
          clubName = clubData.clubName ?? null;
        }
      }

      const message = clubId
        ? `${displayName} has requested to join a ${competitionType} in your club!`
        : `${displayName} has requested to join your ${competitionType}!`;

      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId,
        senderId: currentUser?.userId,
        message,
        type: notificationType,
        data: {
          [paramKey]: competitionId,
          ...(clubId ? { clubId, clubName } : {}),
        },
      };

      await sendNotification(payload);

      AppEventsLogger.logEvent("RequestedToJoin", {
        competition_type: competitionType,
      });

      return true;
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
  }: {
    senderId: string;
    competitionId: string;
    notificationId: string;
    userId: string;
    collectionName: CollectionName;
  }) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const notificationDocRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId,
      );

      const participantsKey =
        collectionName === "leagues"
          ? "leagueParticipants"
          : "tournamentParticipants";

      const newParticipant = await getUserById(senderId);

      if (!newParticipant) {
        console.error("Sender not found:", senderId);
        return;
      }

      const newParticipantProfile = {
        ...scoreboardProfileSchema,
        username: newParticipant.username,
        firstName: newParticipant.firstName.split(" ")[0],
        lastName: newParticipant.lastName.split(" ")[0],
        userId: newParticipant.userId,
        memberSince: newParticipant.profileDetail?.memberSince || "",
        profileImage: newParticipant.profileImage || ccImageEndpoint,
      };

      await runTransaction(db, async (transaction) => {
        const competitionDoc = await transaction.get(competitionRef);

        if (!competitionDoc.exists()) {
          console.error("Competition does not exist or has been deleted");
          transaction.update(notificationDocRef, { isRead: true });
          return;
        }

        const competitionData = competitionDoc.data();
        const competitionParticipants = competitionData[participantsKey] || [];
        const pendingRequests = competitionData.pendingRequests || [];

        const alreadyParticipant = competitionParticipants.some(
          (p: { userId: string }) => p.userId === senderId,
        );

        if (alreadyParticipant) {
          console.log("User is already a participant — skipping duplicate add");
          transaction.update(notificationDocRef, { isRead: true });
          return;
        }

        const updatedPending = pendingRequests.filter(
          (pen: { userId: string }) => pen.userId !== senderId,
        );

        transaction.update(competitionRef, {
          [participantsKey]: [
            ...competitionParticipants,
            newParticipantProfile,
          ],
          pendingRequests: updatedPending,
          participantIds: arrayUnion(senderId),
        });

        // If the competition belongs to a club, also add the player as a club participant
        const competitionClubId = competitionData.clubId;
        if (competitionClubId) {
          const clubParticipantRef = doc(
            db,
            COLLECTION_NAMES.clubs,
            competitionClubId,
            "participants",
            senderId,
          );
          transaction.set(
            clubParticipantRef,
            {
              userId: newParticipant.userId,
              firstName: newParticipant.firstName,
              lastName: newParticipant.lastName,
              username: newParticipant.username,
            },
            { merge: true },
          );
        }

        transaction.update(notificationDocRef, {
          isRead: true,
          response: notificationTypes.RESPONSE.ACCEPT,
        });
      });

      // If competition belongs to a club, also post a club feed event
      const competitionSnap = await getDoc(competitionRef);
      const competitionClubId = competitionSnap.exists()
        ? competitionSnap.data().clubId
        : null;
      if (competitionClubId) {
        await clubFeed.playerJoined(competitionClubId, {
          userId: newParticipant.userId,
          username: newParticipant.username,
          firstName: newParticipant.firstName,
          lastName: newParticipant.lastName,
          profileImage: newParticipant.profileImage,
        });
      }

      AppEventsLogger.logEvent("JoinedCompetition", {
        competition_type:
          collectionName === "leagues" ? "league" : "tournament",
        method: "request",
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
  }: {
    senderId: string;
    competitionId: string;
    notificationId: string;
    userId: string;
    collectionName: CollectionName;
  }) => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const competitionDoc = await getDoc(competitionRef);
      const competitionData = competitionDoc.data();

      // Remove senderId from pending requests
      const pendingRequests = competitionData?.pendingRequests || [];

      const updatedPending = pendingRequests.filter(
        (pen: { userId: string }) => pen.userId !== senderId,
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
  }: {
    gameId: string;
    competitionId: string;
    userId: string;
    senderId: string;
    notificationId?: string;
    notificationType: string;
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

      const approvalLimit = competitionData.approvalLimit || 1;
      const existingApprovers = game.approvers || [];

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

        const playerUserIds = getPlayerUserIds(updatedGame).filter(
          (uid): uid is string => !!uid,
        );

        await runTransaction(db, async (transaction) => {
          const freshSnap = await transaction.get(competitionRef);
          const freshData = freshSnap.data();

          const freshParticipants: ScoreboardProfile[] =
            freshData?.[config.participantsKey] ?? [];
          const freshTeams: TeamStats[] = freshData?.[config.teamKey] ?? [];
          const isDoubles = competitionData[config.typeKey] === "Doubles";

          // ── Fetch user docs for current game's players only ──
          const userRefs = playerUserIds.map((uid) => doc(db, "users", uid));
          const userSnaps = await Promise.all(
            userRefs.map((ref) => transaction.get(ref)),
          );
          const freshUsers = userSnaps
            .filter((snap) => snap.exists())
            .map((snap) => snap.data() as UserProfile);

          if (isTournament) {
            const freshFixtures: Fixtures[] = freshData?.fixtures ?? [];
            const isKnockout = competitionData.tournamentMode === "Knockout";
            const numberOfCourts = competitionData.numberOfCourts || 1;

            const fixturesWithApprovedGame = freshFixtures.map((round) => ({
              ...round,
              games: round.games.map((g) =>
                g.gameId === updatedGame.gameId ? updatedGame : g,
              ),
            }));

            if (isKnockout) {
              const updatedFixtures = advanceBrackets({
                fixtures: fixturesWithApprovedGame,
                numberOfCourts,
              });

              const { playersToUpdate, usersToUpdate } =
                calculatePlayerPerformance(
                  updatedGame,
                  freshParticipants.filter((p) =>
                    playerUserIds.includes(p.userId!),
                  ),
                  freshUsers,
                );

              const updatedParticipants = freshParticipants.map((p) => {
                const updated = playersToUpdate.find(
                  (u) => u.userId === p.userId,
                );
                return updated ?? p;
              });

              const updatePayload: UpdateData<DocumentData> = {
                fixtures: updatedFixtures,
                gamesCompleted: increment(1),
                [config.participantsKey]: updatedParticipants,
              };

              if (isDoubles) {
                const [updatedWinnerTeam, updatedLoserTeam] =
                  await calculateTeamPerformance({
                    game: updatedGame,
                    allTeams: freshTeams,
                  });

                const updatedTeams = freshTeams.map((team) => {
                  if (team.teamKey === updatedWinnerTeam.teamKey)
                    return updatedWinnerTeam;
                  if (team.teamKey === updatedLoserTeam.teamKey)
                    return updatedLoserTeam;
                  return team;
                });

                updatePayload[config.teamKey] = updatedTeams;
              }

              transaction.update(competitionRef, updatePayload);

              usersToUpdate?.forEach((user) => {
                if (!user.userId) return;
                const userRef = doc(db, "users", user.userId);
                transaction.update(userRef, {
                  profileDetail: user.profileDetail,
                });
              });
            } else {
              // ── Round-robin tournament: existing replay path ──
              const orderedApprovedGames = getOrderedApprovedGames(
                fixturesWithApprovedGame,
              );

              const { updatedParticipants, updatedTeams } =
                await recalculateParticipantsFromFixtures(
                  orderedApprovedGames,
                  freshParticipants,
                  freshTeams,
                  isDoubles,
                );

              transaction.update(competitionRef, {
                fixtures: fixturesWithApprovedGame,
                gamesCompleted: increment(1),
                [config.participantsKey]: updatedParticipants,
                ...(isDoubles && { [config.teamKey]: updatedTeams }),
              });

              const { usersToUpdate } = calculatePlayerPerformance(
                updatedGame,
                freshParticipants.filter((p) =>
                  playerUserIds.includes(p.userId!),
                ),
                freshUsers,
              );

              usersToUpdate?.forEach((user) => {
                if (!user.userId) return;
                const userRef = doc(db, "users", user.userId);
                transaction.update(userRef, {
                  profileDetail: user.profileDetail,
                });
              });
            }
          } else {
            // ── Leagues use delta approach — no fixture replay needed ──
            const { playersToUpdate, usersToUpdate } =
              calculatePlayerPerformance(
                updatedGame,
                freshParticipants.filter((p) =>
                  playerUserIds.includes(p.userId!),
                ),
                freshUsers,
              );

            const updatedParticipants = freshParticipants.map((p) => {
              const updated = playersToUpdate.find(
                (u) => u.userId === p.userId,
              );
              return updated ?? p;
            });

            if (isDoubles) {
              const [updatedWinnerTeam, updatedLoserTeam] =
                await calculateTeamPerformance({
                  game: updatedGame,
                  allTeams: freshTeams,
                });

              const updatedTeams = freshTeams.map((team) => {
                if (team.teamKey === updatedWinnerTeam.teamKey)
                  return updatedWinnerTeam;
                if (team.teamKey === updatedLoserTeam.teamKey)
                  return updatedLoserTeam;
                return team;
              });

              transaction.update(competitionRef, {
                [config.participantsKey]: updatedParticipants,
                [config.teamKey]: updatedTeams,
              });
            } else {
              transaction.update(competitionRef, {
                [config.participantsKey]: updatedParticipants,
              });
            }

            usersToUpdate?.forEach((user) => {
              if (!user.userId) return;
              const userRef = doc(db, "users", user.userId);
              transaction.update(userRef, {
                profileDetail: user.profileDetail,
              });
            });
          }
        });
      }

      if (isTournament) {
        if (!isFullyApproved) {
          await updateTournamentGame({
            tournamentId: competitionId,
            gameId,
            updatedGame,
            removeGame: false,
          });
        }
      } else {
        const updatedGames = [...games];
        updatedGames[gameIndex] = updatedGame;
        await updateDoc(competitionRef, { games: updatedGames });
      }

      if (notificationId) {
        await readNotification(
          notificationId,
          userId,
          notificationTypes.RESPONSE.ACCEPT,
        );
      }

      await sendNotification({
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: senderId,
        senderId: userId,
        message: `${currentUserData.username} has approved your game on ${competitionData[config.nameKey]
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

      AppEventsLogger.logEvent("ApprovedGame", {
        competition_type: config.isLeague ? "league" : "tournament",
        is_fully_approved: isFullyApproved ? "true" : "false",
      });
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
  }: {
    gameId: string;
    competitionId: string;
    userId: string;
    senderId: string;
    notificationId: string;
    notificationType: string;
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
          const resetGame: Game = {
            gameId: game.gameId,
            team1: {
              player1: game.team1.player1,
              player2: game.team1.player2 ?? null,
              score: null,
            },
            team2: {
              player1: game.team2.player1,
              player2: game.team2.player2 ?? null,
              score: null,
            },
            result: null,
            approvalStatus: "Scheduled",
            numberOfApprovals: 0,
            numberOfDeclines: 0,
            reporter: "",
            reportedAt: null,
            reportedTime: null,
            gamescore: "",
            court: game.court,
            gameNumber: game.gameNumber,
            createdAt: game.createdAt,
            createdTime: game.createdTime,
            approvers: [],
          };

          await updateTournamentGame({
            tournamentId: competitionId,
            gameId,
            updatedGame: resetGame,
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
            updatedGame: updatedGame,
          });
        } else {
          updatedGames[gameIndex] = updatedGame;
          await updateDoc(competitionRef, { games: updatedGames });
        }
      }

      // Archive video if game had one
      if (game.videoUrl) {
        await updateDoc(doc(db, COLLECTION_NAMES.gameVideos, gameId), {
          videoApproved: false,
        });
      }

      if (notificationId) {
        await readNotification(
          notificationId,
          userId,
          notificationTypes.RESPONSE.DECLINE,
        );
      }

      await sendNotification({
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: senderId,
        senderId: userId,
        message: `${currentUserData.username} has declined your game on ${competitionData[config.nameKey]
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

      AppEventsLogger.logEvent("DeclinedGame", {
        competition_type: config.isLeague ? "league" : "tournament",
        is_fully_declined: isFullyDeclined ? "true" : "false",
      });
    } catch (error) {
      console.error("Error declining game:", error);
    }
  };

  const sendChatMessage = async ({
    message,
    competitionId,
    competitionType = COMPETITION_TYPES.LEAGUE,
  }: {
    message: {
      text: string;
      createdAt: Date;
      user: { _id: string; name: string; avatar?: string };
    };
    competitionId: string;
    competitionType?: string;
  }) => {
    const collectionRef =
      competitionType === COMPETITION_TYPES.TOURNAMENT
        ? "tournaments"
        : "leagues";
    try {
      const messageRef = doc(
        collection(db, collectionRef, competitionId, "chat"),
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

  interface CompetitionWithPendingInvites {
    pendingInvites?: PendingInvites[];
  }

  const getPendingInviteUsers = async (
    competition: CompetitionWithPendingInvites,
  ): Promise<UserProfile[]> => {
    const pendingUserData: UserProfile[] = [];

    for (const invite of competition.pendingInvites || []) {
      const userDoc = await getDoc(doc(db, "users", invite.userId));
      if (userDoc.exists()) {
        pendingUserData.push(userDoc.data() as UserProfile);
      }
    }

    return pendingUserData;
  };

  const removePendingInvite = async (
    competitionId: string,
    userId: string,
    collectionName: CollectionName,
  ) => {
    const competitionRef = doc(db, collectionName, competitionId);
    const competitionSnap = await getDoc(competitionRef);
    const competitionData = competitionSnap.data();

    const updatedPending = competitionData?.pendingInvites?.filter(
      (invite: { userId: string }) => invite.userId !== userId,
    );

    await updateDoc(competitionRef, { pendingInvites: updatedPending });
  };

  const assignCompetitionAdmin = async ({
    competitionId,
    collectionName,
    user,
  }: {
    competitionId: string;
    collectionName: string;
    user: { userId: string; username: string };
  }): Promise<void> => {
    const config =
      collectionName === COLLECTION_NAMES.leagues
        ? COMPETITION_CONFIG.league
        : COMPETITION_CONFIG.tournament;

    const competitionRef = doc(db, collectionName, competitionId);
    const competitionSnap = await getDoc(competitionRef);
    const competitionData = competitionSnap.data();

    const updatedAdmins: CompetitionAdmins[] = [
      ...(competitionData?.[config.adminsKey] || []),
      { userId: user.userId, username: user.username },
    ];

    await updateDoc(competitionRef, { [config.adminsKey]: updatedAdmins });
  };

  const revokeCompetitionAdmin = async ({
    competitionId,
    collectionName,
    userId,
  }: {
    competitionId: string;
    collectionName: string;
    userId: string;
  }): Promise<void> => {
    const config =
      collectionName === COLLECTION_NAMES.leagues
        ? COMPETITION_CONFIG.league
        : COMPETITION_CONFIG.tournament;

    const competitionRef = doc(db, collectionName, competitionId);
    const competitionSnap = await getDoc(competitionRef);
    const competitionData = competitionSnap.data();

    const updatedAdmins = (competitionData?.[config.adminsKey] || []).filter(
      (admin: CompetitionAdmins) => admin.userId !== userId,
    );

    await updateDoc(competitionRef, { [config.adminsKey]: updatedAdmins });
  };

  // REMOVE PLAYER FROM LEAGUE
  interface RemovedParticipant {
    profile: ScoreboardProfile;
    removedAt: Date;
    reason: string;
  }

  const removePlayerFromCompetition = async ({
    competitionId,
    collectionName,
    userId,
    reason,
  }: {
    competitionId: string;
    collectionName: string;
    userId: string;
    reason: string;
  }): Promise<void> => {
    const config =
      collectionName === COLLECTION_NAMES.leagues
        ? COMPETITION_CONFIG.league
        : COMPETITION_CONFIG.tournament;

    console.log(
      `Removing user ${userId} from ${collectionName} ${competitionId} for reason: ${reason}`,
    );

    const competitionRef = doc(db, collectionName, competitionId);
    const competitionSnap = await getDoc(competitionRef);
    const competitionData = competitionSnap.data();

    const removedParticipant = (
      competitionData?.[config.participantsKey] || []
    ).find((participant: ScoreboardProfile) => participant.userId === userId);

    const removedParticipants: RemovedParticipant[] = [
      ...(competitionData?.removedParticipants || []),
      { profile: removedParticipant, removedAt: new Date(), reason },
    ];

    await updateDoc(competitionRef, {
      [config.participantsKey]: (
        competitionData?.[config.participantsKey] || []
      ).filter(
        (participant: ScoreboardProfile) => participant.userId !== userId,
      ),
      [config.adminsKey]: (competitionData?.[config.adminsKey] || []).filter(
        (admin: CompetitionAdmins) => admin.userId !== userId,
      ),
      participantIds: arrayRemove(userId),
      removedParticipants,
    });
    await sendNotification({
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: userId,
      senderId: competitionData?.[config.ownerKey].userId,
      message: `You have been removed from ${competitionData?.[config.nameField]} for the following reason: ${reason}`,
      type: config.informationType,
      data: { [config.paramKey]: competitionId },
    });
  };

  const fetchUserPendingRequests = async (userId: string) => {
    try {
      const [leaguesSnap, tournamentsSnap] = await Promise.all([
        getDocs(collection(db, "leagues")),
        getDocs(collection(db, "tournaments")),
      ]);

      const leagues = leaguesSnap.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              collectionName: "leagues",
              ...doc.data(),
            }) as {
              id: string;
              collectionName: CollectionName;
              pendingRequests?: PendingRequests[];
            },
        )
        .filter((l) => l.pendingRequests?.some((p) => p.userId === userId));

      const tournaments = tournamentsSnap.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              collectionName: "tournaments",
              ...doc.data(),
            }) as {
              id: string;
              collectionName: CollectionName;
              pendingRequests?: PendingRequests[];
            },
        )
        .filter((t) => t.pendingRequests?.some((p) => p.userId === userId));

      return [...leagues, ...tournaments];
    } catch (err) {
      console.error("Failed to fetch pending requests", err);
      return [];
    }
  };

  // Withdraw user request from a league
  interface WithdrawJoinRequestParams {
    competitionId: string;
    userId: string;
    collectionName?: CollectionName;
  }

  const withdrawJoinRequest = async ({
    competitionId,
    userId,
    collectionName = "leagues",
  }: WithdrawJoinRequestParams): Promise<void> => {
    try {
      const competitionRef = doc(db, collectionName, competitionId);
      const competitionSnap = await getDoc(competitionRef);

      if (!competitionSnap.exists()) return;

      const pendingRequests = competitionSnap.data().pendingRequests || [];
      const updatedPending = pendingRequests.filter(
        (req: PendingRequests) => req.userId !== userId,
      );

      await updateDoc(competitionRef, { pendingRequests: updatedPending });
    } catch (error) {
      console.error("Error withdrawing join request:", error);
    }
  };

  // Mocks
  // const generateNewLeagueParticipants = async (number, leagueId) => {
  //   const newPlayers = Array.from({ length: number }, (_, i) => {
  //     const userId = generateUniqueUserId();
  //     const username = `player${i + 1}`;
  //     const memberSince = moment().format("MMM YYYY");

  //     return {
  //       username,
  //       userId,
  //       memberSince,
  //       ...JSON.parse(JSON.stringify(scoreboardProfileSchema)),
  //     };
  //   });

  //   try {
  //     // Add each player to 'users' collection
  //     for (const player of newPlayers) {
  //       const userDoc = {
  //         ...userProfileSchema,
  //         userId: player.userId,
  //         username: player.username,
  //         firstName: `First${player.username}`,
  //         lastName: `Last${player.username}`,
  //         email: `${player.username}@example.com`,
  //         profileDetail: {
  //           ...profileDetailSchema,
  //           lastActive: player.memberSince,
  //         },
  //       };

  //       await setDoc(doc(db, "users", player.userId), userDoc);
  //     }

  //     // Add newPlayers to league
  //     const leagueRef = doc(db, "leagues", leagueId);
  //     const leagueSnap = await getDoc(leagueRef);

  //     if (!leagueSnap.exists()) {
  //       throw new Error("League does not exist!");
  //     }

  //     const existingParticipants = leagueSnap.data().leagueParticipants || [];

  //     await updateDoc(leagueRef, {
  //       leagueParticipants: [...existingParticipants, ...newPlayers],
  //     });

  //     console.log(
  //       `✅ Added ${number} players to league '${leagueId}' and users collection.`,
  //     );
  //   } catch (err) {
  //     console.error("❌ Error writing to Firestore:", err);
  //   }
  // };

  const addTournamentFixtures = async ({
    tournamentId,
    fixtures,
    initialTeams,
    numberOfCourts,
    currentUser,
    mode,
    generationType,
  }: {
    tournamentId: string;
    fixtures: Fixtures[];
    initialTeams?: TeamStats[];
    numberOfCourts: number;
    currentUser: UserProfile;
    mode: string;
    generationType: string;
  }) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);

      const tournamentData = tournamentSnap.data();
      const tournamentParticipants =
        tournamentData?.tournamentParticipants || [];
      const tournamentName = tournamentData?.tournamentName;

      const numberOfGames = fixtures.reduce(
        (total, round) => total + round.games.length,
        0,
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
        ...(initialTeams?.length && { tournamentTeams: initialTeams }),
      });

      for (const participant of tournamentParticipants) {
        const userId = participant.userId;
        if (userId === currentUser.userId) continue;

        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: userId,
          senderId: tournamentData?.tournamentOwner.userId,
          message: `Game fixtures generated for ${tournamentName}! Check out your upcoming matches.`,
          type: notificationTypes.INFORMATION.TOURNAMENT.TYPE,
          data: {
            tournamentId,
          },
        };
        await sendPushNotification(payload);
      }

      console.log("Fixtures successfully written to database");
      AppEventsLogger.logEvent("GeneratedFixtures", {
        number_of_games: numberOfGames,
        number_of_courts: numberOfCourts,
        generation_type: generationType,
        mode,
      });
      return { success: true };
    } catch (error) {
      console.error("Error writing fixtures to database:", error);
      throw error;
    }
  };

  const updateTournamentGame = async ({
    tournamentId,
    gameId,
    updatedGame,
    removeGame = false,
  }: {
    tournamentId: string;
    gameId: string;
    updatedGame: Game;
    removeGame?: boolean;
  }) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);

      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);

        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found");
        }

        const tournamentData = tournamentDoc.data();
        const fixtures = tournamentData.fixtures || [];

        // Find the current game
        let currentGame = null;
        for (const round of fixtures) {
          const found = round.games?.find(
            (game: Game) => game.gameId === gameId,
          );
          if (found) {
            currentGame = found;
            break;
          }
        }

        if (!currentGame) {
          throw new Error("Game not found in tournament fixtures");
        }

        // Check race conditions based on what we're trying to do
        let updatedFixtures;

        if (removeGame) {
          updatedFixtures = fixtures.map((round: Fixtures) => ({
            ...round,
            games: round.games.filter((game: Game) => game.gameId !== gameId),
          }));
        } else {
          const newStatus = updatedGame.approvalStatus;

          if (
            (newStatus === "Pending" || newStatus === "pending") &&
            currentGame.approvalStatus !== "Scheduled"
          ) {
            throw new Error(
              "This game has already been reported. Please refresh to see the latest status.",
            );
          }

          if (
            (newStatus === "approved" || newStatus === "declined") &&
            currentGame.approvalStatus !== "Pending" &&
            currentGame.approvalStatus !== "pending" &&
            currentGame.approvalStatus !== "Scheduled"
          ) {
            throw new Error("This game has already been processed.");
          }

          updatedFixtures = fixtures.map((round: Fixtures) => ({
            ...round,
            games: round.games.map((game: Game) =>
              game.gameId === gameId ? updatedGame : game,
            ),
          }));
        }

        transaction.update(tournamentRef, {
          fixtures: updatedFixtures,
          lastUpdated: new Date(),
        });
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating tournament game:", error);
      throw error;
    }
  };

  const fetchTournamentParticipants = async (tournamentId: string) => {
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

  const deleteCompetition = useCallback(
    async (collectionName: CollectionName, competitionId: string) => {
      try {
        const competitionRef = doc(db, collectionName, competitionId);
        await deleteDoc(competitionRef);
      } catch (error) {
        console.error("Error deleting competition:", error);
        throw error;
      }
    },
    [],
  );

  const deleteCompetitionFixtures = async (
    tournamentId: string,
  ): Promise<void> => {
    const tournamentRef = doc(db, COLLECTION_NAMES.tournaments, tournamentId);

    await updateDoc(tournamentRef, {
      fixtures: [],
      fixturesGenerated: false,
      numberOfGames: 0,
      gamesCompleted: 0,
      tournamentTeams: [], // ← clear teams on delete
    });

    console.log("Tournament fixtures deleted successfully!");
  };

  const subscribeToCompetition = (
    competitionId: string,
    collectionName: CollectionName,
    onUpdate: (data: League | Tournament | null) => void,
    onError?: (error: Error) => void,
  ): (() => void) => {
    const competitionRef = doc(db, collectionName, competitionId);
    return onSnapshot(
      competitionRef,
      (snapshot) =>
        onUpdate(
          snapshot.exists() ? (snapshot.data() as League | Tournament) : null,
        ),
      onError,
    );
  };

  const checkVideoSaved = async ({
    videoId,
    userId,
  }: {
    videoId: string;
    userId: string;
  }): Promise<boolean> => {
    const docId = `${videoId}_${userId}`;
    const snap = await getDoc(doc(db, COLLECTION_NAMES.savedVideos, docId));
    return snap.exists();
  };

  const toggleSaveVideo = async ({
    videoId,
    userId,
    username,
    video,
  }: {
    videoId: string;
    userId: string;
    username: string;
    video: GameVideo;
  }): Promise<boolean> => {
    const docId = `${videoId}_${userId}`;
    const docRef = doc(db, COLLECTION_NAMES.savedVideos, docId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      await deleteDoc(docRef);
      return false;
    }

    await setDoc(docRef, {
      videoId,
      savedBy: { userId, username },
      gameId: video.gameId,
      videoUrl: video.videoUrl,
      competitionId: video.competitionId,
      competitionName: video.competitionName,
      gamescore: video.gamescore,
      date: video.date,
      teams: video.teams,
      postedBy: video.postedBy,
      savedAt: new Date(),
    });
    return true;
  };

  const saveVideoCourtPositions = async ({
    videoId,
    userId,
    courtPositions,
  }: {
    videoId: string;
    userId: string;
    courtPositions: SelectedPlayers;
  }): Promise<void> => {
    const videoRef = doc(db, COLLECTION_NAMES.gameVideos, videoId);
    await updateDoc(videoRef, { courtPositions, courtPositionsSetBy: userId });
  };
  return (
    <LeagueContext.Provider
      value={{
        // Playtime Management
        addPlaytime,
        deletePlaytime,

        // League Data Management
        addCompetition,
        addClub,
        updateCompetition, // Exposing the updateCompetition function
        fetchLeagues,
        fetchUpcomingLeagues,
        fetchCompetitionById,
        getCourts,
        addCourt,
        updatePendingInvites,
        getPendingInviteUsers,
        removePendingInvite,
        assignCompetitionAdmin,
        revokeCompetitionAdmin,
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
        fetchTournaments,
        deleteCompetitionFixtures,

        // League State Management
        upcomingLeagues,
        leagueById,
        leagueNavigationId,
        setLeagueNavigationId,
        clubById,
        clubNavigationId,
        fetchClubById,
        upcomingClubs,
        upcomingClubsLoading,
        fetchUpcomingClubs,
        removePlayerFromCompetition,
        acceptCompetitionInvite,
        declineCompetitionInvite,
        addPlayersToCompetition,
        acceptClubInvite,
        declineClubInvite,
        requestToJoinClub,
        acceptClubJoinRequest,
        declineClubJoinRequest,
        requestToJoinLeague,
        acceptCompetitionJoinRequest,
        declineCompetitionJoinRequest,
        approveGame,
        declineGame,

        // Mock Data Management
        setShowMockData,
        showMockData,
        // generateNewLeagueParticipants,

        // League Description Management
        handleLeagueDescription,

        // Competition Deletion
        deleteCompetition,

        // Competition Subscription
        subscribeToCompetition,

        // Video Management
        checkVideoSaved,
        toggleSaveVideo,
        saveVideoCourtPositions,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export { LeagueContext, LeagueProvider };
