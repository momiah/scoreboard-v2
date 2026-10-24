import React, { useContext, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import HowToPlayFlow, {
  HowToPlayButton,
  HowToPlayButtonText,
} from "../../../components/ladder/HowToPlayFlow";
import JoinLadderModal from "../../../components/Modals/JoinLadderModal";
import { LadderContext } from "../../../context/LadderContext";
import { useLadderJoin } from "../../../hooks/useLadderJoin";

type HowToPlayParams = {
  ladderId: string;
  maxPlayers?: number;
  playoffs?: boolean;
};

const LadderHowToPlay: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, HowToPlayParams>, string>>();
  const { ladderId, maxPlayers: maxPlayersParam, playoffs } = route.params;
  const { ladderById } = useContext(LadderContext);
  const [joinVisible, setJoinVisible] = useState(false);

  const ladder =
    ladderById && ladderById.ladderId === ladderId ? ladderById : null;
  const maxPlayers = ladder ? ladder.maxPlayers : (maxPlayersParam ?? 0);

  const { mode, openJoin } = useLadderJoin(ladder, () => setJoinVisible(true));

  const finalAction =
    mode === "join" ? (
      <HowToPlayButton primary onPress={openJoin} testID="how-to-play-join">
        <HowToPlayButtonText>Join Now</HowToPlayButtonText>
      </HowToPlayButton>
    ) : (
      <HowToPlayButton
        participant
        disabled
        activeOpacity={1}
        testID="how-to-play-participant"
        style={{
          backgroundColor: "#16181B",
          borderWidth: 2,
          borderColor: "#272727ff",
        }}
      >
        {mode === "participant" && (
          <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
        )}
        <HowToPlayButtonText>
          {mode === "participant" ? "Participant" : "Registration Closed"}
        </HowToPlayButtonText>
      </HowToPlayButton>
    );

  return (
    <>
      <HowToPlayFlow
        ladder={ladder}
        maxPlayers={maxPlayers}
        playoffs={playoffs}
        onClose={() => navigation.goBack()}
        onReadRules={() => navigation.navigate("LadderRules", { ladderId })}
        finalAction={finalAction}
      />
      {ladder && joinVisible && (
        <JoinLadderModal
          modalVisible={joinVisible}
          setModalVisible={setJoinVisible}
          ladder={ladder}
        />
      )}
    </>
  );
};

export default LadderHowToPlay;
