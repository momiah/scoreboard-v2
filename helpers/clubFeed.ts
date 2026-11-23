import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";
import {
  COLLECTION_NAMES,
  buildClubCreatedEvent,
  buildCompetitionCreatedEvent,
  buildPlayerJoinedEvent,
} from "@shared";
import type { ClubFeedActor, ClubFeedDocument } from "@shared/types";

/** Firestore rejects `undefined` field values — strip them before writing. */
const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
};

/**
 * Low-level writer: appends one document to `clubs/{clubId}/feed`.
 * Non-blocking by design — a feed write should never fail the parent operation.
 */
export const addClubFeedEvent = async (
  clubId: string,
  event: Omit<ClubFeedDocument, "id" | "createdAt"> & { createdAt?: Date },
): Promise<void> => {
  if (!clubId) return;
  try {
    const ref = doc(collection(db, COLLECTION_NAMES.clubs, clubId, "feed"));
    await setDoc(
      ref,
      stripUndefined({ ...event, createdAt: event.createdAt ?? new Date() }),
    );
  } catch (e) {
    console.error("addClubFeedEvent error:", e);
  }
};

export const clubFeed = {
  clubCreated: (
    clubId: string,
    p: Parameters<typeof buildClubCreatedEvent>[0],
  ) => addClubFeedEvent(clubId, buildClubCreatedEvent(p)),

  playerJoined: (clubId: string, actor: ClubFeedActor) =>
    addClubFeedEvent(clubId, buildPlayerJoinedEvent(actor)),

  competitionCreated: (
    clubId: string,
    p: Parameters<typeof buildCompetitionCreatedEvent>[0],
  ) => addClubFeedEvent(clubId, buildCompetitionCreatedEvent(p)),
};
