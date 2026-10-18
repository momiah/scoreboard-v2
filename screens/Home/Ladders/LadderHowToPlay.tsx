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
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_PLAYOFF_STRUCTURE,
  getEffectiveLadderSize,
  calculateLadderPrizePool,
  ccImageEndpoint,
} from "@shared";
import gameMedals from "@/rankingMedals";
import { ladders } from "@/mockImages";

import ImageMapper from "../../../components/ImageMapper";
import JoinLadderModal from "../../../components/Modals/JoinLadderModal";
import { LadderContext } from "../../../context/LadderContext";
import { useLadderJoin } from "../../../hooks/useLadderJoin";
import { formatCurrency } from "../../../helpers/formatCurrency";
import { ladderEntrantNoun } from "../../../helpers/ladderEntrantNoun";
import {
  getLadderPrizeTable,
  type LadderPrizeRow,
} from "../../../helpers/ladderPlayoffPrizes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HowToPlayParams = {
  ladderId: string;
  maxPlayers?: number;
  playoffs?: boolean;
};

interface OnboardingPage {
  key: string;
  render: () => React.ReactNode;
}

const LadderHowToPlay: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, HowToPlayParams>, string>>();
  const { ladderId, maxPlayers: maxPlayersParam, playoffs } = route.params;
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
  const noun = ladderEntrantNoun(ladder?.ladderType);

  const { mode, openJoin } = useLadderJoin(ladder, () => setJoinVisible(true));

  const goToRules = () => navigation.navigate("LadderRules", { ladderId });

  const finalsPage: OnboardingPage = {
    key: "finals",
    render: () => (
      <ImageMapper
        images={ladders}
        imageSize={72}
        title="Winning the Final"
        description={
          "Win the Final to be crowned champion and take the biggest prize.\n\nPrizes and CP are paid once the playoffs finish."
        }
      >
        <ReadRulesButton onPress={goToRules}>
          <AntDesign name="book" size={15} color="white" />
          <ButtonText>Read the full rules</ButtonText>
        </ReadRulesButton>
        <FootNote>
          You can also open the rules anytime from the ladder page&apos;s menu.
        </FootNote>
      </ImageMapper>
    ),
  };

  const playoffPages: OnboardingPage[] = [
    {
      key: "playoffs-intro",
      render: () => (
        <PageBody
          icon="trophy-outline"
          title="Welcome to the Playoffs"
          paragraphs={[
            `The top ${ladder?.playoffBracketSize ? `${ladder.playoffBracketSize} ` : ""}${noun}s made the cut.`,
            "Every tie is a knockout. Win and you move on, lose and you're out.",
          ]}
        />
      ),
    },
    {
      key: "playoffs-structure",
      render: () => (
        <PlayoffsPage
          maxPlayers={maxPlayers}
          registeredCount={ladder?.participantCount ?? 0}
          entryFee={ladder?.entryFee ?? 0}
          currencyType={ladder?.currencyType ?? "GBP"}
        />
      ),
    },
    {
      key: "playoffs-prize-table",
      render: () =>
        ladder ? (
          <PrizeTablePage
            rows={getLadderPrizeTable(ladder)}
            currencyType={ladder.currencyType}
            isPaid={(ladder.entryFee ?? 0) > 0}
            noun={noun}
          />
        ) : null,
    },
    {
      key: "playoffs-home-away",
      render: () => (
        <PageBody
          icon="home-outline"
          title="Home and Away"
          paragraphs={[
            `Each tie is two matches, one at each ${noun}'s home court.`,
            `Match 1: the lower-ranked ${noun} hosts.\nMatch 2: the higher-ranked ${noun} hosts.`,
          ]}
        />
      ),
    },
    {
      key: "playoffs-arrange",
      render: () => (
        <PageBody
          icon="calendar-outline"
          title="Arrange Your Home Match"
          paragraphs={[
            "The host picks the court and time. Their opponent accepts, or can decline once.",
            "Match 1 is arranged first, then Match 2 can be arranged.",
            "After match 1 is complete, you have the option to complete match 2 in the same venue.",
          ]}
        />
      ),
    },
    {
      key: "playoffs-aggregate",
      render: () => (
        <PageBody
          icon="swap-horizontal-outline"
          title="Win on Aggregate"
          paragraphs={[
            `The ${noun} that wins more games across both matches goes through.`,
            "If both matches result in a draw, a deciding game is played on the same court. You can request the game to be played on a later date if you've run out of time.",
          ]}
        />
      ),
    },
    {
      key: "playoffs-deadline",
      render: () => (
        <PageBody
          icon="hourglass-outline"
          title={`${LADDER_PLAYOFF_TIE_DAYS} Days to Finish`}
          paragraphs={[
            `Both matches must be played within ${LADDER_PLAYOFF_TIE_DAYS} days.`,
            "If time runs out, the tie goes to whoever won more games, then points, then the higher rank.",
            "If nothing was played, neither side goes through.",
          ]}
        />
      ),
    },
    finalsPage,
  ];

  const regularPages: OnboardingPage[] = useMemo(
    () => [
      {
        key: "intro",
        render: () => (
          <PageBody
            image={{ uri: ccImageEndpoint }}
            title={"Welcome to the official \n Court Champs Ladder"}
            paragraphs={[
              "Climb the ranks by playing other members.",
              "This guide covers how games work, how you earn Court Points (CP) and how the season ends.",
            ]}
          />
        ),
      },
      {
        key: "post-game",
        render: () => (
          <PageBody
            icon="add-circle-outline"
            title="Post a Game"
            paragraphs={[
              <>
                {"Post a game from the "}
                <Bold>Match Making</Bold>
                {" tab and wait for a member to accept."}
              </>,
              "Matchmaking is blind, so you only see your opponent once they accept.",
            ]}
          />
        ),
      },
      {
        key: "challenge-accepted",
        render: () => (
          <PageBody
            icon="checkmark-circle-outline"
            title="Challenge Accepted"
            paragraphs={[
              "Once your game is accepted:",
              "1. Check in at the court\n2. Play your opponent\n3. Report your scores",
            ]}
          />
        ),
      },
      {
        key: "accept-game",
        render: () => (
          <PageBody
            icon="hand-left-outline"
            title="Accept a Game"
            paragraphs={[
              <>
                {"Prefer to find a game? Browse the "}
                <Bold>Match Making</Bold>
                {" tab."}
              </>,
              "Accept one to lock in your next match.",
            ]}
          />
        ),
      },
      {
        key: "objective",
        render: () => (
          <PageBody
            icon="stats-chart-outline"
            title="The Objective"
            paragraphs={[
              "Win games to earn CP (Court Points).",
              "The more CP you have, the higher you climb.",
            ]}
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
            entryFee={ladder?.entryFee ?? 0}
            currencyType={ladder?.currencyType ?? "GBP"}
          />
        ),
      },
      finalsPage,
    ],
    [
      maxPlayers,
      ladderId,
      ladder?.participantCount,
      ladder?.entryFee,
      ladder?.currencyType,
    ],
  );
  const pages = playoffs ? playoffPages : regularPages;

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
        ) : mode === "join" ? (
          <NavButton primary onPress={openJoin} testID="how-to-play-join">
            <NavButtonText>Join Now</NavButtonText>
          </NavButton>
        ) : (
          <NavButton
            participant
            disabled
            activeOpacity={1}
            testID="how-to-play-participant"
            style={{
              backgroundColor: "#16181B",
              borderWidth: 2,
              borderColor: "#272727ff",
            }}
          >
            {mode === "participant" && (
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#22c55e"
              />
            )}
            <NavButtonText>
              {mode === "participant" ? "Participant" : "Registration Closed"}
            </NavButtonText>
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
  paragraphs: React.ReactNode[];
  children?: React.ReactNode;
  image?: ImageSourcePropType;
}

const PageBody: React.FC<PageBodyProps> = ({
  icon,
  title,
  paragraphs,
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
    <Paragraphs>
      {paragraphs.map((paragraph, index) => (
        <PageText key={index}>{paragraph}</PageText>
      ))}
    </Paragraphs>
    {children}
  </ScrollView>
);

interface PrizeTablePageProps {
  rows: LadderPrizeRow[];
  currencyType: string;
  isPaid: boolean;
  noun: "player" | "team";
}

const PrizeTablePage: React.FC<PrizeTablePageProps> = ({
  rows,
  currencyType,
  isPaid,
  noun,
}) => (
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
        <Ionicons name="trophy-outline" size={40} color="#FFC800" />
      </IconCircle>
      <PageTitle>Prize Distribution</PageTitle>
    </CenteredHeader>
    <Paragraphs>
      <PageText>{`What each ${noun} takes home, by where they finish.`}</PageText>
      <PageText>
        {`${isPaid ? "Cash and CP are" : "CP is"} paid when the playoffs end.`}
      </PageText>
    </Paragraphs>
    <Table testID="how-to-play-prize-table">
      <TableRow header>
        <TableCell header flex={1.6}>
          Finish
        </TableCell>
        {isPaid ? <TableCell header>Cash each</TableCell> : null}
        <TableCell header>CP each</TableCell>
      </TableRow>
      {rows.map((row) => (
        <TableRow key={row.fromPlace}>
          <TableCell flex={1.6}>{row.label}</TableCell>
          {isPaid ? (
            <TableCell>{formatCurrency(row.cash, currencyType)}</TableCell>
          ) : null}
          <TableCell>{row.cp.toLocaleString()}</TableCell>
        </TableRow>
      ))}
    </Table>
  </ScrollView>
);

interface PlayoffsPageProps {
  maxPlayers: number;
  registeredCount: number;
  entryFee: number;
  currencyType: string;
}

const PlayoffsPage: React.FC<PlayoffsPageProps> = ({
  maxPlayers,
  registeredCount,
  entryFee,
  currencyType,
}) => {
  const effectiveSize = getEffectiveLadderSize(registeredCount, maxPlayers);
  const isPaid = entryFee > 0;
  const prizePool = calculateLadderPrizePool({
    entryFee,
    participantCount: registeredCount,
  });

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
      <Paragraphs>
        <PageText>
          When the season ends, the top players go into a knockout.
        </PageText>
        <PageText>{`Each round has ${LADDER_PLAYOFF_TIE_DAYS} days to be played.`}</PageText>
      </Paragraphs>

      <Highlight testID="how-to-play-playoff-highlight">
        <HighlightText>
          The bracket size depends on how many players have registered when
          registration closes.
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
        Current ladder size: {registeredCount} / {maxPlayers}
        {isPaid && (
          <>
            {" "}
            with a total cash prize pool of{" "}
            {formatCurrency(prizePool.cash, currencyType)}
          </>
        )}{" "}
        {isPaid ? "and a" : "with a"} CP prize pool of {prizePool.xp} CP.
      </FootNote>
    </ScrollView>
  );
};

const AchievementMedalsPage: React.FC = () => (
  <ImageMapper
    images={gameMedals}
    imageSize={72}
    title="Achievement Medals"
    description={
      "Earn bonus CP with medals for win streaks, big wins and long-distance wins."
    }
  />
);

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

const Paragraphs = styled.View({
  gap: 12,
});

const Bold = styled.Text({
  fontWeight: "bold",
  color: "#ffffff",
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
  participant?: boolean;
}>(
  ({
    primary,
    isHidden,
    participant,
  }: {
    primary?: boolean;
    isHidden?: boolean;
    participant?: boolean;
  }) => ({
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 15,
    borderRadius: 12,
    opacity: isHidden ? 0 : 1,
    backgroundColor: participant ? "#2b3440" : primary ? "#00A2FF" : "#1e2b3d",
  }),
);

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
