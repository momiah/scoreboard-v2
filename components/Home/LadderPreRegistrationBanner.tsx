import React from "react";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CourtChampLogoIcon } from "../../assets";
import { useLadderPreRegistrations } from "../../hooks/useLadderPreRegistrations";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  formatPrizePool,
  getPrizePool,
  isCashLadder,
} from "../../helpers/ladderPreRegistrationDisplay";

const LadderPreRegistrationBanner: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { preRegistrations } = useLadderPreRegistrations();
  const cashOptions = preRegistrations.filter(isCashLadder);
  const hasCash = cashOptions.length > 0;
  const hasCommunity = cashOptions.length < preRegistrations.length;
  const [headline] = (hasCash ? cashOptions : preRegistrations)
    .slice()
    .sort((a, b) =>
      hasCash
        ? getPrizePool(b).cash - getPrizePool(a).cash
        : getPrizePool(b).xp - getPrizePool(a).xp,
    );

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
      {headline ? (
        <>
          <UpTo>Up to</UpTo>
          <Amount>{formatPrizePool(headline)}</Amount>
          <Headline>
            to be won in {hasCash ? "Cash Ladders" : "Community Ladders"}
          </Headline>
          <Subtitle>
            {hasCash && hasCommunity ? "Plus free Community Ladders. " : ""}Be
            first in when they open.
          </Subtitle>
        </>
      ) : (
        <>
          <Headline>Climb the ladder</Headline>
          <Subtitle>
            Play anyone near you, win Court Points and fight for the title.
          </Subtitle>
        </>
      )}
      <Cta>
        <CtaText>{headline ? "Pre-register now" : "See the ladders"}</CtaText>
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
