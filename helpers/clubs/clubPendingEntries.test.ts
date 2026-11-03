import { runTransaction } from "firebase/firestore";
import { notificationTypes } from "@shared";
import {
  addClubJoinRequest,
  getClubAdminIds,
  resolveClubPendingEntry,
} from "./clubPendingEntries";

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  runTransaction: jest.fn(),
}));

const mockRunTransaction = runTransaction as jest.Mock;

const runWith = (club: Record<string, unknown> | null) => {
  const transaction = {
    get: jest.fn(async () => ({
      exists: () => club !== null,
      data: () => club,
    })),
    update: jest.fn(),
    set: jest.fn(),
  };
  mockRunTransaction.mockImplementation(async (_db, fn) => fn(transaction));
  return transaction;
};

const club = (pendingRequests: { userId: string }[]) => ({
  clubName: "Club",
  clubOwner: { userId: "owner" },
  clubAdmins: [{ userId: "owner" }, { userId: "admin2" }],
  pendingRequests,
});

const participant = {
  userId: "requester",
  firstName: "Req",
  lastName: "Uester",
  username: "requester",
};

describe("getClubAdminIds", () => {
  it("returns the owner and every admin once", () => {
    expect(getClubAdminIds(club([]) as never)).toEqual(["owner", "admin2"]);
  });
});

describe("addClubJoinRequest", () => {
  it("adds the request and returns the club so every admin can be notified", async () => {
    const tx = runWith(club([]));

    const result = await addClubJoinRequest({
      clubId: "club-1",
      userId: "requester",
    });

    expect(result?.clubAdmins).toHaveLength(2);
    expect(tx.update).toHaveBeenCalledWith(
      { path: "clubs/club-1" },
      { pendingRequests: [{ userId: "requester" }] },
    );
  });

  it("does nothing when a request is already pending", async () => {
    const tx = runWith(club([{ userId: "requester" }]));

    await expect(
      addClubJoinRequest({ clubId: "club-1", userId: "requester" }),
    ).resolves.toBeNull();
    expect(tx.update).not.toHaveBeenCalled();
  });
});

describe("resolveClubPendingEntry for join requests", () => {
  const resolve = (accept: boolean) =>
    resolveClubPendingEntry({
      clubId: "club-1",
      pendingKey: "pendingRequests",
      memberId: "requester",
      notificationOwnerId: "admin2",
      notificationId: "n1",
      accept,
      participant,
    });

  it("accepts a pending request: removes it, adds the member, answers the notification", async () => {
    const tx = runWith(club([{ userId: "requester" }, { userId: "other" }]));

    await expect(resolve(true)).resolves.toBe("accepted");
    expect(tx.update).toHaveBeenCalledWith(
      { path: "clubs/club-1" },
      { pendingRequests: [{ userId: "other" }] },
    );
    expect(tx.set).toHaveBeenCalledWith(
      { path: "clubs/club-1/participants/requester" },
      participant,
    );
    expect(tx.update).toHaveBeenCalledWith(
      { path: "users/admin2/notifications/n1" },
      { isRead: true, response: notificationTypes.RESPONSE.ACCEPT },
    );
  });

  it("declines without adding a member", async () => {
    const tx = runWith(club([{ userId: "requester" }]));

    await expect(resolve(false)).resolves.toBe("declined");
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalledWith(
      { path: "users/admin2/notifications/n1" },
      { isRead: true, response: notificationTypes.RESPONSE.DECLINE },
    );
  });

  it("only marks the notification read when another admin already handled it", async () => {
    const tx = runWith(club([]));

    await expect(resolve(true)).resolves.toBe("notPending");
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledWith(
      { path: "users/admin2/notifications/n1" },
      { isRead: true },
    );
  });

  it("only marks the notification read when the club was deleted", async () => {
    const tx = runWith(null);

    await expect(resolve(true)).resolves.toBe("clubMissing");
    expect(tx.set).not.toHaveBeenCalled();
  });
});

describe("resolveClubPendingEntry for invites", () => {
  const resolveInvite = (accept: boolean) =>
    resolveClubPendingEntry({
      clubId: "club-1",
      pendingKey: "pendingInvites",
      memberId: "invitee",
      notificationOwnerId: "invitee",
      notificationId: "n2",
      accept,
      participant: { ...participant, userId: "invitee" },
    });

  it("accepts a pending invite and adds the member", async () => {
    const tx = runWith({
      ...club([]),
      pendingInvites: [{ userId: "invitee" }],
    });

    await expect(resolveInvite(true)).resolves.toBe("accepted");
    expect(tx.update).toHaveBeenCalledWith(
      { path: "clubs/club-1" },
      { pendingInvites: [] },
    );
    expect(tx.set).toHaveBeenCalledWith(
      { path: "clubs/club-1/participants/invitee" },
      { ...participant, userId: "invitee" },
    );
    expect(tx.update).toHaveBeenCalledWith(
      { path: "users/invitee/notifications/n2" },
      { isRead: true, response: notificationTypes.RESPONSE.ACCEPT },
    );
  });

  it("does not add a member from a withdrawn invite", async () => {
    const tx = runWith({ ...club([]), pendingInvites: [] });

    await expect(resolveInvite(true)).resolves.toBe("notPending");
    expect(tx.set).not.toHaveBeenCalled();
  });
});
