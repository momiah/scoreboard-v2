import { useContext, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

import { LADDER_STATUS } from "@shared";
import type { Ladder } from "@shared/types";
import { UserContext } from "../context/UserContext";
import { LadderContext } from "../context/LadderContext";

export type LadderJoinMode = "join" | "participant" | "closed";

interface UseLadderJoinResult {
  isSignedIn: boolean;
  isParticipant: boolean;
  mode: LadderJoinMode;
  requestJoin: () => void;
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

  // Membership lives in the ladderParticipants subcollection, so read it once
  // per ladder/user and fall back to the optimistic session cache.
  const [remoteParticipant, setRemoteParticipant] = useState(false);

  useEffect(() => {
    let active = true;
    if (!ladderId || !userId) {
      setRemoteParticipant(false);
      return;
    }
    checkLadderMembership(ladderId, userId).then((joined) => {
      if (active) setRemoteParticipant(joined);
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
    : registrationClosed
      ? "closed"
      : "join";

  const requestJoin = () => {
    if (mode !== "join") return;
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    if (!ladder) return;
    onOpenModal();
  };

  return { isSignedIn, isParticipant, mode, requestJoin };
};
