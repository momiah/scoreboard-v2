import React from "react";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import { LADDER_PLAYOFF_SIZES } from "@shared";
import HowToPlayFlow, {
  HowToPlayButton,
  HowToPlayButtonText,
} from "../../../components/ladder/HowToPlayFlow";
import { useLadderPreRegistrations } from "../../../hooks/useLadderPreRegistrations";

type HowToPlayRoute = RouteProp<
  { LadderPreRegistrationHowToPlay: { preRegistrationId?: string } },
  "LadderPreRegistrationHowToPlay"
>;

const LARGEST_LADDER = Math.max(...LADDER_PLAYOFF_SIZES);

const LadderPreRegistrationHowToPlay: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { params } = useRoute<HowToPlayRoute>();
  const { preRegistrations } = useLadderPreRegistrations();
  const preRegistration = preRegistrations.find(
    (candidate) => candidate.preRegistrationId === params?.preRegistrationId,
  );
  const maxPlayers = preRegistration?.maxPlayers ?? LARGEST_LADDER;

  return (
    <HowToPlayFlow
      ladder={
        preRegistration
          ? {
              ladderType: preRegistration.ladderType,
              entryFee: preRegistration.entryFee,
              currencyType: preRegistration.currencyType,
              maxPlayers,
              participantCount: maxPlayers,
            }
          : null
      }
      maxPlayers={maxPlayers}
      onClose={() => navigation.goBack()}
      onReadRules={() =>
        navigation.navigate("LadderPreRegistrationRules", {
          ladderType: preRegistration?.ladderType,
        })
      }
      finalAction={
        <HowToPlayButton
          primary
          onPress={() => navigation.goBack()}
          testID="pre-registration-how-to-play-done"
        >
          <HowToPlayButtonText>Got it</HowToPlayButtonText>
        </HowToPlayButton>
      }
    />
  );
};

export default LadderPreRegistrationHowToPlay;
