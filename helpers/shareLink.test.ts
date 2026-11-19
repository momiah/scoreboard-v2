import { Share } from "react-native";
import {
  buildSharePayload,
  getClubShareUrl,
  getCompetitionShareUrl,
  getVideoShareUrl,
  shareLink,
} from "./shareLink";
import { sharePreRegistration } from "./ladderPreRegistrationDisplay";

const countOccurrences = (text: string, part: string) =>
  text.split(part).length - 1;

describe("share links", () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => shareSpy.mockRestore());

  it("puts the link in the message only, so iOS and Android paste it once", () => {
    const url = getClubShareUrl("club-1");
    const payload = buildSharePayload("Join my club on Court Champs! 🏸", url);
    expect(payload).toEqual({
      message: `Join my club on Court Champs! 🏸\n\n${url}`,
    });
    expect(payload).not.toHaveProperty("url");
    expect(countOccurrences(payload.message, "courtchamps.com")).toBe(1);
  });

  it.each([
    ["club", getClubShareUrl("club 1"), "/preview/club/club%201"],
    ["league", getCompetitionShareUrl("league", "lg-1"), "/preview/league/lg-1"],
    [
      "tournament",
      getCompetitionShareUrl("tournament", "tn-1"),
      "/preview/tournament/tn-1",
    ],
    ["video", getVideoShareUrl("game_user"), "/og/videos?v=game_user"],
  ])("builds the %s link on the Court Champs site", (_, url, path) => {
    expect(url).toBe(`https://courtchamps.com${path}`);
  });

  it("shareLink sends one link to the share sheet", async () => {
    const url = getCompetitionShareUrl("league", "lg-1");
    await shareLink("You've been invited to join my League", url);
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [content] = shareSpy.mock.calls[0];
    expect(content).not.toHaveProperty("url");
    expect(countOccurrences(content.message, url)).toBe(1);
  });

  it("shareLink swallows a share sheet error", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    shareSpy.mockRejectedValueOnce(new Error("dismissed"));
    await expect(shareLink("text", getClubShareUrl("c"))).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });

  it("a ladder pre-registration share pastes its preview link once", async () => {
    await sharePreRegistration({
      preRegistrationId: "prereg-1",
      name: "Season One Doubles",
      maxPlayers: 32,
      entryFee: 0,
      format: "Doubles",
    } as unknown as Parameters<typeof sharePreRegistration>[0]);
    const [content] = shareSpy.mock.calls[0];
    expect(content).not.toHaveProperty("url");
    expect(
      countOccurrences(
        content.message,
        "https://courtchamps.com/preview/ladder-pre-registration/prereg-1",
      ),
    ).toBe(1);
    expect(content.message).toContain("Pre-register with me for Season One Doubles");
  });
});
