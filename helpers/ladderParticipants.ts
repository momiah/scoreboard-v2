import { scoreboardProfileSchema, ccImageEndpoint } from "@shared";
import type { ScoreboardProfile, UserProfile } from "@shared/types";

/**
 * The subset of a user's profile needed to build their ladder participant
 * record. `currentUser` (a full {@link UserProfile}) satisfies this.
 */
export type LadderJoinUser = Pick<
  UserProfile,
  "userId" | "username" | "firstName" | "lastName" | "profileImage"
> & {
  profileDetail?: Pick<UserProfile["profileDetail"], "memberSince">;
};

/** True when `userId` already appears in the ladder's participants. */
export const isLadderParticipant = (
  participants: ScoreboardProfile[] | undefined,
  userId: string | undefined,
): boolean => {
  if (!userId || !participants) return false;
  return participants.some((participant) => participant.userId === userId);
};

/**
 * Builds a fresh {@link ScoreboardProfile} for a user joining a ladder,
 * seeded from the shared schema (all stats zeroed) plus their identity fields.
 * Mirrors how league/tournament participants are created.
 */
export const buildLadderParticipant = (
  user: LadderJoinUser,
): ScoreboardProfile => ({
  ...scoreboardProfileSchema,
  username: user.username,
  firstName: user.firstName ? user.firstName.split(" ")[0] : "",
  lastName: user.lastName ? user.lastName.split(" ")[0] : "",
  userId: user.userId,
  memberSince: user.profileDetail?.memberSince || "",
  profileImage: user.profileImage || ccImageEndpoint,
});

export interface LadderJoinResult {
  /** True when the user was already a participant — no write is needed. */
  alreadyJoined: boolean;
  /** The participants array after the join (unchanged if already joined). */
  participants: ScoreboardProfile[];
  /** The participant count after the join. */
  participantCount: number;
  /** The newly-built participant, or `null` if already joined. */
  added: ScoreboardProfile | null;
}

/**
 * Pure core of the "join a ladder" operation. Given the ladder's current
 * participants and count, returns the next state. Kept free of Firestore so it
 * can be unit-tested; {@link LadderContext} performs the actual write.
 */
export const computeLadderJoin = (
  existingParticipants: ScoreboardProfile[] | undefined,
  existingCount: number | undefined,
  user: LadderJoinUser,
): LadderJoinResult => {
  const participants = existingParticipants ?? [];
  const count =
    typeof existingCount === "number" ? existingCount : participants.length;

  if (isLadderParticipant(participants, user.userId)) {
    return {
      alreadyJoined: true,
      participants,
      participantCount: count,
      added: null,
    };
  }

  const added = buildLadderParticipant(user);
  return {
    alreadyJoined: false,
    participants: [...participants, added],
    participantCount: count + 1,
    added,
  };
};
