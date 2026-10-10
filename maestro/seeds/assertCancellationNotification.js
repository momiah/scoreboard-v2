import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase.config";

export const CANCELLATION_MESSAGE_SNIPPET = {
  request: "asked to cancel your ladder match",
  accept: "agreed to cancel your ladder match",
  decline: "declined to cancel your ladder match",
};

export const assertCancellationNotification = async ({
  recipientIds,
  matchId,
  kind,
}) => {
  const snippet = CANCELLATION_MESSAGE_SNIPPET[kind];
  const results = await Promise.all(
    recipientIds.map(async (recipientId) => {
      const snap = await getDocs(
        query(
          collection(db, "users", recipientId, "notifications"),
          where("data.matchId", "==", matchId),
        ),
      );
      return {
        recipientId,
        found: snap.docs.some((d) => {
          const data = d.data();
          return (
            String(data.message ?? "").includes(snippet) &&
            data.data?.tab === "Schedule"
          );
        }),
      };
    }),
  );
  const missing = results.filter((result) => !result.found);
  if (missing.length > 0) {
    throw new Error(
      `No "${snippet}" notification for ${missing
        .map((result) => result.recipientId)
        .join(", ")}`,
    );
  }
  return { kind, notified: recipientIds };
};
