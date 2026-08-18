import React, { useContext, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ImageSourcePropType,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";

import {
  LADDER_PLAYOFF_SIZES,
  LADDER_PLAYOFF_STRUCTURE,
  LADDER_MIN_PLAYOFF_SIZE,
  getEffectiveLadderSize,
  getLadderPlayoffStructureForRegistrations,
  ccImageEndpoint,
} from "@shared";
import { cpBoosters } from "@/rankingMedals";

import JoinLadderModal from "../../../components/Modals/JoinLadderModal";
import { LadderContext } from "../../../context/LadderContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HowToPlayParams = { ladderId: string; maxPlayers?: number };

interface OnboardingPage {
  key: string;
  render: () => React.ReactNode;
}

const LadderHowToPlay: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, HowToPlayParams>, string>>();
  const { ladderId, maxPlayers: maxPlayersParam } = route.params;
  const { ladderById } = useContext(LadderContext);

  const maxPlayers =
    ladderById?.ladderId === ladderId
      ? ladderById.maxPlayers
      : (maxPlayersParam ?? 0);

  const listRef = useRef<FlatList<OnboardingPage>>(null);
  const [index, setIndex] = useState(0);
  const [joinVisible, setJoinVisible] = useState(false);

  const ladder =
    ladderById && ladderById.ladderId === ladderId ? ladderById : null;

  const goToRules = () => navigation.navigate("LadderRules", { ladderId });

  const pages: OnboardingPage[] = useMemo(
    () => [
      {
        key: "intro",
        render: () => (
          <PageBody
            image={{ uri: ccImageEndpoint }}
            title={"Welcome to the official \n Court Champs Ladder"}
            body="Climb the ranks by playing other members. This quick guide shows you how games work, how you earn Court Points, and how the season ends in the playoffs."
          />
        ),
      },
      {
        key: "post-game",
        render: () => (
          <PageBody
            icon="add-circle-outline"
            title="Post a Game"
            body={
              <>
                {"Post games you want to play from the "}
                <PageText style={{ fontWeight: "bold", color: "#cccccc" }}>
                  {`Match Making`}
                </PageText>
                {
                  " tab. Set it up and wait for another ladder member to accept."
                }
              </>
            }
          />
        ),
      },
      {
        key: "challenge-accepted",
        render: () => (
          <PageBody
            icon="checkmark-circle-outline"
            title="Challenge Accepted"
            body="When someone accepts your game you must check in at your chosen court, play your opponent and publish your results"
          />
        ),
      },
      {
        key: "accept-game",
        render: () => (
          <PageBody
            icon="hand-left-outline"
            title="Accept a Game"
            body={
              <>
                {
                  "If you rather find games you can browse games other players have posted and accept one from the "
                }
                <PageText style={{ fontWeight: "bold", color: "#cccccc" }}>
                  {`Match Making`}
                </PageText>
                {" tab to lock in your next match."}
              </>
            }
          />
        ),
      },
      {
        key: "objective",
        render: () => (
          <PageBody
            icon="stats-chart-outline"
            title="The Objective"
            body="Rack up wins and accumulate CP (Court Points). The more you win, the more CP you earn — and the higher you climb the ladder."
          />
        ),
      },
      {
        key: "cp-boosters",
        render: () => <AchievementMedalsPage />,
      },
      {
        key: "playoffs",
        render: () => (
          <PlayoffsPage
            maxPlayers={maxPlayers}
            registeredCount={ladder?.participantCount ?? 0}
          />
        ),
      },
      {
        key: "finals",
        render: () => (
          <PageBody
            icon="ribbon-outline"
            title="Winning the Final"
            body="Win the ladder to be crowned champion and take the top share of the prize pool. Prizes and Court Points are awarded when all the games are completed."
          >
            <ReadRulesButton onPress={goToRules}>
              <AntDesign name="book" size={15} color="white" />
              <ButtonText>Read the full rules</ButtonText>
            </ReadRulesButton>
            <FootNote>
              You can also open the rules anytime from the ladder page&apos;s
              menu.
            </FootNote>
          </PageBody>
        ),
      },
    ],
    [maxPlayers, ladderId, ladder?.participantCount],
  );

  const lastIndex = pages.length - 1;

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(next, lastIndex));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== index) setIndex(page);
  };

  const renderItem = ({ item }: ListRenderItemInfo<OnboardingPage>) => (
    <PageContainer>{item.render()}</PageContainer>
  );

  return (
    <Screen>
      <TopBar>
        <TopBarTitle>How to Play</TopBarTitle>
      </TopBar>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{
          alignSelf: "flex-end",
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
        }}
      >
        <AntDesign name="close-circle" size={30} color="red" />
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * i,
          index: i,
        })}
      />

      <Dots testID="how-to-play-dots">
        {pages.map((page, i) => (
          <Dot key={page.key} active={i === index} />
        ))}
      </Dots>

      <NavRow>
        <NavButton
          onPress={() => goTo(index - 1)}
          disabled={index === 0}
          testID="how-to-play-back"
        >
          <NavButtonText disabled={index === 0}>Back</NavButtonText>
        </NavButton>

        {index < lastIndex ? (
          <NavButton
            primary
            onPress={() => goTo(index + 1)}
            testID="how-to-play-next"
          >
            <NavButtonText>Next</NavButtonText>
          </NavButton>
        ) : (
          <NavButton
            primary
            onPress={() => setJoinVisible(true)}
            testID="how-to-play-join"
          >
            <NavButtonText>Join Now</NavButtonText>
          </NavButton>
        )}
      </NavRow>

      {ladder && joinVisible && (
        <JoinLadderModal
          modalVisible={joinVisible}
          setModalVisible={setJoinVisible}
          ladder={ladder}
        />
      )}
    </Screen>
  );
};

export default LadderHowToPlay;
interface PageBodyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
  image?: ImageSourcePropType;
}

const PageBody: React.FC<PageBodyProps> = ({
  icon,
  title,
  body,
  children,
  image,
}) => (
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 20,
      paddingHorizontal: 30,
    }}
  >
    {icon && (
      <IconCircle>
        <Ionicons name={icon} size={44} color="#00A2FF" />
      </IconCircle>
    )}
    {image && (
      <ImageContainer>
        <Image source={image} resizeMode="contain" />
      </ImageContainer>
    )}
    <PageTitle>{title}</PageTitle>
    <PageText>{body}</PageText>
    {children}
  </ScrollView>
);

interface PlayoffsPageProps {
  maxPlayers: number;
  registeredCount: number;
}

const PlayoffsPage: React.FC<PlayoffsPageProps> = ({
  maxPlayers,
  registeredCount,
}) => {
  const effectiveSize = getEffectiveLadderSize(registeredCount, maxPlayers);
  const structure = getLadderPlayoffStructureForRegistrations(
    registeredCount,
    maxPlayers,
  );
  const hasStructure = structure.playoffSpots > 0;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        gap: 18,
        paddingHorizontal: 24,
        paddingVertical: 30,
      }}
    >
      <CenteredHeader>
        <IconCircle>
          <Ionicons name="git-network-outline" size={40} color="#00A2FF" />
        </IconCircle>
        <PageTitle>The Playoffs</PageTitle>
      </CenteredHeader>
      <PageText>
        When the season ends, the top players advance to a single-elimination
        knockout. Each round must be played within 1 week to progress to the
        next round.
      </PageText>
      <PageText>
        It&apos;s a tiered system. Prizes scale to the ladder&apos;s{" "}
        <PageText style={{ fontWeight: "bold", color: "#ffffff" }}>
          final size when registration closes
        </PageText>{" "}
        — not the {maxPlayers}-player capacity. If a 2048 ladder only fills to
        512, it pays out at the 512 tier (32 in playoffs, 16 in the money).
      </PageText>

      <Highlight testID="how-to-play-playoff-highlight">
        <HighlightText>
          <HighlightStrong>{registeredCount}</HighlightStrong> registered so
          far.{" "}
          {hasStructure ? (
            <>
              At the <HighlightStrong>{effectiveSize}</HighlightStrong> tier
              that&apos;s <HighlightStrong>{structure.playoffSpots}</HighlightStrong>{" "}
              playoff spots and{" "}
              <HighlightStrong>{structure.inTheMoney}</HighlightStrong> in the
              money.
            </>
          ) : (
            <>
              At least <HighlightStrong>{LADDER_MIN_PLAYOFF_SIZE}</HighlightStrong>{" "}
              players are needed before playoff places are allocated.
            </>
          )}
        </HighlightText>
      </Highlight>

      <Table>
        <TableRow header>
          <TableCell header flex={1.2}>
            Final ladder size
          </TableCell>
          <TableCell header>Playoff spots</TableCell>
          <TableCell header>In the money</TableCell>
        </TableRow>
        {LADDER_PLAYOFF_SIZES.map((size) => {
          const row = LADDER_PLAYOFF_STRUCTURE[size];
          const isCurrent = size === effectiveSize;
          return (
            <TableRow key={size} highlighted={isCurrent}>
              <TableCell flex={1.2} highlighted={isCurrent}>
                {size}
              </TableCell>
              <TableCell highlighted={isCurrent}>{row.playoffSpots}</TableCell>
              <TableCell highlighted={isCurrent}>{row.inTheMoney}</TableCell>
            </TableRow>
          );
        })}
      </Table>
      <FootNote>
        Payouts lock to the tier the ladder reaches at registration close.
      </FootNote>
    </ScrollView>
  );
};

const AchievementMedalsPage: React.FC = () => {
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        gap: 18,
        paddingHorizontal: 24,
        paddingVertical: 30,
      }}
    >
      <ImageContainer>
        <Image source={cpBoosters} resizeMode="contain" />
      </ImageContainer>
      <CenteredHeader style={{ marginTop: -40 }}>
        <PageTitle>Achievement Medals</PageTitle>
      </CenteredHeader>
      <PageText>
        Achievement Medals are awarded when you are performing your best - you
        are awarded CP bonuses for win streaks, decisive victories and long
        distant wins.
      </PageText>
    </ScrollView>
  );
};

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const TopBar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 15,
  paddingVertical: 15,
});

const TopBarTitle = styled.Text({
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const PageContainer = styled.View({
  width: SCREEN_WIDTH,
  flex: 1,
});

const IconCircle = styled.View({
  width: 88,
  height: 88,
  borderRadius: 44,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 162, 255, 0.12)",
});

const CenteredHeader = styled.View({
  alignItems: "center",
  gap: 14,
});

const PageTitle = styled.Text({
  color: "#ffffff",
  fontSize: 24,
  fontWeight: "bold",
  textAlign: "center",
});

const PageText = styled.Text({
  color: "#cccccc",
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
});

const FootNote = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  lineHeight: 18,
  textAlign: "center",
});

const Highlight = styled.View({
  padding: 14,
  borderRadius: 12,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.4)",
});

const HighlightText = styled.Text({
  color: "#e2e8f0",
  fontSize: 14,
  lineHeight: 20,
  textAlign: "center",
});

const HighlightStrong = styled.Text({
  color: "#00A2FF",
  fontWeight: "bold",
});

const Table = styled.View({
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#192336",
  overflow: "hidden",
});

const TableRow = styled.View<{ header?: boolean; highlighted?: boolean }>(
  ({ header, highlighted }: { header?: boolean; highlighted?: boolean }) => ({
    flexDirection: "row",
    backgroundColor: header
      ? "#0A1F33"
      : highlighted
        ? "rgba(0, 162, 255, 0.14)"
        : "transparent",
    borderTopWidth: header ? 0 : 1,
    borderTopColor: "#192336",
  }),
);

const ReadRulesButton = styled.TouchableOpacity({
  padding: 20,
  borderRadius: 14,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.35)",
  alignItems: "center",
  flexDirection: "row",
  gap: 6,
  marginBottom: 40,
});

const ButtonText = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
});

const TableCell = styled.Text<{
  header?: boolean;
  highlighted?: boolean;
  flex?: number;
}>(
  ({
    header,
    highlighted,
    flex,
  }: {
    header?: boolean;
    highlighted?: boolean;
    flex?: number;
  }) => ({
    flex: flex ?? 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 13,
    textAlign: "center",
    fontWeight: header || highlighted ? "bold" : "normal",
    color: header ? "#9fb8c8" : highlighted ? "#00A2FF" : "#e2e8f0",
  }),
);

const Dots = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  gap: 8,
  paddingTop: 8,
  paddingBottom: 32,
});

const Dot = styled.View<{ active: boolean }>(
  ({ active }: { active: boolean }) => ({
    width: active ? 22 : 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: active ? "#00A2FF" : "#33445a",
  }),
);

const NavRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingBottom: 30,
  gap: 12,
});

const NavButton = styled.TouchableOpacity<{
  primary?: boolean;
  isHidden?: boolean;
  disabled?: boolean;
}>(({ primary, isHidden }: { primary?: boolean; isHidden?: boolean }) => ({
  flex: 1,
  paddingVertical: 15,
  borderRadius: 12,
  alignItems: "center",
  opacity: isHidden ? 0 : 1,
  backgroundColor: primary ? "#00A2FF" : "#1e2b3d",
}));

const NavButtonText = styled.Text<{ disabled?: boolean }>(
  ({ disabled }: { disabled?: boolean }) => ({
    color: disabled ? "#7f97a8" : "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  }),
);

const ImageContainer = styled.View({
  width: "100%",
  height: 200,
  alignItems: "center",
  justifyContent: "center",
});

const Image = styled.Image({
  width: "90%",
  height: "90%",
});
