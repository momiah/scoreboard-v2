import { useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

import { LADDER_STATUS } from "@shared";
import type { Ladder } from "@shared/types";
import { UserContext } from "../context/UserContext";
import { isLadderParticipant } from "../helpers/ladderParticipants";

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
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const isSignedIn = !!currentUser?.userId;
  const isParticipant = isLadderParticipant(
    ladder?.ladderParticipants,
    currentUser?.userId,
  );

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
