import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { ladders } from "@/mockImages";
import {
  useLadderPreRegistrants,
  useLadderPreRegistrations,
} from "../../hooks/useLadderPreRegistrations";
import HowToPlayBackdrop from "../ladder/HowToPlayBackdrop";
import { Reveal } from "../ladder/HowToPlayReveal";
import RegistrantAvatars from "../LadderPreRegistration/RegistrantAvatars";
import { TextSkeleton } from "../Skeletons/SkeletonComponents";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  formatPrizePool,
  getEntrantNoun,
  getPrizePool,
  isCashLadder,
} from "../../helpers/ladderPreRegistrationDisplay";

const TROPHY_SIZE = 120;
const GLOW_SIZE = TROPHY_SIZE + 60;
const COUNT_UP_MS = 1400;
const AVATAR_PREVIEW = 3;

/** The prize pool counting up from zero, written the way the full pool is. */
const PrizePoolCount: React.FC<{ poolText: string; cash: boolean }> = ({
  poolText,
  cash,
}) => {
  const target = Number(poolText.replace(/[^\d]/g, ""));
  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) =>
      setShown(Math.round(value * target)),
    );
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: COUNT_UP_MS,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(id);
  }, [progress, target]);

  return (
    <Amount cash={cash} testID="ladder-pre-registration-banner-pool">
      {poolText.replace(/[\d,]+/, shown.toLocaleString("en-GB"))}
    </Amount>
  );
};

/** The gold ladder trophy floating over a soft glow. */
const FloatingTrophy: React.FC = () => {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = (toValue: number) =>
      Animated.timing(float, {
        toValue,
        duration: 1500,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([drift(1), drift(0)]));
    loop.start();
    return () => loop.stop();
  }, [float]);

  return (
    <TrophyArea pointerEvents="none">
      <Svg width={GLOW_SIZE} height={GLOW_SIZE} style={styles.glow}>
        <Defs>
          <RadialGradient id="trophyGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={COLORS.prizeGold} stopOpacity={0.4} />
            <Stop offset="1" stopColor={COLORS.prizeGold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle
          cx={GLOW_SIZE / 2}
          cy={GLOW_SIZE / 2}
          r={GLOW_SIZE / 2}
          fill="url(#trophyGlow)"
        />
      </Svg>
      <Animated.Image
        source={ladders[0]}
        resizeMode="contain"
        style={[
          styles.trophy,
          {
            transform: [
              {
                translateY: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              },
            ],
          },
        ]}
      />
    </TrophyArea>
  );
};

/** Home's invitation to the Season One ladders: the guide's opening line, the biggest prize pool and who's already in. */
const LadderPreRegistrationBanner: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { loading, preRegistrations, registeredIds } =
    useLadderPreRegistrations();
  const cashOptions = preRegistrations.filter(isCashLadder);
  const hasCash = cashOptions.length > 0;
  const [headline] = (hasCash ? cashOptions : preRegistrations)
    .slice()
    .sort((a, b) =>
      hasCash
        ? getPrizePool(b).cash - getPrizePool(a).cash
        : getPrizePool(b).xp - getPrizePool(a).xp,
    );
  const { registrants, total } = useLadderPreRegistrants(
    headline?.preRegistrationId,
    AVATAR_PREVIEW,
  );
  const registered = registeredIds.size > 0;

  return (
    <Banner
      testID="ladder-pre-registration-banner"
      activeOpacity={0.9}
      onPress={() => navigation.navigate("LadderPreRegistrations")}
    >
      <LinearGradient
        colors={["#0a2747", "#041426"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <HowToPlayBackdrop />
      <FloatingTrophy />

      <TopRow>
        <Eyebrow>REGIONAL LADDERS</Eyebrow>
        <Chip>
          <ChipDot />
          <ChipText>
            {registered ? "You're pre-registered" : "Pre-registration open"}
          </ChipText>
        </Chip>
      </TopRow>

      <Headlines>
        <Reveal from="right">
          <HeadlineText>Climb.</HeadlineText>
        </Reveal>
        <Reveal order={2} from="right">
          <HeadlineText>Compete.</HeadlineText>
        </Reveal>
        <Reveal order={4} from="pop">
          <HeadlineText gold>Conquer.</HeadlineText>
        </Reveal>
      </Headlines>

      {loading ? (
        <>
          <SkeletonLine style={{ marginTop: 14 }}>
            <TextSkeleton show height={30} width={220} />
          </SkeletonLine>
          <SkeletonLine style={{ marginTop: 12, marginBottom: 16 }}>
            <TextSkeleton show height={30} width={180} />
          </SkeletonLine>
          <TextSkeleton show height={46} width={300} />
        </>
      ) : (
        <>
          {headline ? (
            <>
              <PoolColumn>
                <PoolLabel>Prize pool up to</PoolLabel>
                <PrizePoolCount
                  poolText={formatPrizePool(headline)}
                  cash={hasCash}
                />
              </PoolColumn>
              {/* <AvatarsRow>
                <RegistrantAvatars
                  registrants={registrants}
                  total={total}
                  noun={getEntrantNoun(headline)}
                />
              </AvatarsRow> */}
            </>
          ) : (
            <Subtitle>
              Play anyone near you, win Court Points and fight for the title.
            </Subtitle>
          )}
          <Cta registered={registered}>
            <CtaText>
              {registered
                ? "See your ladders"
                : headline
                  ? "Pre-register free"
                  : "See the ladders"}
            </CtaText>
            <Ionicons name="arrow-forward" size={17} color="white" />
          </Cta>
        </>
      )}
    </Banner>
  );
};

const styles = StyleSheet.create({
  glow: { position: "absolute", top: -30, left: -30 },
  trophy: { width: TROPHY_SIZE, height: TROPHY_SIZE },
});

const Banner = styled.TouchableOpacity({
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.28)",
  padding: 16,
  marginTop: 10,
  marginBottom: 6,
  overflow: "hidden",
});

const TrophyArea = styled.View({
  position: "absolute",
  right: 38,
  top: 74,
  width: TROPHY_SIZE,
  height: TROPHY_SIZE,
});

const TopRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const Eyebrow = styled.Text({
  color: COLORS.blue,
  fontSize: 11,
  fontWeight: "bold",
  letterSpacing: 2,
});

const Chip = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: COLORS.blueBorder,
  backgroundColor: COLORS.blueTint,
});

const ChipDot = styled.View({
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: COLORS.blue,
});

const ChipText = styled.Text({
  color: COLORS.blue,
  fontSize: 11,
  fontWeight: "bold",
});

const Headlines = styled.View({
  marginTop: 12,
});

const HeadlineText = styled.Text<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    color: gold ? COLORS.prizeGold : "white",
    fontSize: 32,
    lineHeight: "35px",
    fontWeight: "bold",
  }),
);

const PoolColumn = styled.View({
  flexDirection: "column",
  alignItems: "baseline",
  flexWrap: "wrap",
  columnGap: 8,
  marginTop: 14,
  marginBottom: 14,
});

const PoolLabel = styled.Text({
  color: COLORS.body,
  fontSize: 13,
});

const Amount = styled.Text<{ cash: boolean }>(
  ({ cash }: { cash: boolean }) => ({
    color: cash ? COLORS.prizeGold : COLORS.blue,
    fontSize: 30,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  }),
);

const AvatarsRow = styled.View({
  marginTop: 12,
  marginBottom: 16,
});

const Subtitle = styled.Text({
  color: COLORS.body,
  fontSize: 13,
  marginTop: 14,
  marginBottom: 16,
});

const SkeletonLine = styled.View({});

const Cta = styled.View<{ registered: boolean }>(
  ({ registered }: { registered: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: registered ? "#1e2b3d" : COLORS.blue,
  }),
);

const CtaText = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "bold",
});

export default LadderPreRegistrationBanner;
