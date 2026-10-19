import { LADDER_TYPE } from "@shared";

/** "team" in a doubles ladder, "player" in singles. */
export const ladderEntrantNoun = (ladderType?: string): "team" | "player" =>
  ladderType === LADDER_TYPE.DOUBLES ? "team" : "player";
