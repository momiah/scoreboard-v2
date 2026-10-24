import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { REPORTS_COLLECTION } from "@shared";

/**
 * @param {{
 *   matchId: string;
 *   reason: string;
 *   reportedBy?: string;
 *   targetUserIds?: readonly string[];
 *   targetType?: string;
 *   description?: string;
 *   count?: number;
 * }} expected
 */
export const assertReportFiled = async ({
  matchId,
  reportedBy,
  reason,
  targetUserIds,
  targetType,
  description,
  count = 1,
}) => {
  const snap = await getDocs(
    query(
      collection(db, REPORTS_COLLECTION),
      where("ladderMatchId", "==", matchId),
    ),
  );
  const reports = snap.docs
    .map((d) => d.data())
    .filter((report) => report.reason === reason);
  if (reports.length !== count) {
    throw new Error(`Expected ${count} "${reason}" report(s), found ${reports.length}`);
  }
  const [report] = reports;
  if (report.status !== "pending") throw new Error(`Report status was ${report.status}`);
  if (reportedBy && report.reportedBy !== reportedBy) {
    throw new Error("Report was filed by the wrong user");
  }
  if (targetType && report.target?.type !== targetType) {
    throw new Error(`Report target type was ${report.target?.type}`);
  }
  if (
    targetUserIds &&
    [...(report.target?.userIds ?? [])].sort().join(",") !==
      [...targetUserIds].sort().join(",")
  ) {
    throw new Error(`Report targeted ${(report.target?.userIds ?? []).join(",")}`);
  }
  if (description && report.description !== description) {
    throw new Error("Report description was not stored");
  }
  return { reason, count };
};
