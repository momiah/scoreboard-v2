import { doc, updateDoc } from "firebase/firestore";
import { updateClubDetails } from "./updateClubDetails";

const mockUpdateDoc = updateDoc as jest.Mock;

describe("updateClubDetails", () => {
  beforeEach(() => {
    mockUpdateDoc.mockReset();
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it("writes only the edited fields, leaving invites, requests and admins untouched", async () => {
    await updateClubDetails("club-1", { clubDescription: "New text" });

    expect(doc).toHaveBeenCalledWith({}, "clubs", "club-1");
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual({
      clubDescription: "New text",
    });
  });

  it("rejects when the write fails so the screen can tell the user", async () => {
    mockUpdateDoc.mockRejectedValue(new Error("permission-denied"));

    await expect(
      updateClubDetails("club-1", { clubImage: "https://img" }),
    ).rejects.toThrow("permission-denied");
  });

  it("rejects without a club id", async () => {
    await expect(updateClubDetails("", {})).rejects.toThrow("missing clubId");
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
