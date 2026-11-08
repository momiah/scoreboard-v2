import { useCallback, useContext, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  LADDER_PRE_REGISTRATIONS_COLLECTION,
  LADDER_PRE_REGISTRATION_STATUS,
} from "@shared";
import type {
  LadderPreRegistrant,
  LadderPreRegistration,
  UserProfile,
} from "@shared/types";
import { db } from "../services/firebase.config";
import { UserContext } from "../context/UserContext";

interface UseLadderPreRegistrationsReturn {
  isSignedIn: boolean;
  loading: boolean;
  preRegistrations: LadderPreRegistration[];
  registeredIds: Set<string>;
  preRegister: (preRegistrationId: string) => Promise<void>;
  leave: (preRegistrationId: string) => Promise<void>;
}

const registrantsRef = (preRegistrationId: string) =>
  collection(
    db,
    LADDER_PRE_REGISTRATIONS_COLLECTION,
    preRegistrationId,
    LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  );

const registrantRef = (preRegistrationId: string, userId: string) =>
  doc(registrantsRef(preRegistrationId), userId);

// The user's own join or leave reaches the registrants listener from the
// local cache before the server has it, so a count taken then is one out.
// The write's promise resolves once the server has it: recount at that point.
const registrantWriteListeners = new Map<string, Set<() => void>>();
const registrantsWritten = (preRegistrationId: string) =>
  registrantWriteListeners.get(preRegistrationId)?.forEach((recount) => recount());

export const useLadderPreRegistrations =
  (): UseLadderPreRegistrationsReturn => {
    const { currentUser } = useContext(UserContext) as {
      currentUser: UserProfile | null;
    };
    const userId = currentUser?.userId;
    const username = currentUser?.username ?? "";
    const profileImage = currentUser?.profileImage ?? "";
    const [preRegistrations, setPreRegistrations] = useState<
      LadderPreRegistration[]
    >([]);
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(
      () =>
        onSnapshot(
          query(
            collection(db, LADDER_PRE_REGISTRATIONS_COLLECTION),
            where("status", "==", LADDER_PRE_REGISTRATION_STATUS.OPEN),
          ),
          (snapshot) => {
            setPreRegistrations(
              snapshot.docs.map(
                (preRegistration) =>
                  ({
                    ...preRegistration.data(),
                    preRegistrationId: preRegistration.id,
                  }) as LadderPreRegistration,
              ),
            );
            setLoading(false);
          },
          (error) => {
            console.error("Failed to load ladder pre-registrations:", error);
            setLoading(false);
          },
        ),
      [],
    );

    const preRegistrationIds = preRegistrations
      .map((preRegistration) => preRegistration.preRegistrationId)
      .join(",");

    useEffect(() => {
      setRegisteredIds(new Set());
      if (!userId || !preRegistrationIds) return;

      const unsubscribes = preRegistrationIds.split(",").map((id) =>
        onSnapshot(
          registrantRef(id, userId),
          (registrant) =>
            setRegisteredIds((current) => {
              const next = new Set(current);
              if (registrant.exists()) next.add(id);
              else next.delete(id);
              return next;
            }),
          (error) =>
            console.error("Failed to load ladder pre-registrant:", error),
        ),
      );
      return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [userId, preRegistrationIds]);

    const preRegister = useCallback(
      async (preRegistrationId: string) => {
        if (!userId) return;
        await setDoc(registrantRef(preRegistrationId, userId), {
          userId,
          username,
          profileImage,
          createdAt: serverTimestamp(),
          notifiedAt: null,
        });
        registrantsWritten(preRegistrationId);
      },
      [userId, username, profileImage],
    );

    const leave = useCallback(
      async (preRegistrationId: string) => {
        if (!userId) return;
        await deleteDoc(registrantRef(preRegistrationId, userId));
        registrantsWritten(preRegistrationId);
      },
      [userId],
    );

    return {
      isSignedIn: !!userId,
      loading,
      preRegistrations,
      registeredIds,
      preRegister,
      leave,
    };
  };

/** The most recent registrants (for avatars) and how many there are in total. */
export const useLadderPreRegistrants = (
  preRegistrationId: string | undefined,
  previewSize: number,
): { registrants: LadderPreRegistrant[]; total: number } => {
  const [registrants, setRegistrants] = useState<LadderPreRegistrant[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setRegistrants([]);
    setTotal(0);
    if (!preRegistrationId) return;

    const registrantsQuery = registrantsRef(preRegistrationId);
    let latestCount = 0;
    const recount = () => {
      const request = ++latestCount;
      getCountFromServer(registrantsQuery)
        .then((count) => {
          if (request === latestCount) setTotal(count.data().count);
        })
        .catch((error) =>
          console.error("Failed to count ladder pre-registrants:", error),
        );
    };
    const listeners = registrantWriteListeners.get(preRegistrationId) ?? new Set();
    listeners.add(recount);
    registrantWriteListeners.set(preRegistrationId, listeners);
    const unsubscribe = onSnapshot(
      query(registrantsQuery, orderBy("createdAt", "desc"), limit(previewSize)),
      (snapshot) => {
        setRegistrants(
          snapshot.docs.map(
            (registrant) => registrant.data() as LadderPreRegistrant,
          ),
        );
        recount();
      },
      (error) => console.error("Failed to load ladder pre-registrants:", error),
    );
    return () => {
      unsubscribe();
      listeners.delete(recount);
    };
  }, [preRegistrationId, previewSize]);

  return { registrants, total };
};
