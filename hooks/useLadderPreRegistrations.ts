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
  LADDER_PRE_REGISTRATION_COLLECTION,
  getLadderPreRegistrationId,
} from "@shared";
import type { LadderPreRegistrationKey, UserProfile } from "@shared/types";
import { db } from "../services/firebase.config";
import { UserContext } from "../context/UserContext";

interface UseLadderPreRegistrationsReturn {
  isSignedIn: boolean;
  loading: boolean;
  registeredKeys: Set<LadderPreRegistrationKey>;
  preRegister: (key: LadderPreRegistrationKey) => Promise<void>;
  leave: (key: LadderPreRegistrationKey) => Promise<void>;
}

export const useLadderPreRegistrations =
  (): UseLadderPreRegistrationsReturn => {
    const { currentUser } = useContext(UserContext) as {
      currentUser: UserProfile | null;
    };
    const userId = currentUser?.userId;
    const [registeredKeys, setRegisteredKeys] = useState<
      Set<LadderPreRegistrationKey>
    >(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!userId) {
        setRegisteredKeys(new Set());
        setLoading(false);
        return;
      }

      setLoading(true);
      const registrations = query(
        collection(db, LADDER_PRE_REGISTRATION_COLLECTION),
        where("userId", "==", userId),
      );

      return onSnapshot(
        registrations,
        (snapshot) => {
          setRegisteredKeys(
            new Set(
              snapshot.docs.map(
                (registration) =>
                  registration.data().ladderKey as LadderPreRegistrationKey,
              ),
            ),
          );
          setLoading(false);
        },
        (error) => {
          console.error("Failed to load ladder pre-registrations:", error);
          setLoading(false);
        },
      );
    }, [userId]);

    const preRegister = useCallback(
      async (key: LadderPreRegistrationKey) => {
        if (!userId) return;
        await setDoc(
          doc(
            db,
            LADDER_PRE_REGISTRATION_COLLECTION,
            getLadderPreRegistrationId(userId, key),
          ),
          {
            userId,
            ladderKey: key,
            createdAt: serverTimestamp(),
            notifiedAt: null,
            ladderId: null,
          },
        );
      },
      [userId],
    );

    const leave = useCallback(
      async (key: LadderPreRegistrationKey) => {
        if (!userId) return;
        await deleteDoc(
          doc(
            db,
            LADDER_PRE_REGISTRATION_COLLECTION,
            getLadderPreRegistrationId(userId, key),
          ),
        );
      },
      [userId],
    );

    return {
      isSignedIn: !!userId,
      loading,
      registeredKeys,
      preRegister,
      leave,
    };
  };
