import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { sendNotification } from "./helpers/sendNotification";
import { notificationTypes } from "@shared";

const REPORT_THRESHOLD = 4;

export const onVideoReported = onDocumentCreated(
  "reportedVideos/{reportId}",
  async (event) => {
    const reportData = event.data?.data();
    if (!reportData) return;

    const { videoId } = reportData;
    if (!videoId) return;

    const db = getFirestore();

    try {
      // ── Count all reports for this video ──────────────────────────────────
      const reportsSnapshot = await db
        .collection("reportedVideos")
        .where("videoId", "==", videoId)
        .get();

      if (reportsSnapshot.size <= REPORT_THRESHOLD) return;

      // ── Take down the video atomically ────────────────────────────────────
      const videoRef = db.collection("gameVideos").doc(videoId);
      let wasApproved = false;
      let videoData: FirebaseFirestore.DocumentData | undefined;

      await db.runTransaction(async (transaction) => {
        const videoDoc = await transaction.get(videoRef);
        if (!videoDoc.exists) return;
        if (!videoDoc.data()?.videoApproved) return;
        wasApproved = true;
        videoData = videoDoc.data();
        transaction.update(videoRef, { videoApproved: false });
      });

      if (!wasApproved || !videoData) return;

      // ── Notify the uploader ───────────────────────────────────────────────
      const uploaderId = videoData?.postedBy?.userId;
      if (!uploaderId) return;

      // ── Check notification not already sent for this video ────────────────
      const existingNotif = await db
        .collection("users")
        .doc(uploaderId)
        .collection("notifications")
        .where("data.videoId", "==", videoId)
        .where("type", "==", notificationTypes.INFORMATION.VIDEO_REMOVED.TYPE)
        .limit(1)
        .get();

      if (!existingNotif.empty) return;

      await sendNotification({
        recipientId: uploaderId,
        title: "Video removed",
        message:
          "Your video has been removed due to multiple reports from the community.",
        type: notificationTypes.INFORMATION.VIDEO_REMOVED.TYPE,
        createdAt: new Date(),
        isRead: false,
        senderId: "system",
        response: "",
        data: {
          userId: uploaderId,
          videoId,
          tab: "Videos",
          competitionId: videoData?.competitionId ?? "",
          competitionName: videoData?.competitionName ?? "",
        },
      });
    } catch (error) {
      console.error("[onVideoReported] Error:", error);
    }
  },
);
