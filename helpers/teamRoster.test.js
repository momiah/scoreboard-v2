import { addMember, removeMember } from "./teamRoster";

const member = (over = {}) => ({
  userId: over.userId ?? "u1",
  username: over.username ?? "user1",
  firstName: over.firstName ?? "First",
  lastName: over.lastName ?? "Last",
  ...over,
});

const creator = member({ userId: "zeta", firstName: "Zed", lastName: "Zephyr" });
const partner = member({ userId: "alpha", firstName: "Al", lastName: "Apple" });

describe("addMember", () => {
  it("appends the partner and recomputes ids, names and key", () => {
    const patch = addMember({ players: [creator] }, partner);
    expect(patch.playerIds).toEqual(["zeta", "alpha"]);
    expect(patch.team).toEqual(["Zed Zephyr", "Al Apple"]);
    // teamKey is the sorted, normalized member ids
    expect(patch.teamKey).toBe("alpha-zeta");
  });

  it("is idempotent when the member is already on the roster", () => {
    const patch = addMember({ players: [creator, partner] }, partner);
    expect(patch.players).toHaveLength(2);
    expect(patch.playerIds).toEqual(["zeta", "alpha"]);
  });

  it("falls back to username for a member with no name", () => {
    const patch = addMember(
      { players: [] },
      member({ userId: "x", firstName: "", lastName: "", username: "noname" }),
    );
    expect(patch.team).toEqual(["noname"]);
  });
});

describe("removeMember", () => {
  it("removes the partner and reverts to the solo creator", () => {
    const patch = removeMember({ players: [creator, partner] }, "alpha");
    expect(patch.playerIds).toEqual(["zeta"]);
    expect(patch.team).toEqual(["Zed Zephyr"]);
    expect(patch.teamKey).toBe("zeta");
  });

  it("is a no-op when the user is not on the roster", () => {
    const patch = removeMember({ players: [creator] }, "ghost");
    expect(patch.playerIds).toEqual(["zeta"]);
  });
});
