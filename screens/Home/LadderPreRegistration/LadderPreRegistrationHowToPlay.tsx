import React, { useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LADDER_PLAYOFF_SIZES } from "@shared";
import HowToPlayFlow, {
  HowToPlayButton,
  HowToPlayButtonText,
} from "../../../components/ladder/HowToPlayFlow";
import { useLadderPreRegistrations } from "../../../hooks/useLadderPreRegistrations";
import { sharePreRegistration } from "../../../helpers/ladderPreRegistrationDisplay";

type HowToPlayRoute = RouteProp<
  { LadderPreRegistrationHowToPlay: { preRegistrationId?: string } },
  "LadderPreRegistrationHowToPlay"
>;

const LARGEST_LADDER = Math.max(...LADDER_PLAYOFF_SIZES);

const LadderPreRegistrationHowToPlay: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { params } = useRoute<HowToPlayRoute>();
  const { isSignedIn, preRegistrations, registeredIds, preRegister } =
    useLadderPreRegistrations();
  const [submitting, setSubmitting] = useState(false);
  const preRegistration = preRegistrations.find(
    (candidate) => candidate.preRegistrationId === params?.preRegistrationId,
  );
  const maxPlayers = preRegistration?.maxPlayers ?? LARGEST_LADDER;
  const registered = preRegistration
    ? registeredIds.has(preRegistration.preRegistrationId)
    : false;

  const handlePreRegister = async () => {
    if (!preRegistration) return;
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    setSubmitting(true);
    try {
      await preRegister(preRegistration.preRegistrationId);
      navigation.goBack();
    } catch (error) {
      console.error("Failed to pre-register:", error);
      Alert.alert(
        "Couldn't pre-register",
        "Check your connection and try again.",
      );
      setSubmitting(false);
    }
  };

  const finalAction = !preRegistration ? (
    <HowToPlayButton
      primary
      onPress={() => navigation.goBack()}
      testID="pre-registration-how-to-play-done"
    >
      <HowToPlayButtonText>Got it</HowToPlayButtonText>
    </HowToPlayButton>
  ) : registered ? (
    <HowToPlayButton
      participant
      disabled
      activeOpacity={1}
      testID="pre-registration-how-to-play-registered"
      style={{
        backgroundColor: "#16181B",
        borderWidth: 2,
        borderColor: "#272727ff",
      }}
    >
      <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
      <HowToPlayButtonText>Pre-registered</HowToPlayButtonText>
    </HowToPlayButton>
  ) : (
    <HowToPlayButton
      primary
      disabled={submitting}
      onPress={handlePreRegister}
      testID="pre-registration-how-to-play-pre-register"
    >
      {submitting ? (
        <ActivityIndicator color="white" />
      ) : (
        <HowToPlayButtonText>
          {isSignedIn ? "Pre-register" : "Sign in to pre-register"}
        </HowToPlayButtonText>
      )}
    </HowToPlayButton>
  );

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
      finalAction={finalAction}
      variant="preRegistration"
      onInvite={
        preRegistration
          ? () => sharePreRegistration(preRegistration)
          : undefined
      }
    />
  );
};

export default LadderPreRegistrationHowToPlay;
