import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { REPORTS_COLLECTION } from "@shared/types";
import type { AccountStrikeReport, AccountStrikes } from "@shared/helpers";
import { ACCOUNT_STRIKE_LIMIT, ACCOUNT_STRIKE_MONTHS, getAccountStrikes } from "@shared/helpers";
import { db } from "../services/firebase.config";

export const ACCOUNT_BLOCKED_MESSAGE = `You can't join ladders right now: you've had ${ACCOUNT_STRIKE_LIMIT} strikes upheld in the last ${ACCOUNT_STRIKE_MONTHS} months. Strikes stop counting ${ACCOUNT_STRIKE_MONTHS} months after they're given.`;

export const TEAM_ACCOUNT_BLOCKED_MESSAGE = `Your team can't join ladders right now: one of you has had ${ACCOUNT_STRIKE_LIMIT} strikes upheld in the last ${ACCOUNT_STRIKE_MONTHS} months.`;

export const fetchAccountStrikes = async (
  userId: string,
  now: Date = new Date(),
): Promise<AccountStrikes> => {
  const [profile, reports] = await Promise.all([
    getDoc(doc(db, "users", userId)),
    getDocs(
      query(
        collection(db, REPORTS_COLLECTION),
        where("target.userIds", "array-contains", userId),
      ),
    ),
  ]);
  return getAccountStrikes({
    reports: reports.docs.map((report) => ({
      ...(report.data() as AccountStrikeReport),
      reportId: report.id,
    })),
    userId,
    now,
    liftedAt: profile.data()?.ladderBlockLiftedAt ?? null,
  });
};

export const findBlockedUserIds = async (
  userIds: string[],
  now: Date = new Date(),
): Promise<string[]> => {
  const results = await Promise.all(
    userIds.map(async (userId) => ({ userId, strikes: await fetchAccountStrikes(userId, now) })),
  );
  return results.filter((result) => result.strikes.blocked).map((result) => result.userId);
};
