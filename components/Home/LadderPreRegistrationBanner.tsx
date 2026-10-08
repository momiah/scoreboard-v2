import React from "react";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LADDER_PRE_REGISTRATION_OPTIONS } from "@shared";
import { CourtChampLogoIcon } from "../../assets";
import { formatCurrency } from "../../helpers/formatCurrency";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  getPrizePool,
  isCashLadder,
} from "../../helpers/ladderPreRegistrationDisplay";

const topCashOption = LADDER_PRE_REGISTRATION_OPTIONS.filter(isCashLadder).sort(
  (a, b) => getPrizePool(b).grossCash - getPrizePool(a).grossCash,
)[0];

const LadderPreRegistrationBanner: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  if (!topCashOption) return null;

  return (
    <Banner
      testID="ladder-pre-registration-banner"
      activeOpacity={0.85}
      onPress={() => navigation.navigate("LadderPreRegistrations")}
    >
      <Watermark source={CourtChampLogoIcon} resizeMode="contain" />
      <Pill>
        <PillText>Ladders · coming soon</PillText>
      </Pill>
      <UpTo>Up to</UpTo>
      <Amount>
        {formatCurrency(
          getPrizePool(topCashOption).grossCash,
          topCashOption.currencyType,
        )}
      </Amount>
      <Headline>to be won in Cash Ladders</Headline>
      <Subtitle>
        Plus free Community Ladders. Be first in when they open.
      </Subtitle>
      <Cta>
        <CtaText>Pre-register now</CtaText>
        <Ionicons name="arrow-forward" size={14} color={COLORS.blue} />
      </Cta>
    </Banner>
  );
};

const Banner = styled.TouchableOpacity({
  backgroundColor: COLORS.hero,
  borderWidth: 1.5,
  borderColor: COLORS.gold,
  borderRadius: 14,
  padding: 16,
  marginTop: 10,
  marginBottom: 6,
  overflow: "hidden",
});

const Watermark = styled.Image({
  position: "absolute",
  right: -24,
  bottom: -28,
  width: 150,
  height: 150,
  opacity: 0.18,
});

const Pill = styled.View({
  alignSelf: "flex-start",
  backgroundColor: COLORS.gold,
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 3,
});

const PillText = styled.Text({
  color: COLORS.goldText,
  fontSize: 11,
  fontWeight: "bold",
});

const UpTo = styled.Text({
  color: COLORS.body,
  fontSize: 12,
  marginTop: 10,
});

const Amount = styled.Text({
  color: COLORS.gold,
  fontSize: 34,
  fontWeight: "bold",
});

const Headline = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
});

const Subtitle = styled.Text({
  color: COLORS.muted,
  fontSize: 12,
  marginTop: 4,
  marginBottom: 12,
});

const Cta = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
});

const CtaText = styled.Text({
  color: COLORS.blue,
  fontSize: 13,
  fontWeight: "bold",
});

export default LadderPreRegistrationBanner;
