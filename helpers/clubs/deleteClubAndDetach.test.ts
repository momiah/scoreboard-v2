import { deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { deleteClubAndDetach } from "./deleteClubAndDetach";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  doc: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  query: jest.fn((ref, ...constraints) => ({ ref, constraints })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
}));

const snapOf = (paths: string[]) => ({
  docs: paths.map((path) => ({ ref: { path } })),
});

describe("deleteClubAndDetach", () => {
  const updates: [unknown, unknown][] = [];
  const deletes: unknown[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    updates.length = 0;
    deletes.length = 0;
    (writeBatch as jest.Mock).mockImplementation(() => ({
      update: (ref: unknown, data: unknown) => updates.push([ref, data]),
      delete: (ref: unknown) => deletes.push(ref),
      commit: jest.fn(async () => undefined),
    }));
    (getDocs as jest.Mock).mockImplementation(async (target) => {
      const path = target.ref?.path ?? target.path;
      if (path === "leagues") return snapOf(["leagues/l1"]);
      if (path === "tournaments") return snapOf(["tournaments/t1"]);
      if (path === "clubs/c1/participants")
        return snapOf(["clubs/c1/participants/u1"]);
      if (path === "clubs/c1/feed") return snapOf(["clubs/c1/feed/f1"]);
      return snapOf([]);
    });
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
  });

  it("detaches the club's competitions so their games and players are kept", async () => {
    await deleteClubAndDetach("c1");

    expect(updates).toEqual([
      [{ path: "leagues/l1" }, { clubId: null }],
      [{ path: "tournaments/t1" }, { clubId: null }],
    ]);
  });

  it("deletes the members, feed and chat, then the club itself", async () => {
    await deleteClubAndDetach("c1");

    expect(deletes).toEqual([
      { path: "clubs/c1/participants/u1" },
      { path: "clubs/c1/feed/f1" },
    ]);
    expect(deleteDoc).toHaveBeenCalledWith({ path: "clubs/c1" });
  });

  it("leaves the club in place if detaching a competition fails, so it can be retried", async () => {
    (writeBatch as jest.Mock).mockImplementation(() => ({
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(async () => {
        throw new Error("permission-denied");
      }),
    }));

    await expect(deleteClubAndDetach("c1")).rejects.toThrow(
      "permission-denied",
    );
    expect(deleteDoc).not.toHaveBeenCalled();
  });
});
