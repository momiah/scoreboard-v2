import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import type { Ladder } from "@shared/types";
import type {
  LadderContextType,
  FetchLaddersOptions,
} from "./types/LadderContextType";

const LADDERS_COLLECTION = "ladders";

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
        return snapshot.docs.map(
          (docSnap) =>
            ({ ladderId: docSnap.id, ...docSnap.data() }) as Ladder,
        );
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
        const ladder = {
          ladderId: ladderDoc.id,
          ...ladderDoc.data(),
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
      }}
    >
      {children}
    </LadderContext.Provider>
  );
};

export default LadderProvider;
