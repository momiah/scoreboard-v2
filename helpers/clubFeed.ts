import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
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

/**
 * High-level, named builders. Call sites use these one-liners; copy/shape edits
 * live here. Add a new builder per future event type.
 */
export const clubFeed = {
  playerJoined: (clubId: string, actor: ClubFeedActor) =>
    addClubFeedEvent(clubId, {
      type: "player_joined",
      title: "New member",
      message: `${actor.firstName ?? actor.username} joined the club`,
      actor,
      icon: "person-add-outline",
    }),

  competitionCreated: (
    clubId: string,
    p: {
      name: string;
      competitionType: "league" | "tournament";
      competitionId: string;
      actor?: ClubFeedActor | null;
      image?: string | null;
    },
  ) =>
    addClubFeedEvent(clubId, {
      type: "competition_created",
      title: "New competition",
      message: `${p.actor?.firstName ?? "An admin"} created the ${
        p.competitionType
      } "${p.name}"`,
      actor: p.actor ?? null,
      thumbnail: p.image ?? null,
      icon: "add-circle-outline",
      data: {
        competitionId: p.competitionId,
        competitionType: p.competitionType,
      },
    }),

  competitionWon: (
    clubId: string,
    p: {
      name: string;
      competitionType: "league" | "tournament";
      competitionId: string;
      winnerName: string;
    },
  ) =>
    addClubFeedEvent(clubId, {
      type: "competition_won",
      title: "Competition winner",
      message: `${p.winnerName} won the ${p.competitionType} "${p.name}"`,
      icon: "trophy-outline",
      data: {
        competitionId: p.competitionId,
        competitionType: p.competitionType,
      },
    }),
};
