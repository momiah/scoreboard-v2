import { scoreboardProfileSchema, ccImageEndpoint } from "@shared";
import type { ScoreboardProfile, UserProfile } from "@shared/types";

export type LadderJoinUser = Pick<
  UserProfile,
  "userId" | "username" | "firstName" | "lastName" | "profileImage"
> & {
  profileDetail?: Pick<UserProfile["profileDetail"], "memberSince">;
};

export const isLadderParticipant = (
  participants: ScoreboardProfile[] | undefined,
  userId: string | undefined,
): boolean => {
  if (!userId || !participants) return false;
  return participants.some((participant) => participant.userId === userId);
};

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
  alreadyJoined: boolean;
  participants: ScoreboardProfile[];
  participantCount: number;
  added: ScoreboardProfile | null;
}

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
