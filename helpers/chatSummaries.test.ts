import { getDoc, setDoc } from "firebase/firestore";
import { COMPETITION_TYPES } from "@shared";
import {
  chatCompetitionId,
  chatCompetitionName,
  chatCompetitionType,
  updateChatSummaries,
} from "./chatSummaries";

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;

const snapshot = (data: Record<string, unknown> | null) => ({
  exists: () => data !== null,
  data: () => data,
});

beforeEach(() => jest.clearAllMocks());

describe("updateChatSummaries", () => {
  const send = () =>
    updateChatSummaries({
      recipientIds: ["opponent"],
      competitionId: "t1",
      competitionName: "Spring Cup",
      competitionType: COMPETITION_TYPES.TOURNAMENT,
      lastMessage: "user: hi",
    });

  it("creates the opponent's summary with the competition's id, name and type", async () => {
    mockGetDoc.mockResolvedValue(snapshot(null));
    await send();
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/opponent/chats/t1" },
      expect.objectContaining({
        competitionId: "t1",
        competitionName: "Spring Cup",
        competitionType: COMPETITION_TYPES.TOURNAMENT,
        messageCount: 1,
        isRead: false,
      }),
    );
  });

  it("adds to an existing summary's unread count", async () => {
    mockGetDoc.mockResolvedValue(snapshot({ messageCount: 2 }));
    await send();
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/opponent/chats/t1" },
      expect.objectContaining({
        messageCount: 3,
        competitionType: COMPETITION_TYPES.TOURNAMENT,
      }),
      { merge: true },
    );
  });
});

describe("chat summary competition", () => {
  it("reads the competition fields, falling back to the old league ones", () => {
    const tournamentChat = {
      id: "t1",
      competitionId: "t1",
      competitionName: "Spring Cup",
    };
    const oldLeagueChat = {
      id: "l1",
      leagueId: "l1",
      leagueName: "Monday League",
    };
    expect(chatCompetitionId(tournamentChat)).toBe("t1");
    expect(chatCompetitionName(tournamentChat)).toBe("Spring Cup");
    expect(chatCompetitionId(oldLeagueChat)).toBe("l1");
    expect(chatCompetitionName(oldLeagueChat)).toBe("Monday League");
  });

  it("uses the stored type, without a lookup", async () => {
    await expect(
      chatCompetitionType({
        id: "t1",
        competitionType: COMPETITION_TYPES.TOURNAMENT,
      }),
    ).resolves.toBe(COMPETITION_TYPES.TOURNAMENT);
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it("finds a tournament for a summary written before the type was stored", async () => {
    mockGetDoc.mockResolvedValue(snapshot({ tournamentName: "Spring Cup" }));
    await expect(
      chatCompetitionType({ id: "t1", competitionId: "t1" }),
    ).resolves.toBe(COMPETITION_TYPES.TOURNAMENT);
    expect(mockGetDoc).toHaveBeenCalledWith({ path: "tournaments/t1" });
  });

  it("treats an untyped summary with no tournament as a league", async () => {
    mockGetDoc.mockResolvedValue(snapshot(null));
    await expect(
      chatCompetitionType({ id: "l1", competitionId: "l1" }),
    ).resolves.toBe(COMPETITION_TYPES.LEAGUE);
  });
});
