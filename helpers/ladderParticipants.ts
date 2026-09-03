import { scoreboardProfileSchema, ccImageEndpoint } from "@shared";
import type { ScoreboardProfile, UserProfile } from "@shared/types";

export type LadderJoinUser = Pick<
  UserProfile,
  "userId" | "username" | "firstName" | "lastName" | "profileImage"
> & {
  profileDetail?: Pick<UserProfile["profileDetail"], "memberSince">;
};

export const buildLadderParticipant = (
  user: LadderJoinUser,
): ScoreboardProfile => ({
  ...scoreboardProfileSchema,
  // Ladder CP starts at 20 (like the global profile) so per-ladder XP maths
  // never divides by zero and the CP floor never goes negative.
  XP: 20,
  username: user.username,
  firstName: user.firstName ? user.firstName.split(" ")[0] : "",
  lastName: user.lastName ? user.lastName.split(" ")[0] : "",
  userId: user.userId,
  memberSince: user.profileDetail?.memberSince || "",
  profileImage: user.profileImage || ccImageEndpoint,
});
