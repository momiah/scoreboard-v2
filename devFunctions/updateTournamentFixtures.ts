import { db } from "../services/firebase.config";
import { doc, updateDoc } from "firebase/firestore";
import { Fixtures } from "@shared/types";

// Dev function to quickly update tournament fixtures - Paste below in AI and ask to create fixtures

const rearrangedFixtures: Fixtures[] = [
  {
    round: 1,
    games: [
      {
        gameId: "BSFB2-13-05-2026-game-1",
        gameNumber: 1,
        team1: {
          player1: {
            userId: "tTZk2f8ZtrhXcu0eFfN8Jh29pse2",
            firstName: "Mohsin",
            lastName: "Miah",
            username: "ProLikeMo",
            displayName: "Mohsin M",
          },
          player2: {
            userId: "MKADu82VdyeE9WesXigvfgiOA8i1",
            firstName: "Mohammed",
            lastName: "Rahman",
            username: "Coyg",
            displayName: "Mohammed R",
          },
        },
        team2: {
          player1: {
            userId: "fgXVKToEwZfN4fvebO0AiY5V9x62",
            firstName: "Raqeeb",
            lastName: "R",
            username: "Raqeeb",
            displayName: "Raqeeb R",
          },
          player2: {
            userId: "6dqDe01yXEWF3zuR1cFMOCqjmsU2",
            firstName: "Mannan",
            lastName: "Ahmed",
            username: "Bokul",
            displayName: "Mannan A",
          },
        },
        court: 1,
        gamescore: "",
        createdAt: new Date("2026-05-13T16:30:31.669Z"),
        reportedAt: null,
        reportedTime: null,
        createdTime: "17:30",
        approvalStatus: "Scheduled" as const,
        result: null,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
        reporter: "",
        approvers: [],
      },
    ],
  },
  {
    round: 2,
    games: [
      {
        gameId: "BSFB2-13-05-2026-game-4",
        gameNumber: 4,
        team1: {
          player1: {
            userId: "J1M2KijGdpO1cAU7KFN4Q87wn9L2",
            firstName: "Rayyan",
            lastName: "Hoque",
            username: "R4YY4NH",
            displayName: "Rayyan H",
          },
          player2: {
            userId: "ztZwSYVuJBe372e50QBiGQhiwLL2",
            firstName: "Sazzadul",
            lastName: "Hoque",
            username: "Saz68",
            displayName: "Sazzadul H",
          },
        },
        team2: {
          player1: {
            userId: "E1BiKmVNQZf3BVnLbxCDIcFaU9n2",
            firstName: "Saiful",
            lastName: "Haque",
            username: "Saiful",
            displayName: "Saiful H",
          },
          player2: {
            userId: "sQ2awXcLxeQdiXtT6AJvqeFc4hg1",
            firstName: "Wahid",
            lastName: "Jabbar",
            username: "Jabbar",
            displayName: "Wahid J",
          },
        },
        court: 1,
        gamescore: "",
        createdAt: new Date("2026-05-13T16:30:31.670Z"),
        reportedAt: null,
        reportedTime: null,
        createdTime: "17:30",
        approvalStatus: "Scheduled" as const,
        result: null,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
        reporter: "",
        approvers: [],
      },
    ],
  },
];

export const updateTournamentFixtures = async (): Promise<void> => {
  try {
    const tournamentRef = doc(db, "tournaments", "WNB-Week-5-13-05-2026-BSFB2");
    await updateDoc(tournamentRef, { fixtures: rearrangedFixtures });
    console.log("✅ Tournament fixtures updated successfully");
  } catch (error) {
    console.error("❌ Error updating tournament fixtures:", error);
    throw error;
  }
};

// Usage Example

//  <TouchableOpacity
//       onPress={updateTournamentFixtures}
//       style={{ marginBottom: 10 }}
//     >
//       <Text style={{ color: "white" }}>Update Fixtures</Text>
//     </TouchableOpacity>
