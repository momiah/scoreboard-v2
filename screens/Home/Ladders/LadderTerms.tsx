import React from "react";
import { ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface TermsSection {
  title: string;
  body: string;
}

const TERMS: TermsSection[] = [
  {
    title: "1. Eligibility",
    body: "You must have a valid Court Champs account to enter a ladder. By joining you confirm the information on your account is accurate and that you meet any age or regional requirements for the ladder.",
  },
  {
    title: "2. Entry & registration",
    body: "A place on a ladder is confirmed once your registration is accepted and, for paid ladders, once your entry fee has been successfully processed. Registration closes at the advertised date and time.",
  },
  {
    title: "3. Entry fees & service charge",
    body: "Paid ladders require the stated entry fee. A platform service charge is included in the amount shown at checkout. Entry fees are collected to form the prize pool and to cover platform costs.",
  },
  {
    title: "4. Prizes & payouts",
    body: "The playoff and payout structure is tiered and scales with the ladder's actual size at registration close, not its maximum capacity. Prizes are distributed to qualifying finishers once the ladder completes and results are finalised.",
  },
  {
    title: "5. Fair play",
    body: "Results must be reported honestly and confirmed by both players. Any manipulation of scores, collusion, or abusive conduct may result in removal from the ladder without refund and further account action.",
  },
  {
    title: "6. Refunds & cancellations",
    body: "If a ladder is cancelled before it begins, paid entry fees are refunded. Once a ladder has started, entry fees are generally non-refundable except where required by law.",
  },
  {
    title: "7. Changes",
    body: "Court Champs may update these terms or a ladder's details where reasonably necessary. Material changes affecting an active ladder will be communicated to participants.",
  },
];

const LadderTerms: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <Screen>
      <TopBar>
        <BackButton onPress={() => navigation.goBack()} testID="ladder-terms-back">
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </BackButton>
        <TopBarTitle>Terms &amp; Conditions</TopBarTitle>
        <View style={{ width: 26 }} />
      </TopBar>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Intro>
          Please read these terms carefully before joining a ladder. Joining a
          ladder means you accept the terms below.
        </Intro>
        {TERMS.map((section) => (
          <TermsCard key={section.title}>
            <TermsTitle>{section.title}</TermsTitle>
            <TermsBody>{section.body}</TermsBody>
          </TermsCard>
        ))}
      </ScrollView>
    </Screen>
  );
};

export default LadderTerms;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const TopBar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 15,
  paddingVertical: 15,
});

const BackButton = styled.TouchableOpacity({
  padding: 2,
});

const TopBarTitle = styled.Text({
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const Intro = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  lineHeight: 20,
});

const TermsCard = styled.View({
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "#192336",
  gap: 8,
});

const TermsTitle = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "bold",
});

const TermsBody = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
});
