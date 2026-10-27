import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  COURT_SUBMISSION_STATUS,
  notificationSchema,
  notificationTypes,
} from "@shared";
import {
  isPendingCourtSubmission,
  isPendingLadderCourtSubmission,
} from "@shared/helpers";

export const MOCK_APPROVED_COORDINATES = { latitude: 51.5, longitude: -0.12 };

const buildSubmissionNotification = ({ submission, courtId, message }) => ({
  ...notificationSchema,
  createdAt: new Date(),
  recipientId: submission.submittedBy,
  senderId: "system",
  message,
  type: notificationTypes.INFORMATION.LADDER.TYPE,
  data: {
    ladderId: submission.ladderId,
    courtId,
    tab: "Matchmaking",
  },
});

const notificationRef = (submittedBy) =>
  doc(collection(db, "users", submittedBy, "notifications"));

const loadPendingCourt = async (courtId, caller) => {
  if (!courtId) throw new Error(`${caller}: courtId is required`);
  const snap = await getDoc(doc(db, "courts", courtId));
  if (!snap.exists()) throw new Error(`${caller}: court ${courtId} not found`);
  const court = { ...snap.data(), courtId };
  if (!court.submission || !isPendingCourtSubmission(court)) {
    throw new Error(`${caller}: court ${courtId} has no pending submission`);
  }
  return court;
};

export const mockApproveCourtSubmission = async ({
  courtId,
  actorUserId,
  coordinates = MOCK_APPROVED_COORDINATES,
}) => {
  const court = await loadPendingCourt(courtId, "mockApproveCourtSubmission");
  const { submission } = court;
  const location = { ...court.location, ...coordinates };

  const batch = writeBatch(db);
  batch.update(doc(db, "courts", courtId), {
    courtName: court.courtName,
    location,
    verified: true,
    verifiedBy: actorUserId,
    verifiedAt: serverTimestamp(),
    updatedBy: actorUserId,
    updatedAt: serverTimestamp(),
    submission: {
      ...submission,
      status: COURT_SUBMISSION_STATUS.APPROVED,
      reviewedBy: actorUserId,
      reviewedAt: new Date(),
    },
  });
  batch.update(doc(db, "ladders", submission.ladderId), {
    courtIds: arrayUnion(courtId),
  });
  batch.set(
    notificationRef(submission.submittedBy),
    buildSubmissionNotification({
      submission,
      courtId,
      message: `${court.courtName} has been approved. You can now select it in ${submission.ladderName}.`,
    }),
  );
  await batch.commit();
  return { courtId, status: COURT_SUBMISSION_STATUS.APPROVED };
};

export const mockRejectCourtSubmission = async ({ courtId }) => {
  const court = await loadPendingCourt(courtId, "mockRejectCourtSubmission");
  const { submission } = court;

  const batch = writeBatch(db);
  batch.delete(doc(db, "courts", courtId));
  batch.set(
    notificationRef(submission.submittedBy),
    buildSubmissionNotification({
      submission,
      courtId,
      message: `${court.courtName} was not accepted for ${submission.ladderName}.`,
    }),
  );
  await batch.commit();
  return { courtId, status: "deleted" };
};

export const findOwnPendingCourtId = async ({
  userId,
  ladderId,
  courtName,
}) => {
  const snap = await getDocs(
    query(collection(db, "courts"), where("submittedBy", "==", userId)),
  );
  const match = snap.docs.find(
    (d) =>
      d.data().courtName === courtName &&
      isPendingLadderCourtSubmission(d.data(), ladderId),
  );
  if (!match) {
    throw new Error(
      `findOwnPendingCourtId: no pending "${courtName}" submission for ${ladderId}`,
    );
  }
  return match.id;
};
