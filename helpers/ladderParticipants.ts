import { scoreboardProfileSchema, ccImageEndpoint } from "@shared";
import type { ScoreboardProfile, UserProfile } from "@shared/types";

export type LadderJoinUser = Pick<
  UserProfile,
  "userId" | "username" | "firstName" | "lastName" | "profileImage"
> & {
  profileDetail?: Pick<UserProfile["profileDetail"], "memberSince">;
};

/**
 * Build the ScoreboardProfile document written to the
 * `ladders/{ladderId}/ladderParticipants/{userId}` subcollection when a player
 * joins a ladder.
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
