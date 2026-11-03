import { runTransaction } from "firebase/firestore";
import { addPendingInvite } from "./addPendingInvite";

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  runTransaction: jest.fn(),
}));

const mockRunTransaction = runTransaction as jest.Mock;

const runWith = (data: Record<string, unknown> | null) => {
  const update = jest.fn();
  mockRunTransaction.mockImplementation(async (_db, fn) =>
    fn({
      get: jest.fn(async () => ({
        exists: () => data !== null,
        data: () => data,
      })),
      update,
    }),
  );
  return update;
};

const invite = (userId: string) =>
  addPendingInvite({ collectionName: "clubs", documentId: "club-1", userId });

describe("addPendingInvite", () => {
  it("adds the invite inside a transaction and reports it as new", async () => {
    const update = runWith({ pendingInvites: [{ userId: "a" }] });

    await expect(invite("b")).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(
      { path: "clubs/club-1" },
      { pendingInvites: [{ userId: "a" }, { userId: "b" }] },
    );
  });

  it("does not add a second invite for someone already invited", async () => {
    const update = runWith({ pendingInvites: [{ userId: "b" }] });

    await expect(invite("b")).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns false when the club no longer exists", async () => {
    const update = runWith(null);

    await expect(invite("b")).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
