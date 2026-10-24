import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { notificationTypes } from "@shared";

export const assertTeamInviteSent = async ({ recipientId, teamName }) => {
  const notifications = await getDocs(
    query(
      collection(db, "users", recipientId, "notifications"),
      where("type", "==", notificationTypes.ACTION.INVITE.TEAM),
    ),
  );
  const invite = notifications.docs
    .map((d) => d.data())
    .find((data) => data.data?.teamId);
  if (!invite) throw new Error(`No team invite notification for ${recipientId}`);
  const teams = await getDocs(
    query(collection(db, "teams"), where("teamName", "==", teamName)),
  );
  const team = teams.docs
    .map((d) => d.data())
    .find((data) => data.teamId === invite.data.teamId);
  if (!team) throw new Error(`Invite points at a team that is not "${teamName}"`);
  if (team.status !== "pending") {
    throw new Error(`Invited team should be pending, was ${team.status}`);
  }
  if (!team.playerIds?.includes(recipientId)) {
    throw new Error("Invitee was not added to the team");
  }
  return { teamId: team.teamId, status: team.status };
};
