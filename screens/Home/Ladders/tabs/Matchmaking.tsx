import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";

import type { Ladder } from "@shared/types";

import { useLadderJoin } from "../../../../hooks/useLadderJoin";
import AddLadderMatchModal from "../../../../components/Modals/AddLadderMatchModal";

interface MatchmakingProps {
  ladder: Ladder;
}

const Matchmaking: React.FC<MatchmakingProps> = ({ ladder }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [postModalVisible, setPostModalVisible] = useState(false);

  const { isSignedIn, isParticipant } = useLadderJoin(ladder, () =>
    setPostModalVisible(true),
  );

  const nonParticipant = isSignedIn && !isParticipant;
  const buttonLabel = nonParticipant
    ? "Join the ladder to post"
    : "Post a Match";

  const handlePostMatch = () => {
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    if (!isParticipant) return;
    setPostModalVisible(true);
  };

  return (
    <Container testID="ladder-matchmaking">
      <PostButton
        testID="matchmaking-post-match"
        activeOpacity={0.85}
        disabled={nonParticipant}
        isDisabled={nonParticipant}
        onPress={handlePostMatch}
      >
        <PostButtonText>{buttonLabel}</PostButtonText>
      </PostButton>

      <AddLadderMatchModal
        modalVisible={postModalVisible}
        setModalVisible={setPostModalVisible}
        ladder={ladder}
      />
    </Container>
  );
};

export default Matchmaking;

const Container = styled.View({
  padding: 20,
  gap: 12,
});

const PostButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    padding: 10,
    borderRadius: 8,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const PostButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
