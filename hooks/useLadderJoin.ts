import { useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

import type { Ladder } from "@shared/types";
import { UserContext } from "../context/UserContext";
import { isLadderParticipant } from "../helpers/ladderParticipants";

interface UseLadderJoinResult {
  isSignedIn: boolean;
  isParticipant: boolean;
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

  const requestJoin = () => {
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    if (!ladder) return;
    onOpenModal();
  };

  return { isSignedIn, isParticipant, requestJoin };
};
