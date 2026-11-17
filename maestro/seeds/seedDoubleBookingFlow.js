import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
  normalizeTeamKey,
} from "@shared";
import { postedMatchDocument, seedFixtureUser } from "./homeCourtFixtures";
import {
  CANCEL_VARIANT,
  MAESTRO_CANCEL_LADDER_ID,
  MAESTRO_CANCEL_MATCH_ID,
  MAESTRO_CANCEL_OPPONENT_ID,
  seedMatchCancellationFlow,
} from "./seedMatchCancellationFlow";
import { deleteFixtureUserSubcollections } from "./fixtureUserCleanup";
import { LADDER_MATCH_CLASH_WINDOW_MINUTES } from "../../helpers/ladderMatchClash";

export const MAESTRO_DOUBLE_BOOKING_LADDER_ID = "maestro-double-booking-doubles";
export const MAESTRO_DOUBLE_BOOKING_LADDER_NAME =
  "Maestro Double Booking Doubles";
export const MAESTRO_DOUBLE_BOOKING_MATCH_ID = "maestro-double-booking-match";

export const DOUBLE_BOOKING_VARIANT = {
  /** The doubles match starts inside the clash window of the singles match. */
  CLASH: "clash",
  /** The doubles match starts a full window after the singles match. */
  CLEAR: "clear",
};

const fixture = (suffix, lastName) => ({
  userId: `maestro-double-booking-${suffix}`,
  firstName: "Maestro",
  lastName,
  username: `maestro_double_booking_${suffix}`,
});
const partner = fixture("partner", "BookingPartner");
const opp1 = fixture("opp1", "BookingOppOne");
const opp2 = fixture("opp2", "BookingOppTwo");
export const MAESTRO_DOUBLE_BOOKING_FIXTURE_USER_IDS = [partner, opp1, opp2].map(
  (user) => user.userId,
);

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

const addMinutes = (start, minutes) => {
  const [hours, mins] = start.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

const deleteDoublesTree = async () => {
  const matches = await getDocs(
    collection(db, "ladders", MAESTRO_DOUBLE_BOOKING_LADDER_ID, "ladderMatches"),
  );
  await Promise.all(matches.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "ladders", MAESTRO_DOUBLE_BOOKING_LADDER_ID));
};

/**
 * The test user can accept the opponent's posted singles match on the Maestro
 * Cancel Ladder, but is already booked into an accepted doubles match on a
 * second ladder on the same day: inside the clash window (CLASH) or a full
 * window later (CLEAR).
 */
export const seedDoubleBookingFlow = async ({
  testUser,
  variant = DOUBLE_BOOKING_VARIANT.CLASH,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedDoubleBookingFlow: testUser with a userId is required");
  }
  await seedMatchCancellationFlow({
    testUser,
    variant: CANCEL_VARIANT.OPPONENT_POSTED_OPEN,
  });
  await Promise.all(
    [partner, opp1, opp2].map((user) =>
      seedFixtureUser(user, `${user.username.replace(/_/g, "-")}@example.com`),
    ),
  );
  await deleteDoublesTree();

  await setDoc(doc(db, "ladders", MAESTRO_DOUBLE_BOOKING_LADDER_ID), {
    ladderId: MAESTRO_DOUBLE_BOOKING_LADDER_ID,
    name: MAESTRO_DOUBLE_BOOKING_LADDER_NAME,
    description:
      "Seeded by maestro/seeds/seedDoubleBookingFlow for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: "Mixed",
    courtIds: [],
    status: LADDER_STATUS.REGISTRATION_OPEN,
    registrationOpensAt: daysFromNow(-5),
    registrationClosesAt: daysFromNow(7),
    seasonStartsAt: daysFromNow(-5),
    playoffStartsAt: daysFromNow(50),
    entryFee: 0,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers: 2048,
    participantCount: 2,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: new Date(),
    updatedBy: testUser.userId,
    updatedAt: new Date(),
  });

  const userTeam = [testUser.userId, partner.userId];
  const opponentTeam = [opp1.userId, opp2.userId];
  const teams = [userTeam, opponentTeam].map((playerIds) => {
    const teamKey = normalizeTeamKey(playerIds);
    return { teamId: teamKey, teamKey, playerIds };
  });
  const singles = postedMatchDocument({
    matchId: MAESTRO_CANCEL_MATCH_ID,
    createdBy: MAESTRO_CANCEL_OPPONENT_ID,
    participants: [MAESTRO_CANCEL_OPPONENT_ID],
    ladderType: LADDER_TYPE.SINGLES,
  });
  const offsetMinutes =
    variant === DOUBLE_BOOKING_VARIANT.CLASH
      ? LADDER_MATCH_CLASH_WINDOW_MINUTES / 2
      : LADDER_MATCH_CLASH_WINDOW_MINUTES * 2;
  const doubles = postedMatchDocument({
    matchId: MAESTRO_DOUBLE_BOOKING_MATCH_ID,
    createdBy: testUser.userId,
    participants: [...userTeam, ...opponentTeam],
    ladderType: LADDER_TYPE.DOUBLES,
    teams,
  });
  await setDoc(
    doc(
      db,
      "ladders",
      MAESTRO_DOUBLE_BOOKING_LADDER_ID,
      "ladderMatches",
      MAESTRO_DOUBLE_BOOKING_MATCH_ID,
    ),
    {
      ...doubles,
      matchTime: { start: addMinutes(singles.matchTime.start, offsetMinutes) },
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      acceptedBy: opp1.userId,
      acceptedAt: new Date(),
    },
  );
  return {
    ladderId: MAESTRO_CANCEL_LADDER_ID,
    doublesLadderId: MAESTRO_DOUBLE_BOOKING_LADDER_ID,
    variant,
  };
};

export const cleanupDoubleBookingTestData = async () => {
  await deleteDoublesTree();
  await deleteFixtureUserSubcollections(MAESTRO_DOUBLE_BOOKING_FIXTURE_USER_IDS);
  await Promise.all(
    MAESTRO_DOUBLE_BOOKING_FIXTURE_USER_IDS.map((id) =>
      deleteDoc(doc(db, "users", id)),
    ),
  );
  return { ladders: [MAESTRO_DOUBLE_BOOKING_LADDER_ID] };
};
