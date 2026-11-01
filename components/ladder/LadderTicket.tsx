import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Mask,
  Rect,
  Stop,
} from "react-native-svg";
import { formatCurrency, getLadderPlayoffStructure } from "@shared";
import {
  formatLadderPrizePool,
  getLadderEntrantNoun,
  getLadderLocation,
  getLadderTitle,
  isCashLadder,
} from "@shared/helpers";
import type { Ladder } from "@shared/types";
import { ladders } from "@/mockImages";

const SCREEN_BG = "rgb(3, 16, 31)";
const BLUE = "#00A2FF";
const GOLD = "#FFC800";
const GREEN = "#47d585";
const BODY = "#c9d6e3";
const MUTED = "#9fb8c8";
const NOTCH = 18;
const DASHES = 9;
const TEAR_OFF_WIDTH = 138;

/** The Ladder fields a ticket shows; a live ladder and a pre-registration both have them. */
export type LadderTicketDetails = Pick<
  Ladder,
  | "region"
  | "countryCode"
  | "ladderType"
  | "genderType"
  | "entryFee"
  | "currencyType"
  | "maxPlayers"
> &
  Partial<Pick<Ladder, "city">>;

interface LadderTicketProps {
  ladder: LadderTicketDetails;
  actionLabel: string;
  /** Shows the action as done, e.g. "You're in". */
  actionDone?: boolean;
  onPress: () => void;
  testID?: string;
}

/** A ladder as an entry ticket: the prize pool on the stub, the trophy, entry fee and action on the tear-off. */
const LadderTicket: React.FC<LadderTicketProps> = ({
  ladder,
  actionLabel,
  actionDone,
  onPress,
  testID,
}) => {
  const cash = isCashLadder(ladder);
  const noun = getLadderEntrantNoun(ladder.ladderType);
  const { inTheMoney } = getLadderPlayoffStructure(ladder.maxPlayers);
  const location = getLadderLocation(ladder);
  const size = `${ladder.maxPlayers.toLocaleString("en-GB")} ${noun}s`;

  return (
    <Ticket cash={cash} activeOpacity={0.85} onPress={onPress} testID={testID}>
      <Stub>
        <Eyebrow>REGIONAL LADDER</Eyebrow>
        <Title numberOfLines={1}>{getLadderTitle(ladder)}</Title>
        <PoolLabel>Prize pool up to</PoolLabel>
        <Prize cash={cash} numberOfLines={1} adjustsFontSizeToFit>
          {formatLadderPrizePool(ladder)}
        </Prize>

        <Meta>
          {cash
            ? `${size} · Top ${inTheMoney} ${noun === "team" ? "teams " : ""}paid`
            : `${size} · Top ${inTheMoney} win CP`}
        </Meta>
        <Meta numberOfLines={1}>{location ? `${location}` : ""}</Meta>
      </Stub>

      <Perforation>
        {Array.from({ length: DASHES }, (_, index) => (
          <Dash key={index} cash={cash} />
        ))}
      </Perforation>

      <TearOff cash={cash}>
        <TearOffPinstripes />
        <Trophy source={ladders[0]} resizeMode="contain" />
        <Entry>
          <EntryAmount cash={cash}>
            {cash
              ? `${formatCurrency(ladder.entryFee, ladder.currencyType)}*`
              : "Free"}
          </EntryAmount>
          <EntryCaption>
            {cash ? (noun === "team" ? "entry per team" : "entry") : "to enter"}
          </EntryCaption>
        </Entry>
        <Action done={actionDone}>
          {actionDone ? (
            <Ionicons name="checkmark-circle" size={13} color={GREEN} />
          ) : null}
          <ActionText done={actionDone} numberOfLines={1}>
            {actionLabel}
          </ActionText>
        </Action>
      </TearOff>

      <Notch style={{ top: -NOTCH / 2 }} />
      <Notch style={{ bottom: -NOTCH / 2 }} />
    </Ticket>
  );
};

const STRIPE_GAP = 9;
/** How far right a stripe leans per point of height (about 30 degrees). */
const STRIPE_SLANT = 0.58;

const stripeOffsets = (width: number, height: number) => {
  const offsets: number[] = [];
  for (let x = -height * STRIPE_SLANT; x < width; x += STRIPE_GAP) {
    offsets.push(Math.round(x));
  }
  return offsets;
};

/** Fine diagonal pinstripes across the tear-off, fading from the top down. */
const TearOffPinstripes: React.FC = () => {
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) =>
    setSize(event.nativeEvent.layout);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="tearOffFade" x1="0" y1="0" x2="0.25" y2="1">
              <Stop offset="0.1" stopColor="white" stopOpacity={1} />
              <Stop offset="0.85" stopColor="white" stopOpacity={0} />
            </SvgLinearGradient>
            <Mask id="tearOffFadeMask">
              <Rect width={width} height={height} fill="url(#tearOffFade)" />
            </Mask>
          </Defs>
          <G mask="url(#tearOffFadeMask)">
            {stripeOffsets(width, height).map((x) => (
              <Line
                key={x}
                x1={x}
                y1={height}
                x2={x + height * STRIPE_SLANT}
                y2={0}
                stroke="white"
                strokeOpacity={0.06}
                strokeWidth={1}
              />
            ))}
          </G>
        </Svg>
      ) : null}
    </View>
  );
};

/** A ticket-shaped placeholder while ladders load. */
export const LadderTicketSkeleton: React.FC = () => (
  <SkeletonTicket>
    <SkeletonStub>
      <SkeletonBar style={{ width: 90, height: 10 }} />
      <SkeletonBar style={{ width: 150, height: 18 }} />
      <SkeletonBar style={{ width: 120, height: 26 }} />
      <SkeletonBar style={{ width: 170, height: 10 }} />
    </SkeletonStub>
    <SkeletonTearOff />
  </SkeletonTicket>
);

const Ticket = styled.TouchableOpacity<{ cash: boolean }>(
  ({ cash }: { cash: boolean }) => ({
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cash ? "rgba(255, 200, 0, 0.32)" : "rgba(0, 162, 255, 0.35)",
    backgroundColor: "#071d36",
    marginBottom: 12,
    overflow: "hidden",
  }),
);

const Stub = styled.View({
  flex: 1,
  paddingVertical: 14,
  paddingLeft: 14,
  paddingRight: 10,
});

const Eyebrow = styled.Text({
  color: BLUE,
  fontSize: 10,
  fontWeight: "bold",
  letterSpacing: 1.6,
});

const Title = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
  marginTop: 3,
  marginBottom: 8,
});

const PoolLabel = styled.Text({
  color: BODY,
  fontSize: 11,
});

const Prize = styled.Text<{ cash: boolean }>(({ cash }: { cash: boolean }) => ({
  color: cash ? GOLD : BLUE,
  fontSize: 25,
  fontWeight: "bold",
  fontVariant: ["tabular-nums"],
  marginBottom: 8,
}));

const Meta = styled.Text({
  color: MUTED,
  fontSize: 11,
  lineHeight: 16,
});

const Perforation = styled.View({
  width: 2,
  justifyContent: "space-evenly",
  paddingVertical: NOTCH / 2,
});

const Dash = styled.View<{ cash: boolean }>(({ cash }: { cash: boolean }) => ({
  width: 2,
  height: 6,
  borderRadius: 1,
  backgroundColor: cash ? "rgba(255, 200, 0, 0.4)" : "rgba(0, 162, 255, 0.45)",
}));

const TearOff = styled.View<{ cash: boolean }>(
  ({ cash }: { cash: boolean }) => ({
    width: TEAR_OFF_WIDTH,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: cash
      ? "rgba(255, 200, 0, 0.05)"
      : "rgba(0, 162, 255, 0.06)",
  }),
);

const Trophy = styled.Image({
  width: 40,
  height: 48,
});

const Entry = styled.View({
  alignItems: "center",
  marginVertical: 6,
});

const EntryAmount = styled.Text<{ cash: boolean }>(
  ({ cash }: { cash: boolean }) => ({
    color: cash ? "white" : BLUE,
    fontSize: 18,
    fontWeight: "bold",
  }),
);

const EntryCaption = styled.Text({
  color: MUTED,
  fontSize: 10,
});

const Action = styled.View<{ done?: boolean }>(
  ({ done }: { done?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: done ? 1 : 0,
    borderColor: "rgba(71, 213, 133, 0.4)",
    backgroundColor: done ? "rgba(71, 213, 133, 0.14)" : BLUE,
  }),
);

const ActionText = styled.Text<{ done?: boolean }>(
  ({ done }: { done?: boolean }) => ({
    color: done ? GREEN : "white",
    fontSize: 11.5,
    fontWeight: "bold",
  }),
);

const Notch = styled.View({
  position: "absolute",
  right: TEAR_OFF_WIDTH - NOTCH / 2 + 1,
  width: NOTCH,
  height: NOTCH,
  borderRadius: NOTCH / 2,
  backgroundColor: SCREEN_BG,
});

const SkeletonTicket = styled.View({
  flexDirection: "row",
  height: 150,
  borderRadius: 16,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  marginBottom: 12,
  overflow: "hidden",
});

const SkeletonStub = styled.View({
  flex: 1,
  padding: 14,
  gap: 10,
});

const SkeletonBar = styled.View({
  borderRadius: 4,
  backgroundColor: "rgba(255, 255, 255, 0.08)",
});

const SkeletonTearOff = styled.View({
  width: TEAR_OFF_WIDTH,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
});

export default LadderTicket;
