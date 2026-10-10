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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
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
  LADDER_TYPE,
  TEAM_STATUS,
  REPORTS_COLLECTION,
  LADDER_REPORT_COUNTS_COLLECTION,
  REPORT_STATUS,
  REPORT_REASONS,
  LADDER_PLAYOFF_TIES_COLLECTION,
} from "@shared";
import {
  createRootTeam,
  buildLadderParticipant,
  getReportableLadderGameId,
  isSelectableLadderCourt,
  planLadderGameApproval,
  isLadderMatchPlayFrozen,
} from "@shared/helpers";
import type { LadderJoinUser } from "@shared/helpers";
import type {
  Court,
  Ladder,
  LadderPlayoffTie,
  LadderMatch,
  LadderMatchInput,
  MatchTeam,
  Game,
  ScoreboardProfile,
  TeamStats,
  TeamMember,
  UserProfile,
  Report,
  ReportTarget,
  ReportReason,
  LadderReportCounts,
  StrikeCounts,
  CreateReportOutcome,
} from "@shared/types";
import {
  teamMemberIds,
  findLadderMemberConflicts,
} from "../helpers/ladderTeamMembership";
import { addMember, removeMember } from "../helpers/teamRoster";
import {
  LADDER_MATCH_CANCEL_ACTION,
  getLadderMatchCancelAction,
  getOpponentSideIds,
  getSameSideIds,
} from "../helpers/ladderMatchCancellation";
import {
  isLadderFinished,
  isTeamLockedInLadder,
  teamHasCompletedLadderGame,
  teamHasOpenLadderMatch,
} from "../helpers/teamLadderActivity";
import { buildLadderMatchDocument } from "../helpers/ladderMatchDocument";
import { assertGameTransition } from "../helpers/assertGameTransition";
import {
  getLadderRegistrationBlock,
  getTeamRegistrationBlock,
} from "../helpers/ladderRegistration";
import type {
  LadderContextType,
  FetchLaddersOptions,
  LadderJoinOutcome,
  AddLadderTeamFailureReason,
  AddLadderTeamOutcome,
  LadderJoinFailureReason,
  JoinLadderAsTeamOutcome,
  DisbandTeamOutcome,
  TeamLadderActivity,
  AcceptTeamJoinRequestOutcome,
  CreateTeamOutcome,
  CreateLadderMatchOutcome,
  AcceptLadderMatchOutcome,
  CheckInLadderMatchOutcome,
  UpdateLadderGameOutcome,
  CancelLadderMatchOutcome,
  LadderMatchCancellationOutcome,
  ApproveLadderGameOutcome,
  SetLadderHomeCourtOutcome,
  SetLadderHomeCourtFailureReason,
} from "./types/LadderContextType";
import {
  canChangeLadderHomeCourt,
  nextLadderHomeCourtChanges,
  toLadderHomeCourt,
} from "../helpers/ladderHomeCourt";
import type { LadderHomeCourtState } from "../helpers/ladderHomeCourt";

class AcceptLadderMatchError extends Error {}
class CheckInLadderMatchError extends Error {}
class LadderRegistrationError extends Error {
  constructor(
    public reason: AddLadderTeamFailureReason,
    public conflictUserIds: string[] = [],
  ) {
    super(reason);
  }
}
class ApproveLadderGameError extends Error {}
class ApproveLadderGameNotOpponentError extends Error {}
class ApproveLadderGameFrozenError extends Error {}
class LadderReportBlockedError extends Error {}
class SetLadderHomeCourtError extends Error {
  constructor(public reason: Exclude<SetLadderHomeCourtFailureReason, "error">) {
    super(reason);
  }
}

// Firestore rejects `undefined` field values, so drop them before a write.
const pruneUndefined = <T,>(value: T): T => {
  if (Array.isArray(value)) return value.map(pruneUndefined) as unknown as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, pruneUndefined(v)]),
    ) as T;
  }
  return value;
};

const LADDERS_COLLECTION = "ladders";
const LADDER_MATCHES_COLLECTION = "ladderMatches";
const LADDER_PARTICIPANTS_COLLECTION = "ladderParticipants";
const LADDER_TEAMS_COLLECTION = "ladderTeams";
const LADDER_MEMBERS_COLLECTION = "ladderMembers";
const TEAMS_COLLECTION = "teams";
const COURTS_COLLECTION = "courts";
const TEAM_REQUESTS_SUBCOLLECTION = "requests";

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

        const alreadyJoined = await runTransaction(db, async (transaction) => {
          const [ladderSnap, existing] = await Promise.all([
            transaction.get(ladderRef),
            transaction.get(participantRef),
          ]);
          if (!ladderSnap.exists()) throw new LadderRegistrationError("closed");
          if (existing.exists()) return true;
          const block = getLadderRegistrationBlock(
            ladderSnap.data(),
            Date.now(),
          );
          if (block) throw new LadderRegistrationError(block);

          transaction.set(participantRef, {
            ...buildLadderParticipant(user),
            joinedAt: serverTimestamp(),
          });
          transaction.update(ladderRef, { participantCount: increment(1) });
          return false;
        });

        if (alreadyJoined) {
          setJoinedLadderIds((prev) =>
            prev.includes(ladderId) ? prev : [...prev, ladderId],
          );
          return { success: true, alreadyJoined: true };
        }

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
        if (error instanceof LadderRegistrationError) {
          return {
            success: false,
            alreadyJoined: false,
            reason: error.reason as LadderJoinFailureReason,
          };
        }
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
        if (snap.exists()) return true;

        // Also count as a member when the user joined as part of a team.
        const teamSnap = await getDocs(
          query(
            collection(
              db,
              LADDERS_COLLECTION,
              ladderId,
              LADDER_TEAMS_COLLECTION,
            ),
            where("playerIds", "array-contains", userId),
            limit(1),
          ),
        );
        return !teamSnap.empty;
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
    async (ladderId: string, team: TeamStats): Promise<AddLadderTeamOutcome> => {
      if (!ladderId || !team?.teamKey) return { success: false };
      try {
        const ladderRef = doc(db, LADDERS_COLLECTION, ladderId);
        const teamRef = doc(
          db,
          LADDERS_COLLECTION,
          ladderId,
          LADDER_TEAMS_COLLECTION,
          team.teamKey,
        );
        const memberIds = teamMemberIds(team);
        const claimRefs = memberIds.map((userId) =>
          doc(db, LADDERS_COLLECTION, ladderId, LADDER_MEMBERS_COLLECTION, userId),
        );
        await runTransaction(db, async (transaction) => {
          const [ladderSnap, existing, ...claimSnaps] = await Promise.all([
            transaction.get(ladderRef),
            transaction.get(teamRef),
            ...claimRefs.map((ref) => transaction.get(ref)),
          ]);
          if (!ladderSnap.exists()) throw new LadderRegistrationError("closed");
          if (!existing.exists()) {
            const block = getLadderRegistrationBlock(
              ladderSnap.data(),
              Date.now(),
            );
            if (block) throw new LadderRegistrationError(block);
            const conflicts = memberIds.filter(
              (_, index) =>
                claimSnaps[index].exists() &&
                claimSnaps[index].data()?.teamKey !== team.teamKey,
            );
            if (conflicts.length > 0) {
              throw new LadderRegistrationError("member_conflict", conflicts);
            }
            claimRefs.forEach((ref, index) =>
              transaction.set(ref, {
                userId: memberIds[index],
                teamKey: team.teamKey,
                joinedAt: serverTimestamp(),
              }),
            );
          }
          transaction.set(teamRef, {
            ...team,
            joinedAt:
              (existing.exists()
                ? (existing.data() as TeamStats).joinedAt
                : undefined) ?? serverTimestamp(),
          });
          if (!existing.exists()) {
            transaction.update(ladderRef, { participantCount: increment(1) });
          }
        });
        return { success: true };
      } catch (error) {
        if (error instanceof LadderRegistrationError) {
          return {
            success: false,
            reason: error.reason,
            conflictUserIds: error.conflictUserIds,
          };
        }
        console.error("Error adding ladder team:", error);
        return { success: false };
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

  const createTeam = useCallback(
    async (
      creator: TeamMember,
      details: { teamName: string; teamProfilePic?: string },
    ): Promise<CreateTeamOutcome> => {
      if (!creator?.userId || !details?.teamName?.trim()) {
        return { success: false, team: null };
      }
      try {
        const teamId = doc(collection(db, TEAMS_COLLECTION)).id;
        const team = createRootTeam({
          players: [creator],
          createdBy: creator.userId,
          teamId,
          teamName: details.teamName,
          teamProfilePic: details.teamProfilePic,
          status: TEAM_STATUS.PENDING,
        });
        await setDoc(doc(db, TEAMS_COLLECTION, teamId), team);
        return { success: true, team };
      } catch (error) {
        console.error("Error creating team:", error);
        return { success: false, team: null };
      }
    },
    [],
  );

  const addTeamPartner = useCallback(
    async (teamId: string, partner: TeamMember): Promise<boolean> => {
      if (!teamId || !partner?.userId) return false;
      try {
        const teamRef = doc(db, TEAMS_COLLECTION, teamId);
        const snap = await getDoc(teamRef);
        if (!snap.exists()) return false;
        await updateDoc(teamRef, {
          ...addMember(snap.data() as TeamStats, partner),
          status: TEAM_STATUS.PENDING,
        });
        return true;
      } catch (error) {
        console.error("Error adding team partner:", error);
        return false;
      }
    },
    [],
  );

  const updateTeamProfilePic = useCallback(
    async (teamId: string, teamProfilePic: string): Promise<boolean> => {
      if (!teamId || !teamProfilePic) return false;
      try {
        await updateDoc(doc(db, TEAMS_COLLECTION, teamId), { teamProfilePic });
        return true;
      } catch (error) {
        console.error("Error updating team profile pic:", error);
        return false;
      }
    },
    [],
  );

  const acceptTeamJoinRequest = useCallback(
    async (
      teamId: string,
      requester: TeamMember,
    ): Promise<AcceptTeamJoinRequestOutcome> => {
      if (!teamId || !requester?.userId) {
        return { success: false, full: false };
      }
      try {
        const teamRef = doc(db, TEAMS_COLLECTION, teamId);
        const snap = await getDoc(teamRef);
        if (!snap.exists()) return { success: false, full: false };
        const team = snap.data() as TeamStats;
        if ((team.players ?? []).length >= 2) {
          return { success: false, full: true };
        }
        await updateDoc(teamRef, {
          ...addMember(team, requester),
          status: TEAM_STATUS.ACTIVE,
        });
        await deleteDoc(
          doc(
            db,
            TEAMS_COLLECTION,
            teamId,
            TEAM_REQUESTS_SUBCOLLECTION,
            requester.userId,
          ),
        );
        return { success: true, full: false };
      } catch (error) {
        console.error("Error accepting team join request:", error);
        return { success: false, full: false };
      }
    },
    [],
  );

  const declineTeamJoinRequest = useCallback(
    async (teamId: string, userId: string): Promise<boolean> => {
      if (!teamId || !userId) return false;
      try {
        await deleteDoc(
          doc(db, TEAMS_COLLECTION, teamId, TEAM_REQUESTS_SUBCOLLECTION, userId),
        );
        return true;
      } catch (error) {
        console.error("Error declining team join request:", error);
        return false;
      }
    },
    [],
  );

  const acceptTeamInvite = useCallback(
    async (teamId: string): Promise<boolean> => {
      if (!teamId) return false;
      try {
        await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
          status: TEAM_STATUS.ACTIVE,
        });
        return true;
      } catch (error) {
        console.error("Error accepting team invite:", error);
        return false;
      }
    },
    [],
  );

  const declineTeamInvite = useCallback(
    async (teamId: string, partnerId: string): Promise<boolean> => {
      if (!teamId || !partnerId) return false;
      try {
        const teamRef = doc(db, TEAMS_COLLECTION, teamId);
        const snap = await getDoc(teamRef);
        if (!snap.exists()) return true;
        await updateDoc(teamRef, {
          ...removeMember(snap.data() as TeamStats, partnerId),
          status: TEAM_STATUS.PENDING,
        });
        return true;
      } catch (error) {
        console.error("Error declining team invite:", error);
        return false;
      }
    },
    [],
  );

  const fetchTeam = useCallback(
    async (teamKey: string): Promise<TeamStats | null> => {
      if (!teamKey) return null;
      try {
        const snap = await getDoc(doc(db, TEAMS_COLLECTION, teamKey));
        return snap.exists() ? (snap.data() as TeamStats) : null;
      } catch (error) {
        console.error("Error fetching team:", error);
        return null;
      }
    },
    [],
  );

  const subscribeToTeam = useCallback(
    (
      teamId: string,
      onUpdate: (team: TeamStats | null) => void,
      onError?: (error: Error) => void,
    ): (() => void) => {
      if (!teamId) {
        onUpdate(null);
        return () => {};
      }
      return onSnapshot(
        doc(db, TEAMS_COLLECTION, teamId),
        (snap) => onUpdate(snap.exists() ? (snap.data() as TeamStats) : null),
        (error) => {
          console.error("Error subscribing to team:", error);
          onError?.(error);
        },
      );
    },
    [],
  );

  const requestToJoinTeam = useCallback(
    async (teamId: string, requester: TeamMember): Promise<boolean> => {
      if (!teamId || !requester?.userId) return false;
      try {
        await setDoc(
          doc(
            db,
            TEAMS_COLLECTION,
            teamId,
            TEAM_REQUESTS_SUBCOLLECTION,
            requester.userId,
          ),
          { ...requester, createdAt: new Date() },
        );
        return true;
      } catch (error) {
        console.error("Error requesting to join team:", error);
        return false;
      }
    },
    [],
  );

  const withdrawTeamJoinRequest = useCallback(
    async (teamId: string, userId: string): Promise<boolean> => {
      if (!teamId || !userId) return false;
      try {
        await deleteDoc(
          doc(db, TEAMS_COLLECTION, teamId, TEAM_REQUESTS_SUBCOLLECTION, userId),
        );
        return true;
      } catch (error) {
        console.error("Error withdrawing team join request:", error);
        return false;
      }
    },
    [],
  );

  const subscribeToTeamJoinRequest = useCallback(
    (
      teamId: string,
      userId: string,
      onUpdate: (exists: boolean) => void,
    ): (() => void) => {
      if (!teamId || !userId) {
        onUpdate(false);
        return () => {};
      }
      return onSnapshot(
        doc(db, TEAMS_COLLECTION, teamId, TEAM_REQUESTS_SUBCOLLECTION, userId),
        (snap) => onUpdate(snap.exists()),
        (error) => {
          console.error("Error subscribing to team join request:", error);
          onUpdate(false);
        },
      );
    },
    [],
  );

  const fetchUserTeams = useCallback(
    async (userId: string): Promise<TeamStats[]> => {
      if (!userId) return [];
      try {
        const snapshot = await getDocs(
          query(
            collection(db, TEAMS_COLLECTION),
            where("playerIds", "array-contains", userId),
          ),
        );
        return snapshot.docs.map((docSnap) => docSnap.data() as TeamStats);
      } catch (error) {
        console.error("Error fetching user teams:", error);
        return [];
      }
    },
    [],
  );

  const fetchLadderTeamMemberIds = useCallback(
    async (ladderId: string, userId: string): Promise<string[]> => {
      if (!ladderId || !userId) return [];
      try {
        const teamSnap = await getDocs(
          query(
            collection(
              db,
              LADDERS_COLLECTION,
              ladderId,
              LADDER_TEAMS_COLLECTION,
            ),
            where("playerIds", "array-contains", userId),
            limit(1),
          ),
        );
        if (teamSnap.empty) return [userId];
        const playerIds = teamSnap.docs[0].data().playerIds as
          | string[]
          | undefined;
        return playerIds?.length ? playerIds : [userId];
      } catch (error) {
        console.error("Error fetching ladder team members:", error);
        return [userId];
      }
    },
    [],
  );

  const fetchLadderMemberIds = useCallback(
    async (ladderId: string): Promise<string[]> => {
      if (!ladderId) return [];
      try {
        const [participantSnap, teamSnap] = await Promise.all([
          getDocs(
            collection(
              db,
              LADDERS_COLLECTION,
              ladderId,
              LADDER_PARTICIPANTS_COLLECTION,
            ),
          ),
          getDocs(
            collection(
              db,
              LADDERS_COLLECTION,
              ladderId,
              LADDER_TEAMS_COLLECTION,
            ),
          ),
        ]);
        const ids = new Set<string>(participantSnap.docs.map((d) => d.id));
        teamSnap.docs.forEach((d) => {
          teamMemberIds(d.data() as TeamStats).forEach((id) => ids.add(id));
        });
        return Array.from(ids);
      } catch (error) {
        console.error("Error fetching ladder member ids:", error);
        return [];
      }
    },
    [],
  );

  const fetchLadderMemberConflicts = useCallback(
    async (ladderId: string, userIds: string[]): Promise<string[]> => {
      if (!ladderId || userIds.length === 0) return [];
      const [teamSnap, participantSnaps] = await Promise.all([
        getDocs(
          query(
            collection(
              db,
              LADDERS_COLLECTION,
              ladderId,
              LADDER_TEAMS_COLLECTION,
            ),
            where("playerIds", "array-contains-any", userIds),
          ),
        ),
        Promise.all(
          userIds.map((userId) =>
            getDoc(
              doc(
                db,
                LADDERS_COLLECTION,
                ladderId,
                LADDER_PARTICIPANTS_COLLECTION,
                userId,
              ),
            ),
          ),
        ),
      ]);
      const memberIds = new Set<string>();
      teamSnap.docs.forEach((d) =>
        teamMemberIds(d.data() as TeamStats).forEach((id) => memberIds.add(id)),
      );
      participantSnaps.forEach((snap) => {
        if (snap.exists()) memberIds.add(snap.id);
      });
      return findLadderMemberConflicts(userIds, memberIds);
    },
    [],
  );

  const joinLadderAsTeam = useCallback(
    async (
      ladderId: string,
      rootTeam: TeamStats,
    ): Promise<JoinLadderAsTeamOutcome> => {
      const failure = (
        reason?: JoinLadderAsTeamOutcome["reason"],
      ): JoinLadderAsTeamOutcome => ({
        success: false,
        alreadyJoined: false,
        conflict: false,
        conflictUserIds: [],
        reason,
      });
      if (!ladderId || !rootTeam?.teamKey || !rootTeam.teamId) {
        return failure();
      }
      try {
        const teamSnap = await getDoc(
          doc(db, TEAMS_COLLECTION, rootTeam.teamId),
        );
        const serverTeam = teamSnap.exists()
          ? ({ ...(teamSnap.data() as TeamStats), teamId: teamSnap.id } as TeamStats)
          : null;
        const teamBlock = getTeamRegistrationBlock(serverTeam);
        if (teamBlock || !serverTeam) return failure(teamBlock ?? "team_not_found");

        const conflictUserIds = await fetchLadderMemberConflicts(
          ladderId,
          teamMemberIds(serverTeam),
        );
        if (conflictUserIds.length > 0) {
          return {
            success: false,
            alreadyJoined: false,
            conflict: true,
            conflictUserIds,
          };
        }
        const ladderTeam = createRootTeam({
          players: serverTeam.players ?? [],
          createdBy: serverTeam.createdBy ?? "",
          teamId: serverTeam.teamId,
          teamName: serverTeam.teamName,
          teamProfilePic: serverTeam.teamProfilePic,
        });
        const added = await addLadderTeam(ladderId, ladderTeam);
        if (added.reason === "member_conflict") {
          return {
            success: false,
            alreadyJoined: false,
            conflict: true,
            conflictUserIds: added.conflictUserIds ?? [],
          };
        }
        if (!added.success) return failure(added.reason);
        await updateDoc(doc(db, TEAMS_COLLECTION, rootTeam.teamId), {
          ladderIds: arrayUnion(ladderId),
        });
        setJoinedLadderIds((prev) =>
          prev.includes(ladderId) ? prev : [...prev, ladderId],
        );
        return {
          success: true,
          alreadyJoined: false,
          conflict: false,
          conflictUserIds: [],
        };
      } catch (error) {
        console.error("Error joining ladder as team:", error);
        return failure();
      }
    },
    [addLadderTeam, fetchLadderMemberConflicts],
  );

  const createLadderMatch = useCallback(
    async (
      ladderId: string,
      input: LadderMatchInput,
      userId: string,
      team?: MatchTeam,
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
          team,
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

  const resolveLadderHomeCourtRef = useCallback(
    async (
      ladder: Pick<Ladder, "ladderId" | "ladderType">,
      userId: string,
    ): Promise<DocumentReference | null> => {
      if (ladder.ladderType !== LADDER_TYPE.DOUBLES) {
        return doc(
          db,
          LADDERS_COLLECTION,
          ladder.ladderId,
          LADDER_PARTICIPANTS_COLLECTION,
          userId,
        );
      }
      const teamSnap = await getDocs(
        query(
          collection(
            db,
            LADDERS_COLLECTION,
            ladder.ladderId,
            LADDER_TEAMS_COLLECTION,
          ),
          where("playerIds", "array-contains", userId),
          limit(1),
        ),
      );
      return teamSnap.empty ? null : teamSnap.docs[0].ref;
    },
    [],
  );

  const subscribeToLadderHomeCourt = useCallback(
    (
      ladder: Pick<Ladder, "ladderId" | "ladderType">,
      userId: string,
      onUpdate: (state: LadderHomeCourtState | null) => void,
      onError?: (error: Error) => void,
    ): (() => void) => {
      if (!ladder?.ladderId || !userId) {
        onUpdate(null);
        return () => {};
      }

      const toState = (
        data: LadderHomeCourtState | undefined,
      ): LadderHomeCourtState | null =>
        data
          ? {
              homeCourt: data.homeCourt ?? null,
              homeCourtChanges: data.homeCourtChanges ?? 0,
            }
          : null;

      const handleError = (error: Error) => {
        console.error("Error subscribing to ladder home court:", error);
        onError?.(error);
      };

      if (ladder.ladderType !== LADDER_TYPE.DOUBLES) {
        return onSnapshot(
          doc(
            db,
            LADDERS_COLLECTION,
            ladder.ladderId,
            LADDER_PARTICIPANTS_COLLECTION,
            userId,
          ),
          (snap) =>
            onUpdate(
              snap.exists()
                ? toState(snap.data() as LadderHomeCourtState)
                : null,
            ),
          handleError,
        );
      }

      return onSnapshot(
        query(
          collection(
            db,
            LADDERS_COLLECTION,
            ladder.ladderId,
            LADDER_TEAMS_COLLECTION,
          ),
          where("playerIds", "array-contains", userId),
          limit(1),
        ),
        (snap) =>
          onUpdate(
            snap.empty
              ? null
              : toState(snap.docs[0].data() as LadderHomeCourtState),
          ),
        handleError,
      );
    },
    [],
  );

  const setLadderHomeCourt = useCallback(
    async ({
      ladder,
      userId,
      court,
    }: {
      ladder: Pick<Ladder, "ladderId" | "ladderType">;
      userId: string;
      court: Court;
    }): Promise<SetLadderHomeCourtOutcome> => {
      if (!ladder?.ladderId || !userId || !court?.courtId) {
        return { success: false, reason: "error" };
      }

      try {
        const entrantRef = await resolveLadderHomeCourtRef(ladder, userId);
        if (!entrantRef) return { success: false, reason: "not_participant" };

        const ladderRef = doc(db, LADDERS_COLLECTION, ladder.ladderId);
        const courtRef = doc(db, COURTS_COLLECTION, court.courtId);

        await runTransaction(db, async (transaction) => {
          const [ladderSnap, entrantSnap, courtSnap] = await Promise.all([
            transaction.get(ladderRef),
            transaction.get(entrantRef),
            transaction.get(courtRef),
          ]);

          if (!entrantSnap.exists()) {
            throw new SetLadderHomeCourtError("not_participant");
          }

          const freshCourt = courtSnap.exists()
            ? ({ ...courtSnap.data(), courtId: courtSnap.id } as Court)
            : null;
          const ladderCourtIds = ladderSnap.exists()
            ? ((ladderSnap.data() as Ladder).courtIds ?? [])
            : [];
          if (
            !freshCourt ||
            !isSelectableLadderCourt(freshCourt, ladderCourtIds)
          ) {
            throw new SetLadderHomeCourtError("invalid_court");
          }

          const current = entrantSnap.data() as LadderHomeCourtState;
          if (!canChangeLadderHomeCourt(current)) {
            throw new SetLadderHomeCourtError("change_limit");
          }

          transaction.update(entrantRef, {
            homeCourt: toLadderHomeCourt(freshCourt),
            homeCourtChanges: nextLadderHomeCourtChanges(current),
            homeCourtUpdatedAt: new Date(),
            homeCourtUpdatedBy: userId,
          });
        });

        return { success: true };
      } catch (error) {
        if (error instanceof SetLadderHomeCourtError) {
          return { success: false, reason: error.reason };
        }
        console.error("Error setting ladder home court:", error);
        return { success: false, reason: "error" };
      }
    },
    [resolveLadderHomeCourtRef],
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

  const updateTeamDetails = useCallback(
    async (
      teamId: string,
      updates: { teamName?: string; teamProfilePic?: string },
    ): Promise<boolean> => {
      if (!teamId) return false;
      const patch: Record<string, string> = {};
      if (updates.teamName !== undefined)
        patch.teamName = updates.teamName.trim();
      if (updates.teamProfilePic !== undefined)
        patch.teamProfilePic = updates.teamProfilePic;
      if (Object.keys(patch).length === 0) return true;
      try {
        await updateDoc(doc(db, TEAMS_COLLECTION, teamId), patch);
        return true;
      } catch (error) {
        console.error("Error updating team details:", error);
        return false;
      }
    },
    [],
  );

  const getTeamLadderActivity = useCallback(
    async (
      team: TeamStats,
      ladderIds?: string[],
    ): Promise<TeamLadderActivity> => {
      const ids = ladderIds ?? team.ladderIds ?? [];
      const playerIds = teamMemberIds(team);
      if (ids.length === 0 || playerIds.length === 0) {
        return { hasOpenMatch: false, hasCompletedGame: false };
      }
      const matchLists = await Promise.all(
        ids.map((ladderId) => fetchLadderMatches(ladderId)),
      );
      return {
        hasOpenMatch: matchLists.some((matches) =>
          teamHasOpenLadderMatch(matches, playerIds),
        ),
        hasCompletedGame: matchLists.some((matches) =>
          teamHasCompletedLadderGame(matches, playerIds),
        ),
      };
    },
    [fetchLadderMatches],
  );

  const disbandTeam = useCallback(
    async (team: TeamStats): Promise<DisbandTeamOutcome> => {
      if (!team?.teamId) return { success: false, activelyPlaying: false };
      try {
        const ladderSnaps = await Promise.all(
          (team.ladderIds ?? []).map((ladderId) =>
            getDoc(doc(db, LADDERS_COLLECTION, ladderId)),
          ),
        );
        const ladders = ladderSnaps
          .filter((snap) => snap.exists())
          .map((snap) => ({
            ladderId: snap.id,
            status: normalizeLadderStatus(snap.data()?.status),
          }));
        if (isTeamLockedInLadder(ladders)) {
          return {
            success: false,
            activelyPlaying: false,
            registrationClosed: true,
          };
        }
        const activeLadderIds = ladders
          .filter((ladder) => !isLadderFinished(ladder))
          .map((ladder) => ladder.ladderId);
        const activity = await getTeamLadderActivity(team, activeLadderIds);
        if (activity.hasCompletedGame) {
          return { success: false, activelyPlaying: true };
        }
        if (activity.hasOpenMatch) {
          return { success: false, activelyPlaying: false, openMatch: true };
        }
        const batch = writeBatch(db);
        (team.ladderIds ?? []).forEach((ladderId) => {
          batch.delete(
            doc(
              db,
              LADDERS_COLLECTION,
              ladderId,
              LADDER_TEAMS_COLLECTION,
              team.teamKey,
            ),
          );
          teamMemberIds(team).forEach((userId) =>
            batch.delete(
              doc(
                db,
                LADDERS_COLLECTION,
                ladderId,
                LADDER_MEMBERS_COLLECTION,
                userId,
              ),
            ),
          );
          batch.update(doc(db, LADDERS_COLLECTION, ladderId), {
            participantCount: increment(-1),
          });
        });
        await batch.commit();
        await deleteDoc(doc(db, TEAMS_COLLECTION, team.teamId));
        return { success: true, activelyPlaying: false };
      } catch (error) {
        console.error("Error disbanding team:", error);
        return { success: false, activelyPlaying: false };
      }
    },
    [getTeamLadderActivity],
  );

  const subscribeToLadderPlayoffTies = useCallback(
    (
      ladderId: string,
      onUpdate: (ties: LadderPlayoffTie[]) => void,
      onError?: (error: Error) => void,
    ): (() => void) => {
      if (!ladderId) {
        onUpdate([]);
        return () => {};
      }
      return onSnapshot(
        collection(
          db,
          LADDERS_COLLECTION,
          ladderId,
          LADDER_PLAYOFF_TIES_COLLECTION,
        ),
        (snapshot) =>
          onUpdate(
            snapshot.docs.map(
              (docSnap) =>
                ({ ...docSnap.data(), tieId: docSnap.id }) as LadderPlayoffTie,
            ),
          ),
        (error) => {
          console.error("Error subscribing to ladder playoff ties:", error);
          onError?.(error);
        },
      );
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
      team?: MatchTeam,
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
          const [snap, ladderSnap] = await Promise.all([
            transaction.get(matchRef),
            transaction.get(doc(db, LADDERS_COLLECTION, ladderId)),
          ]);
          if (!snap.exists()) {
            throw new AcceptLadderMatchError("MATCH_NOT_FOUND");
          }
          if (isLadderMatchPlayFrozen(ladderSnap.data()?.status)) {
            throw new AcceptLadderMatchError("FROZEN");
          }

          const match: LadderMatch = {
            ...snap.data(),
            ladderMatchId: snap.id,
          };

          // Singles appends the user; doubles (team given) appends the team.
          if (!canAcceptLadderMatch(match, userId, team)) {
            throw new AcceptLadderMatchError("CANNOT_ACCEPT");
          }
          transaction.update(
            matchRef,
            buildAcceptedLadderMatch(match, userId, team),
          );
        });

        return { success: true };
      } catch (error) {
        if (error instanceof AcceptLadderMatchError) {
          return {
            success: false,
            reason: error.message === "FROZEN" ? "frozen" : "unavailable",
          };
        }
        console.error("Error accepting ladder match:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  const writeReport = useCallback(
    async (
      report: Omit<
        Report,
        "reportId" | "status" | "createdAt" | "resolvedAt" | "resolvedBy"
      >,
      dedupe: { reportedBy?: string; targetUserIds?: string[] },
    ): Promise<CreateReportOutcome> => {
      const targetKey = (ids?: string[]): string => [...(ids ?? [])].sort().join("_");
      try {
        const constraints: QueryConstraint[] = [
          where("ladderMatchId", "==", report.ladderMatchId),
          where("reason", "==", report.reason),
        ];
        if (dedupe.reportedBy) {
          constraints.push(where("reportedBy", "==", dedupe.reportedBy));
        }
        const existing = await getDocs(
          query(collection(db, REPORTS_COLLECTION), ...constraints),
        );
        const duplicate = existing.docs.some((d) => {
          const data = d.data() as Report;
          if (data.status === REPORT_STATUS.REJECTED) return false;
          if (!dedupe.targetUserIds) return true;
          return targetKey(data.target?.userIds) === targetKey(dedupe.targetUserIds);
        });
        if (duplicate) return { success: false, reason: "exists" };

        const reportId = doc(collection(db, REPORTS_COLLECTION)).id;
        await setDoc(
          doc(db, REPORTS_COLLECTION, reportId),
          pruneUndefined({
            ...report,
            reportId,
            status: REPORT_STATUS.PENDING,
            createdAt: new Date(),
            resolvedAt: null,
            resolvedBy: null,
          }),
        );
        return { success: true };
      } catch (error) {
        console.error("Error creating report:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  const createNoShowClaim = useCallback(
    async (
      ladderId: string,
      match: LadderMatch,
      claimantUserId: string,
    ): Promise<CreateReportOutcome> => {
      if (!ladderId || !match?.ladderMatchId || !claimantUserId) {
        return { success: false, reason: "error" };
      }
      const teams = match.teams ?? [];
      const isDoubles = teams.length === 2;
      let target: ReportTarget;
      let walkover: Report["walkover"];
      if (isDoubles) {
        const winner = teams.find((t) => t.playerIds.includes(claimantUserId));
        const noShow = teams.find((t) => !t.playerIds.includes(claimantUserId));
        if (!winner || !noShow) return { success: false, reason: "invalid" };
        target = {
          type: "team",
          userIds: noShow.playerIds,
          teamKey: noShow.teamKey,
          teamId: noShow.teamId,
        };
        walkover = {
          winnerType: "team",
          winnerUserIds: winner.playerIds,
          winnerTeamKey: winner.teamKey,
          winnerTeamId: winner.teamId,
        };
      } else {
        const opponents = match.participants.filter((id) => id !== claimantUserId);
        if (opponents.length === 0) return { success: false, reason: "invalid" };
        target = { type: "player", userIds: opponents };
        walkover = { winnerType: "player", winnerUserIds: [claimantUserId] };
      }
      const outcome = await writeReport(
        {
          ladderId,
          ladderType: match.ladderType ?? (isDoubles ? LADDER_TYPE.DOUBLES : LADDER_TYPE.SINGLES),
          ladderMatchId: match.ladderMatchId,
          reason: REPORT_REASONS.NO_SHOW,
          reportedBy: claimantUserId,
          target,
          walkover,
          matchDate: match.matchDate,
          matchTime: match.matchTime?.start ?? "",
          courtName: match.court?.courtName ?? "",
        },
        {},
      );
      if (outcome.success) {
        try {
          await updateDoc(
            doc(
              db,
              LADDERS_COLLECTION,
              ladderId,
              LADDER_MATCHES_COLLECTION,
              match.ladderMatchId,
            ),
            { noShowReported: true },
          );
        } catch (error) {
          console.error("Error flagging match no-show:", error);
        }
      }
      return outcome;
    },
    [writeReport],
  );

  const submitReport = useCallback(
    async (input: {
      ladderId: string;
      ladderName?: string;
      match: LadderMatch;
      reportedBy: string;
      reason: ReportReason;
      target: ReportTarget;
      description?: string;
    }): Promise<CreateReportOutcome> => {
      const { ladderId, ladderName, match, reportedBy, reason, target, description } =
        input;
      if (
        !ladderId ||
        !match?.ladderMatchId ||
        !reportedBy ||
        !target?.userIds?.length
      ) {
        return { success: false, reason: "error" };
      }
      if (reason === REPORT_REASONS.OTHER && !description?.trim()) {
        return { success: false, reason: "invalid" };
      }
      const isDoubles = (match.teams?.length ?? 0) === 2;
      return writeReport(
        {
          ladderId,
          ladderName,
          ladderType:
            match.ladderType ?? (isDoubles ? LADDER_TYPE.DOUBLES : LADDER_TYPE.SINGLES),
          ladderMatchId: match.ladderMatchId,
          reason,
          description: description?.trim() || undefined,
          reportedBy,
          target,
          matchDate: match.matchDate,
          matchTime: match.matchTime?.start ?? "",
          courtName: match.court?.courtName ?? "",
        },
        { reportedBy, targetUserIds: target.userIds },
      );
    },
    [writeReport],
  );

  const fetchLadderReportCounts = useCallback(
    async (
      ladderId: string,
      userIds: string[],
    ): Promise<Record<string, StrikeCounts>> => {
      if (!ladderId || userIds.length === 0) return {};
      try {
        const entries = await Promise.all(
          userIds.map(async (userId) => {
            const snap = await getDoc(
              doc(
                db,
                LADDERS_COLLECTION,
                ladderId,
                LADDER_REPORT_COUNTS_COLLECTION,
                userId,
              ),
            );
            const strikes = snap.exists()
              ? (snap.data() as LadderReportCounts).strikes ?? {}
              : {};
            return [userId, strikes] as const;
          }),
        );
        return Object.fromEntries(entries);
      } catch (error) {
        console.error("Error fetching report counts:", error);
        return {};
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
          const [snap, ladderSnap] = await Promise.all([
            transaction.get(matchRef),
            transaction.get(doc(db, LADDERS_COLLECTION, ladderId)),
          ]);
          if (!snap.exists()) {
            throw new Error("Ladder match not found");
          }
          if (isLadderMatchPlayFrozen(ladderSnap.data()?.status)) {
            throw new LadderReportBlockedError("frozen");
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

          // Games are reported one at a time from game 1, and the match locks
          // once a side reaches the decider — so the only shell that may be
          // written is the next live one. This blocks out-of-turn reports and
          // dead-rubber games past the decider (which would otherwise farm CP).
          const bestOf = match.bestOf ?? games.length;
          if (getReportableLadderGameId(games, bestOf) !== updatedGame.gameId) {
            throw new LadderReportBlockedError("match_decided");
          }

          // Firestore rejects undefined field values; ladder shells omit
          // tournament-only fields (court/createdAt/createdTime), so drop any
          // undefined keys before writing.
          const sanitizedGame = Object.fromEntries(
            Object.entries(updatedGame).filter(
              ([, value]) => value !== undefined,
            ),
          ) as Game;
          sanitizedGame.createdAt = new Date();

          const nextGames = [...games];
          nextGames[index] = sanitizedGame;

          transaction.update(matchRef, {
            games: nextGames,
            lastUpdated: new Date(),
            [`gameReportedAt.${updatedGame.gameId}`]: serverTimestamp(),
          });
        });

        return { success: true };
      } catch (error) {
        if (error instanceof LadderReportBlockedError) {
          return {
            success: false,
            reason: error.message === "frozen" ? "frozen" : "match_decided",
          };
        }
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

  const cancelLadderMatch = useCallback(
    async ({
      ladderId,
      matchId,
      userId,
    }: {
      ladderId: string;
      matchId: string;
      userId: string;
    }): Promise<CancelLadderMatchOutcome> => {
      if (!ladderId || !matchId || !userId) {
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
        return await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(matchRef);
          if (!snap.exists()) {
            return { success: false, reason: "error" } as const;
          }
          const match = snap.data() as LadderMatch;

          if (!(match.participants ?? []).includes(userId)) {
            return { success: false, reason: "not_participant" } as const;
          }
          if (
            getLadderMatchCancelAction(match, userId) !==
            LADDER_MATCH_CANCEL_ACTION.CANCEL
          ) {
            return { success: false, reason: "not_cancellable" } as const;
          }

          transaction.update(matchRef, {
            matchStatus: LADDER_MATCH_STATUS.CANCELLED,
            cancelledAt: new Date(),
            cancelledReason: "Cancelled by player",
            lastUpdated: new Date(),
          });
          return { success: true } as const;
        });
      } catch (error) {
        console.error("Error cancelling ladder match:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  const requestLadderMatchCancellation = useCallback(
    async ({
      ladderId,
      matchId,
      userId,
    }: {
      ladderId: string;
      matchId: string;
      userId: string;
    }): Promise<LadderMatchCancellationOutcome> => {
      if (!ladderId || !matchId || !userId) {
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
        return await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(matchRef);
          if (!snap.exists()) return { success: false, reason: "error" } as const;
          const match = snap.data() as LadderMatch;
          if (
            getLadderMatchCancelAction(match, userId) !==
            LADDER_MATCH_CANCEL_ACTION.REQUEST
          ) {
            return { success: false, reason: "not_cancellable" } as const;
          }
          transaction.update(matchRef, {
            cancellationRequest: { requestedBy: userId, requestedAt: new Date() },
            lastUpdated: new Date(),
          });
          return {
            success: true,
            notifyUserIds: getOpponentSideIds(match, userId),
          } as const;
        });
      } catch (error) {
        console.error("Error requesting ladder match cancellation:", error);
        return { success: false, reason: "error" };
      }
    },
    [],
  );

  const respondToLadderMatchCancellation = useCallback(
    async ({
      ladderId,
      matchId,
      userId,
      accept,
    }: {
      ladderId: string;
      matchId: string;
      userId: string;
      accept: boolean;
    }): Promise<LadderMatchCancellationOutcome> => {
      if (!ladderId || !matchId || !userId) {
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
        return await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(matchRef);
          if (!snap.exists()) return { success: false, reason: "error" } as const;
          const match = snap.data() as LadderMatch;
          if (
            getLadderMatchCancelAction(match, userId) !==
            LADDER_MATCH_CANCEL_ACTION.RESPOND
          ) {
            return { success: false, reason: "not_cancellable" } as const;
          }
          const requestedBy = match.cancellationRequest?.requestedBy ?? "";
          transaction.update(matchRef, {
            cancellationRequest: null,
            lastUpdated: new Date(),
            ...(accept
              ? {
                  matchStatus: LADDER_MATCH_STATUS.CANCELLED,
                  cancelledAt: new Date(),
                  cancelledReason: "Cancelled by agreement",
                }
              : {}),
          });
          return {
            success: true,
            notifyUserIds: requestedBy ? getSameSideIds(match, requestedBy) : [],
          } as const;
        });
      } catch (error) {
        console.error("Error responding to ladder match cancellation:", error);
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
        const ladderRef = doc(db, LADDERS_COLLECTION, ladderId);

        await runTransaction(db, async (transaction) => {
          const [matchSnap, ladderSnap] = await Promise.all([
            transaction.get(matchRef),
            transaction.get(ladderRef),
          ]);
          if (!matchSnap.exists()) {
            throw new Error("Ladder match not found");
          }

          const match = matchSnap.data() as LadderMatch;
          const game = (match.games ?? []).find((g) => g.gameId === gameId);
          if (!game) {
            throw new Error("Game not found in ladder match");
          }

          const playerUserIds = [
            game.team1.player1?.userId,
            game.team1.player2?.userId,
            game.team2.player1?.userId,
            game.team2.player2?.userId,
          ].filter((id): id is string => Boolean(id));
          const matchTeams = match.teams ?? [];

          const [participantSnaps, userSnaps, teamSnaps] = await Promise.all([
            Promise.all(
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
            ),
            Promise.all(
              playerUserIds.map((uid) => transaction.get(doc(db, "users", uid))),
            ),
            Promise.all(
              (matchTeams.length >= 2 ? matchTeams : []).map((t) =>
                transaction.get(
                  doc(
                    db,
                    LADDERS_COLLECTION,
                    ladderId,
                    LADDER_TEAMS_COLLECTION,
                    t.teamKey,
                  ),
                ),
              ),
            ),
          ]);

          const plan = await planLadderGameApproval({
            match,
            gameId,
            actor: { kind: "user", userId, username: approver.username },
            ladderStatus: ladderSnap.data()?.status,
            participants: participantSnaps
              .filter((snap) => snap.exists())
              .map((snap) => snap.data() as ScoreboardProfile),
            users: userSnaps
              .filter((snap) => snap.exists())
              .map((snap) => snap.data() as UserProfile),
            ladderTeams: teamSnaps
              .filter((snap) => snap.exists())
              .map((snap) => snap.data() as TeamStats),
            now: new Date(),
          });

          if (!plan.ok) {
            if (plan.reason === "not_opponent") {
              throw new ApproveLadderGameNotOpponentError(plan.reason);
            }
            if (plan.reason === "ladder_frozen") {
              throw new ApproveLadderGameFrozenError(plan.reason);
            }
            if (plan.reason === "game_not_found") {
              throw new Error("Game not found in ladder match");
            }
            throw new ApproveLadderGameError(plan.reason);
          }

          fullyApproved = plan.fullyApproved;
          matchCompleted = plan.matchCompleted;

          plan.participants.forEach((p) => {
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
          plan.users.forEach((u) => {
            if (!u.userId || !plan.fullyApproved) return;
            transaction.update(doc(db, "users", u.userId), {
              profileDetail: u.profileDetail,
            });
          });
          plan.teams.forEach((team) => {
            transaction.set(
              doc(
                db,
                LADDERS_COLLECTION,
                ladderId,
                LADDER_TEAMS_COLLECTION,
                team.teamKey,
              ),
              team,
            );
          });
          transaction.update(matchRef, plan.matchUpdate as Record<string, unknown>);
        });

        return { success: true, fullyApproved, matchCompleted };
      } catch (error) {
        if (error instanceof ApproveLadderGameError) {
          return { success: false, reason: "unavailable" };
        }
        if (error instanceof ApproveLadderGameNotOpponentError) {
          return { success: false, reason: "not_opponent" };
        }
        if (error instanceof ApproveLadderGameFrozenError) {
          return { success: false, reason: "frozen" };
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
        createTeam,
        addTeamPartner,
        acceptTeamJoinRequest,
        declineTeamJoinRequest,
        requestToJoinTeam,
        withdrawTeamJoinRequest,
        subscribeToTeamJoinRequest,
        subscribeToTeam,
        updateTeamProfilePic,
        updateTeamDetails,
        getTeamLadderActivity,
        disbandTeam,
        acceptTeamInvite,
        declineTeamInvite,
        fetchTeam,
        fetchUserTeams,
        fetchLadderTeamMemberIds,
        fetchLadderMemberIds,
        joinLadderAsTeam,
        createLadderMatch,
        fetchLadderMatches,
        subscribeToLadderMatches,
        acceptLadderMatch,
        createNoShowClaim,
        submitReport,
        fetchLadderReportCounts,
        checkInLadderMatch,
        checkInLadderMatchHandshake,
        updateLadderGame,
        cancelLadderMatch,
        requestLadderMatchCancellation,
        respondToLadderMatchCancellation,
        approveLadderGame,
        subscribeToLadderHomeCourt,
        subscribeToLadderPlayoffTies,
        setLadderHomeCourt,
      }}
    >
      {children}
    </LadderContext.Provider>
  );
};

export default LadderProvider;
