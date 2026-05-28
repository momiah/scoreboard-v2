import { getFirestore, collection, addDoc } from "firebase/firestore";

const seedReportedVideos = async (
  videoId: string,
  reporterUserIds: string[],
) => {
  const db = getFirestore();
  const reasons = [
    "Inappropriate content",
    "Fake or edited footage",
    "Wrong game",
    "Harassment",
  ];

  for (let index = 0; index < reporterUserIds.length; index++) {
    await addDoc(collection(db, "reportedVideos"), {
      videoId,
      gameId: videoId.split("_")[0],
      reason: reasons[index % reasons.length],
      reportedBy: {
        userId: reporterUserIds[index],
        username: `testuser${index + 1}`,
      },
      videoUrl: "",
      competitionId: "",
      competitionName: "",
      status: "pending",
      createdAt: new Date(),
    });
    console.log(
      `[seedReportedVideos] Written report ${index + 1} of ${reporterUserIds.length}`,
    );
  }

  console.log("[seedReportedVideos] Done");
};

seedReportedVideos("8S45H-17-03-2026-game-1_tTZk2f8ZtrhXcu0eFfN8Jh29pse2", [
  "fake-user-1",
  "fake-user-2",
  "fake-user-3",
  "fake-user-4",
]);

//EXAMPLE USAGE:
// <TouchableOpacity
//   onPress={() =>
//     seedReportedVideos(
//       "8S45H-17-03-2026-game-1_tTZk2f8ZtrhXcu0eFfN8Jh29pse2",
//       ["fake-user-1", "fake-user-2", "fake-user-3", "fake-user-4"],
//     )
//   }
//   style={{ padding: 16 }}
// >
//   <Text style={{ color: "white" }}>Seed Reported Videos</Text>
// </TouchableOpacity>
