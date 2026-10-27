import React from "react";
import { Image } from "react-native";
import styled from "styled-components/native";

import { ladderGold, medalOutline, trophyOutline } from "../../../mockImages";
import { Reveal } from "../../ladder/HowToPlayReveal";
import { BLUE, BODY } from "../SignupChrome";
import { IntroScroll, IntroText, IntroTitle } from "../introStyles";

const CARDS: {
  key: string;
  title: string;
  body: string;
  icon: number;
  /** TODO: replace with a designer-drawn outline. The repo has no ladder outline, so this tints gold-ladder-v2.png. */
  tint?: boolean;
}[] = [
  {
    key: "ladders",
    title: "Ladders",
    body: "Official competitions run by Court Champs. Climb the table and the top players reach the playoffs for a chance to win cash prizes and CP bundles.",
    icon: ladderGold,
    tint: true,
  },
  {
    key: "leagues",
    title: "Leagues",
    body: "Run by clubs and communities. Free play competition to log your games until an end date set by club managers. Join one, or create your own.",
    icon: trophyOutline,
  },
  {
    key: "tournaments",
    title: "Tournaments",
    body: "Run by clubs and communities. Fixed teams and game fixtures played as Round Robin or Knockout style formats. Jump into an open one, or host your own.",
    icon: medalOutline,
  },
];

const CompetitionsPage: React.FC = () => (
  <IntroScroll>
    <Reveal>
      <IntroTitle>Three ways to compete</IntroTitle>
    </Reveal>
    <Reveal order={1}>
      <IntroText>Pick your battleground.</IntroText>
    </Reveal>
    {CARDS.map((card, index) => (
      <Reveal key={card.key} order={2 + index} from="right" style={cardStyle}>
        <Card>
          <IconCircle>
            <Image
              source={card.icon}
              resizeMode="contain"
              style={{
                width: 26,
                height: 26,
                tintColor: card.tint ? BLUE : undefined,
              }}
            />
          </IconCircle>
          <CardCopy>
            <CardTitle>{card.title}</CardTitle>
            <CardBody>{card.body}</CardBody>
          </CardCopy>
        </Card>
      </Reveal>
    ))}
  </IntroScroll>
);

const cardStyle = { alignSelf: "stretch" as const };

const Card = styled.View({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 12,
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 16,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.06)",
});

const IconCircle = styled.View({
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 162, 255, 0.1)",
});

const CardCopy = styled.View({
  flex: 1,
  gap: 4,
});

const CardTitle = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const CardBody = styled.Text({
  color: BODY,
  fontSize: 13,
  lineHeight: 18,
});

export default CompetitionsPage;
