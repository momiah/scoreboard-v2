import { useCallback, useContext, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
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
import type { LadderPreRegistration, UserProfile } from "@shared/types";
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

const registrantRef = (preRegistrationId: string, userId: string) =>
  doc(
    db,
    LADDER_PRE_REGISTRATIONS_COLLECTION,
    preRegistrationId,
    LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
    userId,
  );

export const useLadderPreRegistrations =
  (): UseLadderPreRegistrationsReturn => {
    const { currentUser } = useContext(UserContext) as {
      currentUser: UserProfile | null;
    };
    const userId = currentUser?.userId;
    const email = currentUser?.email ?? "";
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
          email,
          createdAt: serverTimestamp(),
          notifiedAt: null,
        });
      },
      [userId, email],
    );

    const leave = useCallback(
      async (preRegistrationId: string) => {
        if (!userId) return;
        await deleteDoc(registrantRef(preRegistrationId, userId));
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
