import { LADDER_TERMS } from "./LadderTermsContent";
import { rulesFor } from "./ladderRulesContent";
import type { TextBlock } from "./FormattedBlocks";

const MAX_CHARS = 240;

const pieces = (blocks: TextBlock[]): string[] =>
  blocks.flatMap((block) => (typeof block === "string" ? [block] : block));

describe("ladder rules and terms are easy to read", () => {
  const sections = [
    ...LADDER_TERMS.map(({ title, body }) => ({ title, body })),
    ...rulesFor("player").map(({ title, body }) => ({ title, body })),
    ...rulesFor("team").map(({ title, body }) => ({ title, body })),
  ];

  it.each(sections.map((section) => [section.title, section] as const))(
    "%s has no large chunk of text",
    (_title, section) => {
      pieces(section.body).forEach((text) => {
        expect(text.length).toBeLessThanOrEqual(MAX_CHARS);
      });
    },
  );

  it("splits every section into more than one paragraph or point unless it is a single sentence", () => {
    sections.forEach((section) => {
      const text = pieces(section.body);
      if (text.join(" ").length > 140) {
        expect(text.length).toBeGreaterThan(1);
      }
    });
  });

  it("states the playoff timings from shared rather than numbers of its own", () => {
    const playoff = rulesFor("player")
      .filter((section) =>
        /Playoff matches|Arranging|time runs out/.test(section.title),
      )
      .flatMap((section) => pieces(section.body))
      .join(" ");
    expect(playoff).toMatch(/within \d+ days/);
    expect(playoff).toMatch(/within \d+ hours, the match is accepted for them/);
    expect(playoff).toMatch(/within \d+ hours of the tie starting/);
  });
});
