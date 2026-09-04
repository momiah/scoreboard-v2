import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  DocumentReference,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import {
  normalizeLadderStatus,
  canAcceptLadderMatch,
  buildAcceptedLadderMatch,
  addLadderMatchCheckIn,
  getLadderCheckedInUserIds,
} from "@shared";
import type {
  Ladder,
  LadderMatch,
  LadderMatchInput,
  Game,
  ScoreboardProfile,
  TeamStats,
} from "@shared/types";
import { buildLadderParticipant } from "../helpers/ladderParticipants";
import type { LadderJoinUser } from "../helpers/ladderParticipants";
import { buildLadderMatchDocument } from "../helpers/ladderMatchDocument";
import { assertGameTransition } from "../helpers/assertGameTransition";
import type {
  LadderContextType,
  FetchLaddersOptions,
  LadderJoinOutcome,
  CreateLadderMatchOutcome,
  AcceptLadderMatchOutcome,
  CheckInLadderMatchOutcome,
  UpdateLadderGameOutcome,
} from "./types/LadderContextType";

class AcceptLadderMatchError extends Error {}
class CheckInLadderMatchError extends Error {}

const LADDERS_COLLECTION = "ladders";
const LADDER_MATCHES_COLLECTION = "ladderMatches";
const LADDER_PARTICIPANTS_COLLECTION = "ladderParticipants";
const LADDER_TEAMS_COLLECTION = "ladderTeams";

export const LadderContext = createContext<LadderContextType>(
  {} as LadderContextType,
);

const LadderProvider = ({ children }: { children: ReactNode }) => {
  const [upcomingLadders, setUpcomingLadders] = useState<Ladder[]>([]);
  const [upcomingLaddersLoading, setUpcomingLaddersLoading] = useState(false);
  const [ladderById, setLadderById] = useState<Ladder | null>(null);
  const [joinedLadderIds, setJoinedLadderIds] = useState<string[]>([]);

  const fetchLadders = useCallback(
    async ({
      numberToLoad = 30,
      countryCode = null,
    }: FetchLaddersOptions = {}): Promise<Ladder[]> => {
      try {
        const ref = collection(db, LADDERS_COLLECTION);
        const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

        if (countryCode) {
          constraints.push(where("countryCode", "==", countryCode));
        }
        if (numberToLoad) {
          constraints.push(limit(numberToLoad));
        }

        const snapshot = await getDocs(query(ref, ...constraints));
        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            ladderId: docSnap.id,
            ...data,
            status: normalizeLadderStatus(data.status as string | undefined),
          } as Ladder;
        });
      } catch (error) {
        console.error("Error fetching ladders:", error);
        return [];
      }
    },
    [],
  );

  const fetchUpcomingLadders = useCallback(async () => {
    setUpcomingLaddersLoading(true);
    try {
      const ladders = await fetchLadders({ numberToLoad: 30 });
      setUpcomingLadders(ladders);
    } finally {
      setUpcomingLaddersLoading(false);
    }
  }, [fetchLadders]);

  const fetchLadderById = useCallback(
    async (ladderId: string): Promise<Ladder | null> => {
      try {
        const ladderDoc = await getDoc(doc(db, LADDERS_COLLECTION, ladderId));
        if (!ladderDoc.exists()) {
          setLadderById(null);
          return null;
        }
        const data = ladderDoc.data();
        const ladder = {
          ladderId: ladderDoc.id,
          ...data,
          status: normalizeLadderStatus(data.status as string | undefined),
        } as Ladder;
        setLadderById(ladder);
        return ladder;
      } catch (error) {
        console.error("Error fetching ladder:", error);
        setLadderById(null);
        return null;
      }
    },
    [],
  );

  const joinLadder = useCallback(
    async (
      ladderId: string,
      user: LadderJoinUser,
    ): Promise<LadderJoinOutcome> => {
      if (!ladderId || !user?.userId) {
        return { success: false, alreadyJoined: false };
      }

      try {
        const ladderRef = doc(db, LADDERS_COLLECTION, ladderId);
        const participantRef = doc(
          db,
          LADDERS_COLLECTION,
          ladderId,
          LADDER_PARTICIPANTS_COLLECTION,
          user.userId,
        );

        const existing = await getDoc(participantRef);
        if (existing.exists()) {
          setJoinedLadderIds((prev) =>
            prev.includes(ladderId) ? prev : [...prev, ladderId],
          );
          return { success: true, alreadyJoined: true };
        }

        const batch = writeBatch(db);
        batch.set(participantRef, buildLadderParticipant(user));
        batch.update(ladderRef, { participantCount: increment(1) });
        await batch.commit();

        setJoinedLadderIds((prev) =>
          prev.includes(ladderId) ? prev : [...prev, ladderId],
        );
        setLadderById((prev) =>
          prev && prev.ladderId === ladderId
            ? { ...prev, participantCount: (prev.participantCount ?? 0) + 1 }
            : prev,
        );

        return { success: true, alreadyJoined: false };
      } catch (error) {
        console.error("Error joining ladder:", error);
        return { success: false, alreadyJoined: false };
      }
    },
    [],
  );

  const checkLadderMembership = useCallback(
    async (ladderId: string, userId: string): Promise<boolean> => {
      if (!ladderId || !userId) return false;
      try {
        const participantRef = doc(
          db,
          LADDERS_COLLECTION,
          ladderId,
          LADDER_PARTICIPANTS_COLLECTION,
          userId,
        );
        const snap = await getDoc(participantRef);
        return snap.exists();
      } catch (error) {
        console.error("Error checking ladder membership:", error);
        return false;
      }
    },
    [],
  );

  const fetchLadderParticipants = useCallback(
    async (ladderId: string): Promise<ScoreboardProfile[]> => {
      if (!ladderId) return [];
      try {
        const snapshot = await getDocs(
          collection(
            db,
            LADDERS_COLLECTION,
            ladderId,
            LADDER_PARTICIPANTS_COLLECTION,
          ),
        );
        return snapshot.docs.map((docSnap) => docSnap.data() as ScoreboardProfile);
      } catch (error) {
        console.error("Error fetching ladder participants:", error);
        return [];
      }
    },
    [],
  );

  const addLadderTeam = useCallback(
    async (ladderId: string, team: TeamStats): Promise<boolean> => {
      if (!ladderId || !team?.teamKey) return false;
      try {
        const teamRef = doc(
          db,
          LADDERS_COLLECTION,
          ladderId,
          LADDER_TEAMS_COLLECTION,
          team.teamKey,
        );
        const existing = await getDoc(teamRef);
        const batch = writeBatch(db);
        batch.set(teamRef, team);
        if (!existing.exists()) {
          batch.update(doc(db, LADDERS_COLLECTION, ladderId), {
            participantCount: increment(1),
          });
        }
        await batch.commit();
        return true;
      } catch (error) {
        console.error("Error adding ladder team:", error);
        return false;
      }
    },
    [],
  );

  const fetchLadderTeams = useCallback(
    async (ladderId: string): Promise<TeamStats[]> => {
      if (!ladderId) return [];
      try {
        const snapshot = await getDocs(
          collection(db, LADDERS_COLLECTION, ladderId, LADDER_TEAMS_COLLECTION),
        );
        return snapshot.docs.map((docSnap) => docSnap.data() as TeamStats);
      } catch (error) {
        console.error("Error fetching ladder teams:", error);
        return [];
      }
    },
    [],
  );

  const createLadderMatch = useCallback(
    async (
      ladderId: string,
      input: LadderMatchInput,
      userId: string,
    ): Promise<CreateLadderMatchOutcome> => {
      if (!ladderId || !userId) {
        return { success: false, ladderMatch: null };
      }

      try {
        const matchesRef = collection(
          db,
          LADDERS_COLLECTION,
          ladderId,
          LADDER_MATCHES_COLLECTION,
        );
        const matchRef = doc(matchesRef);
        const document = buildLadderMatchDocument({
          input,
          userId,
          ladderMatchId: matchRef.id,
        });
        const ladderMatch: LadderMatch = {
          ladderMatchId: matchRef.id,
          ...document,
        };

        await setDoc(matchRef, ladderMatch);

        return { success: true, ladderMatch };
      } catch (error) {
        console.error("Error creating ladder match:", error);
        return { success: false, ladderMatch: null };
      }
    },
    [],
  );

  const addCourtToLadder = useCallback(
    async (ladderId: string, courtId: string): Promise<boolean> => {
      if (!ladderId || !courtId) return false;

      try {
        const ladderRef = doc(db, LADDERS_COLLECTION, ladderId);
        await updateDoc(ladderRef, { courtIds: arrayUnion(courtId) });

        setLadderById((prev) =>
          prev && prev.ladderId === ladderId
            ? {
                ...prev,
                courtIds: prev.courtIds?.includes(courtId)
                  ? prev.courtIds
                  : [...(prev.courtIds ?? []), courtId],
              }
            : prev,
        );

        return true;
      } catch (error) {
        console.error("Error adding court to ladder:", error);
        return false;
      }
    },
    [],
  );

  const fetchLadderMatches = useCallback(
    async (ladderId: string): Promise<LadderMatch[]> => {
      if (!ladderId) return [];

      try {
        const matchesRef = collection(
          db,
          LADDERS_COLLECTION,
          ladderId,
          LADDER_MATCHES_COLLECTION,
        );
        const snapshot = await getDocs(
          query(matchesRef, orderBy("createdAt", "desc")),
        );
        return snapshot.docs.map(
          (docSnap) =>
            ({
              ...docSnap.data(),
              ladderMatchId: docSnap.id,
            }) as LadderMatch,
        );
      } catch (error) {
        console.error("Error fetching ladder matches:", error);
        return [];
      }
    },
    [],
  );

  const subscribeToLadderMatches = useCallback(
    (
      ladderId: string,
      onUpdate: (matches: LadderMatch[]) => void,
      onError?: (error: Error) => void,
    ): (() => void) => {
      if (!ladderId) {
        onUpdate([]);
        return () => {};
      }

      const matchesRef = collection(
        db,
        LADDERS_COLLECTION,
        ladderId,
        LADDER_MATCHES_COLLECTION,
      );

      return onSnapshot(
        query(matchesRef, orderBy("createdAt", "desc")),
        (snapshot) =>
          onUpdate(
            snapshot.docs.map(
              (docSnap) =>
                ({
                  ...docSnap.data(),
                  ladderMatchId: docSnap.id,
                }) as LadderMatch,
            ),
          ),
        (error) => {
          console.error("Error subscribing to ladder matches:", error);
          onError?.(error);
        },
      );
    },
    [],
  );

  const acceptLadderMatch = useCallback(
    async (
      ladderId: string,
      matchId: string,
      userId: string,
    ): Promise<AcceptLadderMatchOutcome> => {
      if (!ladderId || !matchId || !userId) {
        return { success: false };
      }

      const matchRef = doc(
        db,
        LADDERS_COLLECTION,
        ladderId,
        LADDER_MATCHES_COLLECTION,
        matchId,
      ) as DocumentReference<LadderMatch, LadderMatch>;

      try {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(matchRef);
          if (!snap.exists()) {
            throw new AcceptLadderMatchError("MATCH_NOT_FOUND");
          }

          const match: LadderMatch = {
            ...snap.data(),
            ladderMatchId: snap.id,
          };

          if (!canAcceptLadderMatch(match, userId)) {
            throw new AcceptLadderMatchError("CANNOT_ACCEPT");
          }

          transaction.update(matchRef, buildAcceptedLadderMatch(match, userId));
        });

        return { success: true };
      } catch (error) {
        if (error instanceof AcceptLadderMatchError) {
          return { success: false, reason: "unavailable" };
        }
        console.error("Error accepting ladder match:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  const checkInLadderMatch = useCallback(
    async (
      ladderId: string,
      matchId: string,
      userId: string,
    ): Promise<CheckInLadderMatchOutcome> => {
      if (!ladderId || !matchId || !userId) {
        return { success: false, reason: "error" };
      }

      const matchRef = doc(
        db,
        LADDERS_COLLECTION,
        ladderId,
        LADDER_MATCHES_COLLECTION,
        matchId,
      ) as DocumentReference<LadderMatch, LadderMatch>;

      try {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(matchRef);
          if (!snap.exists()) {
            throw new CheckInLadderMatchError("MATCH_NOT_FOUND");
          }

          const match: LadderMatch = {
            ...snap.data(),
            ladderMatchId: snap.id,
          };

          if (!match.acceptedBy) {
            throw new CheckInLadderMatchError("NOT_ACCEPTED");
          }
          if (!match.participants.includes(userId)) {
            throw new CheckInLadderMatchError("NOT_A_PARTICIPANT");
          }
          if (getLadderCheckedInUserIds(match).includes(userId)) {
            return;
          }

          transaction.update(matchRef as DocumentReference, {
            checkIn: addLadderMatchCheckIn(match, userId),
          });
        });

        return { success: true };
      } catch (error) {
        if (error instanceof CheckInLadderMatchError) {
          return { success: false, reason: "unavailable" };
        }
        console.error("Error checking in ladder match:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  // Mutual check-in handshake: one participant scans another's QR, which checks
  // in BOTH the scanner and the QR's owner at once — so no one is marked present
  // just for displaying their code. Singles complete in one handshake; doubles
  // in two independent pairs. Guards on the match being accepted and both users
  // being participants; idempotent per user.
  const checkInLadderMatchHandshake = useCallback(
    async (
      ladderId: string,
      matchId: string,
      scannerId: string,
      displayerId: string,
    ): Promise<CheckInLadderMatchOutcome> => {
      if (!ladderId || !matchId || !scannerId || !displayerId) {
        return { success: false, reason: "error" };
      }

      const matchRef = doc(
        db,
        LADDERS_COLLECTION,
        ladderId,
        LADDER_MATCHES_COLLECTION,
        matchId,
      ) as DocumentReference<LadderMatch, LadderMatch>;

      try {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(matchRef);
          if (!snap.exists()) {
            throw new CheckInLadderMatchError("MATCH_NOT_FOUND");
          }

          const match: LadderMatch = {
            ...snap.data(),
            ladderMatchId: snap.id,
          };

          if (!match.acceptedBy) {
            throw new CheckInLadderMatchError("NOT_ACCEPTED");
          }
          if (
            !match.participants.includes(scannerId) ||
            !match.participants.includes(displayerId)
          ) {
            throw new CheckInLadderMatchError("NOT_A_PARTICIPANT");
          }

          let checkIn = match.checkIn;
          for (const participantId of [scannerId, displayerId]) {
            checkIn = addLadderMatchCheckIn(
              { participants: match.participants, checkIn },
              participantId,
            );
          }

          transaction.update(matchRef as DocumentReference, { checkIn });
        });

        return { success: true };
      } catch (error) {
        if (error instanceof CheckInLadderMatchError) {
          return { success: false, reason: "unavailable" };
        }
        console.error("Error completing ladder match check-in:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  const updateLadderGame = useCallback(
    async ({
      ladderId,
      matchId,
      updatedGame,
    }: {
      ladderId: string;
      matchId: string;
      updatedGame: Game;
    }): Promise<UpdateLadderGameOutcome> => {
      // Games are located within a match by gameNumber (always present and
      // unique per match); gameId is the cross-app identity and is backfilled on
      // write so matches created before stable gameIds still publish correctly.
      if (!ladderId || !matchId || updatedGame?.gameNumber == null) {
        return { success: false, reason: "error" };
      }

      const matchRef = doc(
        db,
        LADDERS_COLLECTION,
        ladderId,
        LADDER_MATCHES_COLLECTION,
        matchId,
      );

      try {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(matchRef);
          if (!snap.exists()) {
            throw new Error("Ladder match not found");
          }

          const match = snap.data() as LadderMatch;
          const games = match.games ?? [];
          const index = games.findIndex(
            (game) => game.gameNumber === updatedGame.gameNumber,
          );

          if (index === -1) {
            throw new Error("Game not found in ladder match");
          }

          assertGameTransition(
            games[index].approvalStatus,
            updatedGame.approvalStatus,
          );

          const gameId =
            updatedGame.gameId ||
            games[index].gameId ||
            `${matchId}-g${updatedGame.gameNumber}`;

          const nextGames = [...games];
          nextGames[index] = { ...updatedGame, gameId };

          transaction.update(matchRef, {
            games: nextGames,
            lastUpdated: new Date(),
          });
        });

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const alreadyReported =
          message.includes("already been reported") ||
          message.includes("already been processed");
        if (alreadyReported) {
          return { success: false, reason: "unavailable" };
        }
        console.error("Error updating ladder game:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  useEffect(() => {
    fetchUpcomingLadders();
  }, [fetchUpcomingLadders]);

  return (
    <LadderContext.Provider
      value={{
        upcomingLadders,
        upcomingLaddersLoading,
        fetchUpcomingLadders,
        fetchLadders,
        ladderById,
        fetchLadderById,
        joinLadder,
        joinedLadderIds,
        checkLadderMembership,
        fetchLadderParticipants,
        addLadderTeam,
        fetchLadderTeams,
        createLadderMatch,
        fetchLadderMatches,
        subscribeToLadderMatches,
        acceptLadderMatch,
        checkInLadderMatch,
        checkInLadderMatchHandshake,
        updateLadderGame,
        addCourtToLadder,
      }}
    >
      {children}
    </LadderContext.Provider>
  );
};

export default LadderProvider;
