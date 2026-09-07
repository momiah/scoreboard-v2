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
  // Per-ladder CP starts at 0: it's a display-only accumulator (the CP shown in
  // the ladder standings), never fed into the XP maths — those use the global
  // profile XP — so it needs no non-zero seed.
  XP: 0,
  username: user.username,
  firstName: user.firstName ? user.firstName.split(" ")[0] : "",
  lastName: user.lastName ? user.lastName.split(" ")[0] : "",
  userId: user.userId,
  memberSince: user.profileDetail?.memberSince || "",
  profileImage: user.profileImage || ccImageEndpoint,
});
