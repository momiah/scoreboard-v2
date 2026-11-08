import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { Notification } from "@shared";
import { db } from "../services/firebase.config";

const createdAtSeconds = (notification: Notification) => {
  const createdAt = notification.createdAt as unknown as
    | { seconds?: number }
    | Date
    | undefined;
  if (createdAt instanceof Date) return createdAt.getTime() / 1000;
  return createdAt?.seconds ?? 0;
};

export const useNotificationsOfTypes = (
  userId: string | undefined,
  types: string[],
): Notification[] => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const typesKey = types.join("|");

  useEffect(() => {
    const queryTypes = typesKey ? typesKey.split("|") : [];
    if (!userId || queryTypes.length === 0) {
      setNotifications([]);
      return;
    }
    return onSnapshot(
      query(
        collection(db, "users", userId, "notifications"),
        where("type", "in", queryTypes),
      ),
      (snapshot) => {
        const docs = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Notification,
        );
        docs.sort((a, b) => createdAtSeconds(b) - createdAtSeconds(a));
        setNotifications(docs);
      },
      (error) => console.error("Error in typed notifications listener:", error),
    );
  }, [userId, typesKey]);

  return notifications;
};
