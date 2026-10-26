import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import styled from "styled-components/native";
import { formatCurrency } from "@shared";
import type { LadderPreRegistration } from "@shared/types";
import { ladders } from "@/mockImages";
import { Reveal } from "../ladder/HowToPlayReveal";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  getEntrantNoun,
  getPrizePool,
  isCashLadder,
} from "../../helpers/ladderPreRegistrationDisplay";

const COUNT_UP_MS = 1400;

const PreRegistrationIntro: React.FC<{ option: LadderPreRegistration }> = ({
  option,
}) => {
  const cash = isCashLadder(option);
  const pool = getPrizePool(option);
  const target = cash ? pool.cash : pool.xp;
  const format = (amount: number) =>
    cash
      ? formatCurrency(amount, option.currencyType)
      : `${amount.toLocaleString("en-GB")} CP`;
  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) =>
      setShown(Math.round(value * target)),
    );
    Animated.timing(progress, {
      toValue: 1,
      duration: COUNT_UP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(id);
  }, [progress, target]);

  return (
    <Container testID="pre-registration-intro">
      <Reveal>
        <Eyebrow>SEASON ONE</Eyebrow>
      </Reveal>
      <Reveal order={1} from="right">
        <Headline>Climb.</Headline>
      </Reveal>
      <Reveal order={3} from="right">
        <Headline>Compete.</Headline>
      </Reveal>
      <Reveal order={5} from="pop">
        <Headline gold>Conquer.</Headline>
      </Reveal>
      <Reveal order={7}>
        <Tagline>
          {`${option.maxPlayers.toLocaleString("en-GB")} ${getEntrantNoun(option)}s. One champion.`}
        </Tagline>
      </Reveal>
      <Reveal order={8} from="pop">
        <Trophy source={ladders[0]} resizeMode="contain" />
      </Reveal>
      <PoolLabel>{cash ? "Prize pool" : "CP to be won"}</PoolLabel>
      <PoolValue testID="pre-registration-intro-pool">
        {format(shown)}
      </PoolValue>
    </Container>
  );
};

const Container = styled.View({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 24,
});

const Eyebrow = styled.Text({
  color: COLORS.blue,
  fontSize: 14,
  fontWeight: "600",
  letterSpacing: 2,
  marginBottom: 12,
});

const Headline = styled.Text<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    color: gold ? COLORS.prizeGold : "white",
    fontSize: 44,
    fontWeight: "bold",
    lineHeight: 50,
  }),
);

const Tagline = styled.Text({
  color: COLORS.muted,
  fontSize: 15,
  marginTop: 14,
});

const Trophy = styled.Image({
  width: 72,
  height: 100,
  marginTop: 32,
});

const PoolLabel = styled.Text({
  color: COLORS.muted,
  fontSize: 14,
  marginTop: 16,
});

const PoolValue = styled.Text({
  color: COLORS.prizeGold,
  fontSize: 40,
  fontWeight: "bold",
  marginTop: 4,
});

export default PreRegistrationIntro;
