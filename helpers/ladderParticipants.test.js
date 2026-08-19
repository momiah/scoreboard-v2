import {
  isLadderParticipant,
  buildLadderParticipant,
  computeLadderJoin,
} from "./ladderParticipants";

const user = {
  userId: "u1",
  username: "moe",
  firstName: "Moe Junior",
  lastName: "Miah Senior",
  profileImage: "https://example.com/moe.png",
  profileDetail: { memberSince: "Jan 2024" },
};

describe("isLadderParticipant", () => {
  it("is true when the userId is present", () => {
    expect(isLadderParticipant([{ userId: "u1" }, { userId: "u2" }], "u1")).toBe(
      true,
    );
  });

  it("is false when the userId is absent", () => {
    expect(isLadderParticipant([{ userId: "u2" }], "u1")).toBe(false);
  });

  it("is false for missing participants or userId", () => {
    expect(isLadderParticipant(undefined, "u1")).toBe(false);
    expect(isLadderParticipant([{ userId: "u1" }], undefined)).toBe(false);
  });
});

describe("buildLadderParticipant", () => {
  it("seeds identity fields and takes only the first name token", () => {
    const participant = buildLadderParticipant(user);
    expect(participant.userId).toBe("u1");
    expect(participant.username).toBe("moe");
    expect(participant.firstName).toBe("Moe");
    expect(participant.lastName).toBe("Miah");
    expect(participant.memberSince).toBe("Jan 2024");
    expect(participant.profileImage).toBe("https://example.com/moe.png");
  });

  it("starts every stat at the zeroed schema default", () => {
    const participant = buildLadderParticipant(user);
    expect(participant.numberOfWins).toBe(0);
    expect(participant.numberOfGamesPlayed).toBe(0);
    expect(participant.totalPoints).toBe(0);
    expect(participant.resultLog).toEqual([]);
  });

  it("falls back to the default image and empty memberSince", () => {
    const participant = buildLadderParticipant({
      userId: "u9",
      username: "guest",
      firstName: "Guest",
      lastName: "User",
      profileImage: "",
    });
    expect(participant.profileImage).toBeTruthy();
    expect(participant.memberSince).toBe("");
  });
});

describe("computeLadderJoin", () => {
  it("appends a new participant and increments the count", () => {
    const result = computeLadderJoin([{ userId: "u2" }], 1, user);
    expect(result.alreadyJoined).toBe(false);
    expect(result.participantCount).toBe(2);
    expect(result.participants).toHaveLength(2);
    expect(result.added?.userId).toBe("u1");
    expect(result.participants[1].userId).toBe("u1");
  });

  it("is a no-op when the user has already joined", () => {
    const existing = [{ ...buildLadderParticipant(user) }];
    const result = computeLadderJoin(existing, 1, user);
    expect(result.alreadyJoined).toBe(true);
    expect(result.participantCount).toBe(1);
    expect(result.participants).toHaveLength(1);
    expect(result.added).toBeNull();
  });

  it("handles an empty/undefined ladder (first participant)", () => {
    const result = computeLadderJoin(undefined, undefined, user);
    expect(result.alreadyJoined).toBe(false);
    expect(result.participantCount).toBe(1);
    expect(result.participants).toHaveLength(1);
  });

  it("does not mutate the original participants array", () => {
    const original = [{ userId: "u2" }];
    computeLadderJoin(original, 1, user);
    expect(original).toHaveLength(1);
  });
});
