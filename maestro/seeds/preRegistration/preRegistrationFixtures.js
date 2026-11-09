import {
  GENDER_TYPE,
  LADDER_PRE_REGISTRATION_STATUS,
  LADDER_TYPE,
  formatCurrency,
  getLadderPlayoffStructure,
} from "@shared";
import { Country } from "country-state-city";
import {
  formatLadderPrizePool,
  getLadderEligibilityRule,
  getFullLadderPrizeTable,
  getLadderEntrantNoun,
  getLadderLocation,
  getLadderPreRegistrationShareUrl,
  getLadderTitle,
  isCashLadder,
} from "@shared/helpers";
import { getPlatformFeeFootnote } from "../../../helpers/ladderPreRegistrationDisplay";

export const MAESTRO_PREREG_PREFIX = "maestro-prereg-";
export const MAESTRO_PREREG_BACKUP_ID = "maestro-prereg-live-status-backup";
export const MAESTRO_PREREG_LAUNCHED_LADDER_ID = "maestro-prereg-launched-ladder";
export const MAESTRO_PREREG_LAUNCH_LADDER_ID = "maestro-prereg-launch-ladder";
export const MAESTRO_PREREG_UNKNOWN_ID = "maestro-prereg-does-not-exist";

const OPEN = LADDER_PRE_REGISTRATION_STATUS.OPEN;
const DAY_MS = 24 * 60 * 60 * 1000;

const shared = {
  description:
    "A Maestro test ladder. Climb the regional rankings and play for the prize pool.",
  image: "",
  region: "United Kingdom",
  countryCode: "GB",
  currencyType: "GBP",
};

export const PREREG_FIXTURES = {
  cashDoubles: {
    preRegistrationId: "maestro-prereg-cash-doubles",
    name: "Maestro Manchester Men's Doubles",
    city: "Manchester",
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: GENDER_TYPE.MENS,
    entryFee: 20,
    maxPlayers: 256,
    status: OPEN,
    registrants: 5,
  },
  cashSingles: {
    preRegistrationId: "maestro-prereg-cash-singles",
    name: "Maestro Birmingham Men's Singles",
    city: "Birmingham",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: GENDER_TYPE.MENS,
    entryFee: 20,
    maxPlayers: 1024,
    status: OPEN,
    registrants: 2,
  },
  communityDoubles: {
    preRegistrationId: "maestro-prereg-community-doubles",
    name: "Maestro Leeds Doubles",
    city: "Leeds",
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: GENDER_TYPE.MIXED,
    entryFee: 0,
    maxPlayers: 128,
    status: OPEN,
    registrants: 2,
  },
  communitySingles: {
    preRegistrationId: "maestro-prereg-community-singles",
    name: "Maestro Bristol Women's Singles",
    city: "Bristol",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: GENDER_TYPE.WOMENS,
    entryFee: 0,
    maxPlayers: 512,
    status: OPEN,
    registrants: 0,
  },
  closed: {
    preRegistrationId: "maestro-prereg-closed",
    name: "Maestro Cardiff Doubles",
    city: "Cardiff",
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: GENDER_TYPE.MIXED,
    entryFee: 0,
    maxPlayers: 256,
    status: LADDER_PRE_REGISTRATION_STATUS.CLOSED,
    registrants: 0,
  },
  overseas: {
    preRegistrationId: "maestro-prereg-overseas",
    name: "Maestro Dublin Singles",
    region: "Ireland",
    city: "Dublin",
    countryCode: "IE",
    currencyType: "EUR",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: GENDER_TYPE.MIXED,
    entryFee: 0,
    maxPlayers: 128,
    status: LADDER_PRE_REGISTRATION_STATUS.CLOSED,
    registrants: 0,
  },
  launched: {
    preRegistrationId: "maestro-prereg-launched",
    name: "Maestro Glasgow Men's Singles",
    city: "Glasgow",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: GENDER_TYPE.MENS,
    entryFee: 20,
    maxPlayers: 512,
    status: LADDER_PRE_REGISTRATION_STATUS.LAUNCHED,
    registrants: 1,
  },
};

export const PREREG_FIXTURE_IDS = Object.values(PREREG_FIXTURES).map(
  ({ preRegistrationId }) => preRegistrationId,
);

export const OPEN_FIXTURE_KEYS = [
  "cashDoubles",
  "cashSingles",
  "communityDoubles",
  "communitySingles",
];

export const CASH_FIXTURE_KEYS = OPEN_FIXTURE_KEYS.filter((key) =>
  isCashLadder(PREREG_FIXTURES[key]),
);

export const isFixturePreRegistrationId = (id) =>
  id.startsWith(MAESTRO_PREREG_PREFIX);

const padded = (n) => String(n).padStart(2, "0");

export const registrantUserIds = () => {
  let next = 1;
  return Object.fromEntries(
    Object.entries(PREREG_FIXTURES).map(([key, { registrants }]) => [
      key,
      Array.from({ length: registrants }, () => `maestro-prereg-u-${padded(next++)}`),
    ]),
  );
};

export const PREREG_FIXTURE_USER_IDS = Object.values(registrantUserIds()).flat();

export const fixtureUserFor = (userId) => {
  const n = userId.slice(-2);
  return {
    userId,
    firstName: "Maestro",
    lastName: `Registrant ${n}`,
    username: `mpreg-${n}`,
  };
};

export const buildPreRegistrationDoc = (key, { actorUserId, now }) => {
  const { preRegistrationId, registrants, status, ...details } =
    PREREG_FIXTURES[key];
  const launched = status === LADDER_PRE_REGISTRATION_STATUS.LAUNCHED;
  return {
    ...shared,
    ...details,
    status,
    expectedOpensAt: new Date(now.getTime() + 30 * DAY_MS),
    ladderId: launched ? MAESTRO_PREREG_LAUNCHED_LADDER_ID : null,
    notifiedAt: launched ? new Date(now.getTime() - DAY_MS) : null,
    createdBy: actorUserId,
    createdAt: new Date(now.getTime() - 7 * DAY_MS),
    updatedBy: actorUserId,
    updatedAt: launched ? new Date(now.getTime() - 2 * DAY_MS) : new Date(now.getTime() - 7 * DAY_MS),
  };
};

const ladderOf = (key) => ({ ...shared, ...PREREG_FIXTURES[key] });

/** The pre-register button a user from another country sees on the overseas fixture. */
export const otherCountryLabel = (key) =>
  `Only for players in ${Country.getCountryByCode(ladderOf(key).countryCode)?.name}`;

/** The strings the app renders for a fixture, computed with the same helpers the screens use. */
export const expectedFor = (key, { registrantCount }) => {
  const ladder = ladderOf(key);
  const cash = isCashLadder(ladder);
  const noun = getLadderEntrantNoun(ladder.ladderType);
  const { inTheMoney, playoffSpots } = getLadderPlayoffStructure(
    ladder.maxPlayers,
  );
  const size = `${ladder.maxPlayers.toLocaleString("en-GB")} ${noun}s`;
  const table = getFullLadderPrizeTable(ladder);
  const values = {
    title: getLadderTitle(ladder),
    pool: formatLadderPrizePool(ladder),
    meta: cash
      ? `${size} · Top ${inTheMoney} ${noun === "team" ? "teams " : ""}paid`
      : `${size} · Top ${inTheMoney} win CP`,
    location: getLadderLocation(ladder),
    entry: cash ? `${formatCurrency(ladder.entryFee, ladder.currencyType)}*` : "Free",
    entryCaption: cash ? (noun === "team" ? "entry per team" : "entry") : "to enter",
    registrants:
      registrantCount === 0
        ? `Be the first ${noun} to pre-register`
        : `${registrantCount.toLocaleString("en-GB")} pre-registered`,
    share: getLadderPreRegistrationShareUrl(ladder.preRegistrationId),
    firstPlace: table[0].label,
    firstPrize: cash
      ? formatCurrency(table[0].cash, ladder.currencyType)
      : table[0].cp.toLocaleString("en-GB"),
    lastPlace: table[table.length - 1].label,
    entrants: noun === "team" ? "teams" : "players",
    objective: `Top ${playoffSpots}`,
    seasonRounds: `${Math.log2(playoffSpots)} rounds`,
    seasonPlayoffs: `The top ${playoffSpots} ${noun}s play a knockout.`,
  };
  if (cash) values.footnote = `18+ only. ${getPlatformFeeFootnote(ladder)}`;
  else values.eligibilityRule = getLadderEligibilityRule(ladder);
  return values;
};

const kebab = (key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export const flattenExpected = (byKey) =>
  Object.fromEntries(
    Object.entries(byKey).flatMap(([key, values]) =>
      Object.entries(values).map(([field, value]) => [
        `${kebab(key)}-${kebab(field)}`,
        value,
      ]),
    ),
  );
