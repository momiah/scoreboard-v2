import { runTransaction } from "firebase/firestore";
import { removeClubMembership, setClubAdmin } from "./clubMembers";

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  runTransaction: jest.fn(),
}));

const mockRunTransaction = runTransaction as jest.Mock;

const runWith = (docs: Record<string, Record<string, unknown> | null>) => {
  const transaction = {
    get: jest.fn(async ({ path }: { path: string }) => ({
      exists: () => Boolean(docs[path]),
      data: () => docs[path],
    })),
    update: jest.fn(),
    delete: jest.fn(),
  };
  mockRunTransaction.mockImplementation(async (_db, fn) => fn(transaction));
  return transaction;
};

const club = {
  clubName: "Club",
  clubOwner: { userId: "owner" },
  clubAdmins: [
    { userId: "owner", username: "owner" },
    { userId: "admin2", username: "admin2" },
  ],
};

describe("setClubAdmin", () => {
  it("adds a member as admin once", async () => {
    const tx = runWith({
      "clubs/c1": club,
      "clubs/c1/participants/member": { userId: "member" },
    });

    await setClubAdmin({
      clubId: "c1",
      user: { userId: "member", username: "member" },
      isAdmin: true,
    });

    expect(tx.update).toHaveBeenCalledWith(
      { path: "clubs/c1" },
      {
        clubAdmins: [
          ...club.clubAdmins,
          { userId: "member", username: "member" },
        ],
      },
    );
  });

  it("does not add an admin twice", async () => {
    const tx = runWith({ "clubs/c1": club });

    await setClubAdmin({
      clubId: "c1",
      user: { userId: "admin2", username: "admin2" },
      isAdmin: true,
    });

    expect(tx.update).not.toHaveBeenCalled();
  });

  it("refuses someone who is no longer a member", async () => {
    runWith({ "clubs/c1": club });

    await expect(
      setClubAdmin({
        clubId: "c1",
        user: { userId: "gone", username: "gone" },
        isAdmin: true,
      }),
    ).rejects.toThrow("Only club members");
  });

  it("revokes an admin but never the owner", async () => {
    const tx = runWith({ "clubs/c1": club });

    await setClubAdmin({
      clubId: "c1",
      user: { userId: "admin2", username: "" },
      isAdmin: false,
    });
    expect(tx.update).toHaveBeenCalledWith(
      { path: "clubs/c1" },
      { clubAdmins: [club.clubAdmins[0]] },
    );

    await expect(
      setClubAdmin({
        clubId: "c1",
        user: { userId: "owner", username: "" },
        isAdmin: false,
      }),
    ).rejects.toThrow("owner");
  });
});

describe("removeClubMembership", () => {
  it("deletes the member and drops their admin role together", async () => {
    const tx = runWith({
      "clubs/c1": club,
      "clubs/c1/participants/admin2": { userId: "admin2" },
    });

    await expect(
      removeClubMembership({ clubId: "c1", userId: "admin2" }),
    ).resolves.toEqual(club);
    expect(tx.delete).toHaveBeenCalledWith({
      path: "clubs/c1/participants/admin2",
    });
    expect(tx.update).toHaveBeenCalledWith(
      { path: "clubs/c1" },
      { clubAdmins: [club.clubAdmins[0]] },
    );
  });

  it("returns null when the member already left, so no removal notice is sent", async () => {
    const tx = runWith({ "clubs/c1": club });

    await expect(
      removeClubMembership({ clubId: "c1", userId: "admin2" }),
    ).resolves.toBeNull();
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("never removes the owner", async () => {
    runWith({
      "clubs/c1": club,
      "clubs/c1/participants/owner": { userId: "owner" },
    });

    await expect(
      removeClubMembership({ clubId: "c1", userId: "owner" }),
    ).rejects.toThrow("owner");
  });
});
