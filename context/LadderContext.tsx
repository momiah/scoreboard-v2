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
  notificationTypes,
  LADDER_MATCH_STATUS,
} from "@shared";
import { calculatePlayerPerformance } from "@shared/helpers";
import type {
  Ladder,
  LadderMatch,
  LadderMatchInput,
  Game,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "@shared/types";
import { buildLadderParticipant } from "../helpers/ladderParticipants";
import type { LadderJoinUser } from "../helpers/ladderParticipants";
import { buildLadderMatchDocument } from "../helpers/ladderMatchDocument";
import { assertGameTransition } from "../helpers/assertGameTransition";
import {
  resolveLadderMatchOutcome,
  teamUserIds,
} from "../helpers/ladderMatchResult";
import type {
  LadderContextType,
  FetchLaddersOptions,
  LadderJoinOutcome,
  CreateLadderMatchOutcome,
  AcceptLadderMatchOutcome,
  CheckInLadderMatchOutcome,
  UpdateLadderGameOutcome,
  ApproveLadderGameOutcome,
} from "./types/LadderContextType";

class AcceptLadderMatchError extends Error {}
class CheckInLadderMatchError extends Error {}
class ApproveLadderGameError extends Error {}

const APPROVED_GAME = notificationTypes.RESPONSE.APPROVED_GAME;
// Ladder singles need a single opponent approval. Doubles will raise this to 2
// once doubles matchmaking exists (see the doubles block in approveLadderGame).
const LADDER_SINGLES_APPROVAL_LIMIT = 1;

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
      if (!ladderId || !matchId || !updatedGame?.gameId) {
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
            (game) => game.gameId === updatedGame.gameId,
          );

          if (index === -1) {
            throw new Error("Game not found in ladder match");
          }

          assertGameTransition(
            games[index].approvalStatus,
            updatedGame.approvalStatus,
          );

          // Firestore rejects undefined field values; ladder shells omit
          // tournament-only fields (court/createdAt/createdTime), so drop any
          // undefined keys before writing.
          const sanitizedGame = Object.fromEntries(
            Object.entries(updatedGame).filter(
              ([, value]) => value !== undefined,
            ),
          ) as Game;

          const nextGames = [...games];
          nextGames[index] = sanitizedGame;

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

  const approveLadderGame = useCallback(
    async ({
      ladderId,
      matchId,
      gameId,
      userId,
      approver,
    }: {
      ladderId: string;
      matchId: string;
      gameId: string;
      userId: string;
      approver: { userId: string; username: string };
    }): Promise<ApproveLadderGameOutcome> => {
      if (!ladderId || !matchId || !gameId || !userId) {
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
        let fullyApproved = false;
        let matchCompleted = false;

        await runTransaction(db, async (transaction) => {
          // ── Reads (Firestore requires every read before any write) ──
          const matchSnap = await transaction.get(matchRef);
          if (!matchSnap.exists()) {
            throw new Error("Ladder match not found");
          }

          const match = matchSnap.data() as LadderMatch;
          const games = match.games ?? [];
          const index = games.findIndex((g) => g.gameId === gameId);
          if (index === -1) {
            throw new Error("Game not found in ladder match");
          }

          const game = games[index];

          // Already scored, or this user already approved → nothing to do.
          if (game.approvalStatus === APPROVED_GAME) {
            throw new ApproveLadderGameError("already been processed");
          }
          if ((game.approvers ?? []).some((a) => a.userId === userId)) {
            throw new ApproveLadderGameError("already been processed");
          }

          const updatedGame: Game = {
            ...game,
            numberOfApprovals: (game.numberOfApprovals ?? 0) + 1,
            approvers: [...(game.approvers ?? []), approver],
          };
          fullyApproved =
            updatedGame.numberOfApprovals >= LADDER_SINGLES_APPROVAL_LIMIT;

          const playerUserIds = [
            game.team1.player1?.userId,
            game.team1.player2?.userId,
            game.team2.player1?.userId,
            game.team2.player2?.userId,
          ].filter((id): id is string => Boolean(id));

          // Only read participant/global-user docs when we're about to score.
          let participants: ScoreboardProfile[] = [];
          let users: UserProfile[] = [];
          if (fullyApproved) {
            const participantSnaps = await Promise.all(
              playerUserIds.map((uid) =>
                transaction.get(
                  doc(
                    db,
                    LADDERS_COLLECTION,
                    ladderId,
                    LADDER_PARTICIPANTS_COLLECTION,
                    uid,
                  ),
                ),
              ),
            );
            participants = participantSnaps
              .filter((snap) => snap.exists())
              .map((snap) => snap.data() as ScoreboardProfile);

            const userSnaps = await Promise.all(
              playerUserIds.map((uid) =>
                transaction.get(doc(db, "users", uid)),
              ),
            );
            users = userSnaps
              .filter((snap) => snap.exists())
              .map((snap) => snap.data() as UserProfile);
          }

          // ── Writes ──
          if (fullyApproved) {
            updatedGame.approvalStatus = APPROVED_GAME;
          }

          const nextGames = [...games];
          nextGames[index] = updatedGame;

          const matchUpdate: Record<string, unknown> = {
            games: nextGames,
            lastUpdated: new Date(),
          };

          if (fullyApproved) {
            // Per-game performance: mutates the ladder participants (per-ladder
            // CP + stats) and the global user profileDetail (rank-medal XP).
            calculatePlayerPerformance(updatedGame, participants, users);

            // Recent form: push the match result once, when the match is first
            // decided (best-of clinched).
            const alreadyCompleted =
              match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
            const outcome = resolveLadderMatchOutcome(
              nextGames,
              match.bestOf ?? nextGames.length,
            );
            if (!alreadyCompleted && outcome.decided && outcome.winnerTeam) {
              const winnerIds = teamUserIds(updatedGame, outcome.winnerTeam);
              participants.forEach((p) => {
                const won = p.userId ? winnerIds.includes(p.userId) : false;
                p.matchResultLog = [
                  ...(p.matchResultLog ?? []),
                  won ? "W" : "L",
                ].slice(-20);
              });
              matchUpdate.matchStatus = LADDER_MATCH_STATUS.COMPLETED;
              matchCompleted = true;
            }

            // Persist per-ladder participant docs.
            participants.forEach((p) => {
              if (!p.userId) return;
              transaction.set(
                doc(
                  db,
                  LADDERS_COLLECTION,
                  ladderId,
                  LADDER_PARTICIPANTS_COLLECTION,
                  p.userId,
                ),
                p,
              );
            });

            // Persist global profileDetail (rank medal XP + streaks).
            users.forEach((u) => {
              if (!u.userId) return;
              transaction.update(doc(db, "users", u.userId), {
                profileDetail: u.profileDetail,
              });
            });

            // ── DOUBLES (write + flag for later) ───────────────────────────
            // Doubles matchmaking doesn't exist yet (singles cap = 2), so this
            // is unreachable today. When doubles ships, raise the approval limit
            // to 2, recompute team stats and mirror them to both the ladder
            // subcollection and the root `teams` collection:
            //
            // const teamSnaps = await Promise.all(
            //   teamKeys.map((key) =>
            //     transaction.get(
            //       doc(db, LADDERS_COLLECTION, ladderId, LADDER_TEAMS_COLLECTION, key),
            //     ),
            //   ),
            // );
            // const allTeams = teamSnaps
            //   .filter((snap) => snap.exists())
            //   .map((snap) => snap.data() as TeamStats);
            // const [winnerTeam, loserTeam] = await calculateTeamPerformance({
            //   game: updatedGame,
            //   allTeams,
            // });
            // [winnerTeam, loserTeam].forEach((team) => {
            //   transaction.set(
            //     doc(db, LADDERS_COLLECTION, ladderId, LADDER_TEAMS_COLLECTION, team.teamKey),
            //     team,
            //   );
            //   transaction.set(doc(db, "teams", team.teamKey), team);
            // });
          }

          transaction.update(matchRef, matchUpdate);
        });

        return { success: true, fullyApproved, matchCompleted };
      } catch (error) {
        if (error instanceof ApproveLadderGameError) {
          return { success: false, reason: "unavailable" };
        }
        console.error("Error approving ladder game:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  // ── Reject a ladder game (ready to implement) ─────────────────────────────
  // The decline path mirrors updateLadderGame's transition guard: mark the game
  // declined so the reporter can re-report. Wire this up alongside a "Decline"
  // action in GameApprovalModal when the reject flow is built out.
  //
  // const declineLadderGame = useCallback(
  //   async ({ ladderId, matchId, gameId, userId }: {
  //     ladderId: string; matchId: string; gameId: string; userId: string;
  //   }): Promise<ApproveLadderGameOutcome> => {
  //     const matchRef = doc(db, LADDERS_COLLECTION, ladderId, LADDER_MATCHES_COLLECTION, matchId);
  //     try {
  //       await runTransaction(db, async (transaction) => {
  //         const snap = await transaction.get(matchRef);
  //         if (!snap.exists()) throw new Error("Ladder match not found");
  //         const match = snap.data() as LadderMatch;
  //         const games = match.games ?? [];
  //         const index = games.findIndex((g) => g.gameId === gameId);
  //         if (index === -1) throw new Error("Game not found in ladder match");
  //         const nextGames = [...games];
  //         // Reset the game shell so the reporter can submit again.
  //         nextGames[index] = {
  //           ...games[index],
  //           approvalStatus: notificationTypes.RESPONSE.REJECTED_GAME,
  //           numberOfDeclines: (games[index].numberOfDeclines ?? 0) + 1,
  //         };
  //         transaction.update(matchRef, { games: nextGames, lastUpdated: new Date() });
  //       });
  //       return { success: true };
  //     } catch (error) {
  //       console.error("Error declining ladder game:", error);
  //       return { success: false, reason: "error" };
  //     }
  //   },
  //   [],
  // );

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
        approveLadderGame,
        addCourtToLadder,
      }}
    >
      {children}
    </LadderContext.Provider>
  );
};

export default LadderProvider;
