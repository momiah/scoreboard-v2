const mockDocs = new Map();

jest.mock("../../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => ({ path: path.join("/") }),
  doc: (parent, ...path) => ({
    path: [parent?.path, ...path].filter(Boolean).join("/"),
  }),
  deleteDoc: async () => undefined,
  getDocs: async () => ({ docs: [] }),
  query: (ref) => ref,
  where: () => ({}),
  setDoc: async (ref, data) => mockDocs.set(ref.path, data),
  writeBatch: () => {
    const writes = [];
    return {
      set: (ref, data) => writes.push([ref.path, data]),
      delete: () => undefined,
      commit: async () => writes.forEach(([path, data]) => mockDocs.set(path, data)),
    };
  },
}));

import {
  LADDER_MIN_ENTRANTS_TO_START,
  LADDER_STATUS,
  deriveExtendedLadderDates,
  getLadderSeasonStartStep,
  isLadderSeasonStarted,
} from "@shared";
import {
  MAESTRO_SEASON_LADDER_ID,
  MAESTRO_SEASON_SHORTFALL,
  SEASON_VARIANT,
  seedLadderSeasonStart,
} from "./seedLadderSeasonStart";

const testUser = {
  userId: "test-user",
  firstName: "Test",
  lastName: "User",
  username: "tester",
};

const LADDER_PATH = `ladders/${MAESTRO_SEASON_LADDER_ID}`;
const ladder = () => mockDocs.get(LADDER_PATH);
const participants = () =>
  [...mockDocs.keys()].filter((path) =>
    path.startsWith(`${LADDER_PATH}/ladderParticipants/`),
  );
const seasonNotification = () =>
  mockDocs.get(
    `users/test-user/notifications/maestro-season-${MAESTRO_SEASON_LADDER_ID}`,
  );

beforeEach(() => mockDocs.clear());

describe("seedLadderSeasonStart", () => {
  it("seeds a ladder before its season start, short of the minimum", async () => {
    await seedLadderSeasonStart({ testUser });

    expect(isLadderSeasonStarted(ladder())).toBe(false);
    expect(ladder().seasonStartsAt.getTime()).toBeGreaterThan(Date.now());
    expect(participants()).toHaveLength(
      LADDER_MIN_ENTRANTS_TO_START - MAESTRO_SEASON_SHORTFALL,
    );
    expect(ladder().participantCount).toBe(participants().length);
    expect(seasonNotification()).toBeUndefined();
  });

  it("seeds a moved-back start the way processLadderPhases leaves it", async () => {
    await seedLadderSeasonStart({ testUser, variant: SEASON_VARIANT.EXTENDED });

    expect(isLadderSeasonStarted(ladder())).toBe(false);
    expect(ladder().seasonExtendedAt.getTime()).toBeLessThan(Date.now());
    expect(ladder().seasonStartsAt.getTime()).toBeGreaterThan(Date.now());
    expect(
      getLadderSeasonStartStep(
        {
          ...ladder(),
          seasonExtendedAt: undefined,
          seasonStartsAt: ladder().seasonExtendedAt,
        },
        participants().length,
        ladder().seasonExtendedAt.getTime(),
      ),
    ).toBe("extend");
    expect(
      deriveExtendedLadderDates(ladder().seasonExtendedAt).playoffStartsAt,
    ).toEqual(ladder().playoffStartsAt);
    expect(seasonNotification().message).toContain(
      `needs ${MAESTRO_SEASON_SHORTFALL} more players`,
    );
  });

  it("seeds a started season with the minimum entrants", async () => {
    await seedLadderSeasonStart({ testUser, variant: SEASON_VARIANT.STARTED });

    expect(isLadderSeasonStarted(ladder())).toBe(true);
    expect(participants()).toHaveLength(LADDER_MIN_ENTRANTS_TO_START);
    expect(
      getLadderSeasonStartStep(
        { ...ladder(), seasonStartedAt: undefined },
        participants().length,
        Date.now(),
      ),
    ).toBe("start");
    expect(seasonNotification().title).toBe("The season has started");
  });

  it("seeds a ladder cancelled at its moved-back start", async () => {
    await seedLadderSeasonStart({ testUser, variant: SEASON_VARIANT.CANCELLED });

    expect(ladder().status).toBe(LADDER_STATUS.CANCELLED);
    expect(ladder().seasonStartsAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(
      getLadderSeasonStartStep(
        { ...ladder(), status: LADDER_STATUS.REGISTRATION_OPEN },
        participants().length,
        Date.now(),
      ),
    ).toBe("cancel");
    expect(seasonNotification().title).toBe("Ladder cancelled");
  });
});
