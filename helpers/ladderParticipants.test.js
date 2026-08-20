import { buildLadderParticipant } from "./ladderParticipants";

const user = {
  userId: "u1",
  username: "moe",
  firstName: "Moe Junior",
  lastName: "Miah Senior",
  profileImage: "https://example.com/moe.png",
  profileDetail: { memberSince: "Jan 2024" },
};

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
