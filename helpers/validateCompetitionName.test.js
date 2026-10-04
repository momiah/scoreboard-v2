import { validateCompetitionName } from "./validateCompetitionName";

describe("validateCompetitionName", () => {
  it.each(["Sunday Smashers", "Mo's League", "Mo’s League", "Bats & Balls", "100% Club", "🏸 Kings", "", undefined])(
    "allows %p",
    (name) => {
      expect(validateCompetitionName(name)).toBeNull();
    }
  );

  it.each(["Who?", "No.1 #Club", "?#"])("rejects %p", (name) => {
    expect(validateCompetitionName(name)).toBe("Name can't contain ? or #");
  });
});
