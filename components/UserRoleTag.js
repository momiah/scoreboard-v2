// screens/Home/Leagues/UserRoleTag.tsx
import React from "react";
import Tag from "./Tag";

const CLOSED_LABELS = {
  ended: "Ended",
  full: "Full",
  fixtures: "Entries Closed",
};

const UserRoleTag = ({
  userRole,
  onInvitePress,
  onLoginPress,
  onRequestJoinPress,
  isJoining = false,
  closedReason = null,
}) => {
  if (userRole === "user" && closedReason) {
    return (
      <Tag
        name={CLOSED_LABELS[closedReason]}
        color="#4a4a4aff"
        iconColor="white"
        iconSize={15}
        icon="lock-closed-outline"
        iconPosition="right"
        disabled
        bold
      />
    );
  }

  switch (userRole) {
    case "participant":
      return (
        <Tag
          name="Participant"
          color="#16181B"
          iconColor="green"
          iconSize={15}
          icon="checkmark-circle-outline"
          iconPosition="right"
          bold
        />
      );
    case "admin":
      return (
        <Tag
          name="Invite Players"
          color="#00A2FF"
          icon="paper-plane-sharp"
          onPress={onInvitePress}
          bold
        />
      );
    case "hide":
      return (
        <Tag
          name="Log in to join league"
          color="#00A2FF"
          iconColor="white"
          iconSize={15}
          icon="log-in-outline"
          iconPosition="right"
          onPress={onLoginPress}
          bold
        />
      );
    case "user":
      return (
        <Tag
          name={isJoining ? "Sending..." : "Request To Join"}
          color="#00A2FF"
          iconColor="white"
          iconSize={15}
          icon="person-add-outline"
          iconPosition="right"
          onPress={isJoining ? undefined : onRequestJoinPress}
          disabled={isJoining}
          loading={isJoining}
          bold
        />
      );
    case "invitationPending":
      return (
        <Tag
          name="Invitation Pending"
          color="#4a4a4aff"
          iconColor="white"
          iconSize={15}
          icon="time-outline"
          iconPosition="right"
          bold
        />
      );
    case "requestPending":
      return (
        <Tag
          name="Request Pending"
          color="#4a4a4aff"
          iconColor="white"
          iconSize={15}
          icon="time-outline"
          iconPosition="right"
          bold
        />
      );
    default:
      return null;
  }
};

export default UserRoleTag;
