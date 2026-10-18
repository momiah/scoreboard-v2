import { LADDER_PLAYOFF_TIE_STATUS } from "@shared";
import {
  findUserPlayoffTie,
  isUserInPlayoffTie,
} from "./ladderPlayoffTies";

const player = (userId) => ({ userId, firstName: userId, lastName: "", username: userId });
const side = (playerIds) => ({
  entrantKey: playerIds.join("_"),
  teamId: null,
  playerIds,
  rank: 1,
  homeCourt: null,
});

const tie = (round, ids1, ids2, overrides = {}) => ({
  tieId: `r${round}`,
  round,
  slot: 0,
  isThirdPlacePlayoff: false,
  team1: { player1: ids1 ? player(ids1[0]) : null, player2: null },
  team2: { player1: ids2 ? player(ids2[0]) : null, player2: null },
  side1: ids1 ? side(ids1) : null,
  side2: ids2 ? side(ids2) : null,
  status: LADDER_PLAYOFF_TIE_STATUS.SCHEDULED,
  winner: null,
  ...overrides,
});

describe("isUserInPlayoffTie", () => {
  it("checks both sides, including doubles partners", () => {
    expect(isUserInPlayoffTie(tie(1, ["me"], ["opp"]), "me")).toBe(true);
    expect(isUserInPlayoffTie(tie(1, ["a"], ["opp", "me"]), "me")).toBe(true);
    expect(isUserInPlayoffTie(tie(1, ["a"], ["b"]), "me")).toBe(false);
    expect(isUserInPlayoffTie(tie(2, null, null), "me")).toBe(false);
    expect(isUserInPlayoffTie(tie(1, ["me"], ["b"]), undefined)).toBe(false);
  });
});

describe("findUserPlayoffTie", () => {
  it("returns the latest unfinished round the user is in", () => {
    const ties = [
      tie(1, ["me"], ["a"], { status: LADDER_PLAYOFF_TIE_STATUS.COMPLETED }),
      tie(2, ["me"], ["b"]),
      tie(3, null, null),
      tie(1, ["c"], ["d"]),
    ];
    expect(findUserPlayoffTie(ties, "me").tieId).toBe("r2");
  });

  it("returns null when the user has no open game", () => {
    expect(
      findUserPlayoffTie(
        [tie(1, ["me"], ["a"], { status: LADDER_PLAYOFF_TIE_STATUS.COMPLETED })],
        "me",
      ),
    ).toBeNull();
    expect(findUserPlayoffTie([tie(1, ["a"], ["b"])], "me")).toBeNull();
  });
});
