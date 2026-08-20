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
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import { normalizeLadderStatus } from "@shared";
import type { Ladder, LadderMatch, LadderMatchInput } from "@shared/types";
import { computeLadderJoin } from "../helpers/ladderParticipants";
import type { LadderJoinUser } from "../helpers/ladderParticipants";
import { buildLadderMatchDocument } from "../helpers/ladderMatchDocument";
import type {
  LadderContextType,
  FetchLaddersOptions,
  LadderJoinOutcome,
  CreateLadderMatchOutcome,
} from "./types/LadderContextType";

const LADDERS_COLLECTION = "ladders";
const LADDER_MATCHES_COLLECTION = "ladderMatches";

export const LadderContext = createContext<LadderContextType>(
  {} as LadderContextType,
);

const LadderProvider = ({ children }: { children: ReactNode }) => {
  const [upcomingLadders, setUpcomingLadders] = useState<Ladder[]>([]);
  const [upcomingLaddersLoading, setUpcomingLaddersLoading] = useState(false);
  const [ladderById, setLadderById] = useState<Ladder | null>(null);

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
        const ladderDoc = await getDoc(ladderRef);
        if (!ladderDoc.exists()) {
          return { success: false, alreadyJoined: false };
        }

        const data = ladderDoc.data();
        const { alreadyJoined, participants } = computeLadderJoin(
          data.ladderParticipants,
          data.participantCount,
          user,
        );

        if (alreadyJoined) {
          setLadderById((prev) =>
            prev && prev.ladderId === ladderId
              ? { ...prev, ladderParticipants: participants }
              : prev,
          );
          return { success: true, alreadyJoined: true };
        }

        await updateDoc(ladderRef, {
          ladderParticipants: participants,
          participantCount: increment(1),
        });

        setLadderById((prev) =>
          prev && prev.ladderId === ladderId
            ? {
                ...prev,
                ladderParticipants: participants,
                participantCount: (prev.participantCount ?? 0) + 1,
              }
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
        const document = buildLadderMatchDocument({ input, userId });
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
        createLadderMatch,
        fetchLadderMatches,
        addCourtToLadder,
      }}
    >
      {children}
    </LadderContext.Provider>
  );
};

export default LadderProvider;
