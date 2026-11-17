import { useContext, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

import { LADDER_STATUS, LADDER_TYPE } from "@shared";
import {
  LADDER_INACTIVITY_REMOVED_LABEL,
  isLadderInactivityRemovedUser,
} from "@shared/helpers";
import type { Ladder } from "@shared/types";
import { UserContext } from "../context/UserContext";
import { LadderContext } from "../context/LadderContext";

export type LadderJoinMode = "join" | "participant" | "removed" | "closed";

/** What the join button says when the user can't join. */
export const LADDER_JOIN_MODE_LABELS: Record<Exclude<LadderJoinMode, "join">, string> = {
  participant: "Participant",
  removed: LADDER_INACTIVITY_REMOVED_LABEL,
  closed: "Registration Closed",
};

interface UseLadderJoinResult {
  isSignedIn: boolean;
  isParticipant: boolean;
  membershipChecking: boolean;
  mode: LadderJoinMode;
  openJoin: () => void;
}

export const useLadderJoin = (
  ladder: Ladder | null | undefined,
  onOpenModal: () => void,
): UseLadderJoinResult => {
  const { currentUser } = useContext(UserContext);
  const { joinedLadderIds, checkLadderMembership } = useContext(LadderContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const isSignedIn = !!currentUser?.userId;
  const ladderId = ladder?.ladderId;
  const userId = currentUser?.userId;

  const [remoteParticipant, setRemoteParticipant] = useState(false);
  const [membershipChecking, setMembershipChecking] = useState(
    !!ladderId && !!userId,
  );

  useEffect(() => {
    let active = true;
    if (!ladderId || !userId) {
      setRemoteParticipant(false);
      setMembershipChecking(false);
      return;
    }
    setMembershipChecking(true);
    checkLadderMembership(ladderId, userId)
      .then((joined) => {
        if (active) setRemoteParticipant(joined);
      })
      .finally(() => {
        if (active) setMembershipChecking(false);
      });
    return () => {
      active = false;
    };
  }, [ladderId, userId, checkLadderMembership]);

  const isParticipant =
    remoteParticipant || (!!ladderId && joinedLadderIds.includes(ladderId));

  const registrationClosed =
    !!ladder && ladder.status !== LADDER_STATUS.REGISTRATION_OPEN;

  const mode: LadderJoinMode = isParticipant
    ? "participant"
    : isLadderInactivityRemovedUser(ladder, userId)
      ? "removed"
      : registrationClosed
        ? "closed"
        : "join";

  const openJoin = () => {
    if (mode !== "join") return;
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    if (!ladder) return;
    if (ladder.ladderType === LADDER_TYPE.DOUBLES) {
      navigation.navigate("SelectDoublesTeam", { ladder });
      return;
    }
    onOpenModal();
  };

  return { isSignedIn, isParticipant, membershipChecking, mode, openJoin };
};
