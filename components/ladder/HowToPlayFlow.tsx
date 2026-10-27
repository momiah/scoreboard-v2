import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ImageSourcePropType,
} from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  LADDER_MATCH_BEST_OF_OPTIONS,
  LADDER_PLAYOFF_SIZES,
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_PLAYOFF_STRUCTURE,
  getEffectiveLadderSize,
  getLadderPlayoffStructure,
  calculateLadderPrizePool,
  ccImageEndpoint,
} from "@shared";
import gameMedals from "@/rankingMedals";
import { ladders } from "@/mockImages";

import type { Ladder } from "@shared/types";
import { PulseRing, Reveal, RevealContext } from "./HowToPlayReveal";
import HowToPlayLadderClimb from "./HowToPlayLadderClimb";
import HowToPlayBackdrop from "./HowToPlayBackdrop";
import { formatCurrency } from "../../helpers/formatCurrency";
import { ladderEntrantNoun } from "../../helpers/ladderEntrantNoun";
import {
  getLadderPrizeTable,
  type LadderPrizeRow,
} from "../../helpers/ladderPlayoffPrizes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COMPACT_SCREEN_HEIGHT = 760;

const useCompactScreen = () =>
  useWindowDimensions().height < COMPACT_SCREEN_HEIGHT;

/** The ladder details the guide describes: a live ladder, or one still being advertised. */
export type HowToPlayLadder = Pick<
  Ladder,
  | "ladderType"
  | "entryFee"
  | "currencyType"
  | "maxPlayers"
  | "participantCount"
  | "playoffBracketSize"
  | "playoffEntrantCount"
>;

export type HowToPlayTextPage = "post-game" | "accept-game";

export type HowToPlayPageText = Partial<
  Record<
    HowToPlayTextPage,
    {
      paragraphs: React.ReactNode[];
      /** One icon per paragraph card, when the paragraphs differ from the default. */
      cardIcons?: (keyof typeof Ionicons.glyphMap)[];
    }
  >
>;

const MATCH_STEPS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "qr-code-outline", text: "Check in at the court" },
  { icon: "people-outline", text: "Play your opponent" },
  { icon: "create-outline", text: "Report your scores" },
];

interface HowToPlayFlowProps {
  ladder: HowToPlayLadder | null;
  maxPlayers: number;
  playoffs?: boolean;
  onClose: () => void;
  onReadRules: () => void;
  /** Shown in place of Next on the last page. */
  finalAction: React.ReactNode;
  /** Replaces a page's text, e.g. before the Match Making tab exists. */
  pageText?: HowToPlayPageText;
  /** Replaces the welcome page, with Next reading "Show me how". */
  intro?: React.ReactNode;
  /** Shows the ladder's current size and prize pool under the playoff table. */
  showLadderSize?: boolean;
}

interface OnboardingPage {
  key: string;
  render: () => React.ReactNode;
}

const HowToPlayFlow: React.FC<HowToPlayFlowProps> = ({
  ladder,
  maxPlayers,
  playoffs,
  onClose,
  onReadRules,
  finalAction,
  pageText,
  intro,
  showLadderSize = true,
}) => {
  const listRef = useRef<FlatList<OnboardingPage>>(null);
  const [index, setIndex] = useState(0);
  const noun = ladderEntrantNoun(ladder?.ladderType);
  const { playoffSpots, inTheMoney } = getLadderPlayoffStructure(maxPlayers);

  const finalsPage: OnboardingPage = {
    key: "finals",
    render: () => (
      <FinalsPage
        onReadRules={onReadRules}
        inTheMoney={inTheMoney}
        isPaid={(ladder?.entryFee ?? 0) > 0}
      />
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
          showLadderSize={showLadderSize}
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
        render: () =>
          intro ?? (
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
            hero={<MatchmakingHero />}
            title="Matchmaking, Made Simple"
            cardIcons={
              pageText?.["post-game"]?.cardIcons ?? [
                "enter-outline",
                "calendar-outline",
                "eye-off-outline",
              ]
            }
            paragraphs={
              pageText?.["post-game"]?.paragraphs ?? [
                <>
                  {"Head over to the "}
                  <Accent blue>Match Making</Accent>
                  {" tab to post or find matches to progress in the ladder."}
                </>,
                <>
                  {"Choose your court and post a match. Pick a "}
                  <Accent>day and time</Accent>
                  {" that suits you, then wait for another member to accept."}
                </>,
                <>
                  {"You'll "}
                  <Accent>never know your opponent</Accent>
                  {" until they accept your match."}
                </>,
              ]
            }
          />
        ),
      },
      {
        key: "challenge-accepted",
        render: () => (
          <PageBody
            icon="checkmark-circle-outline"
            title="Match Accepted"
            paragraphs={[]}
          >
            <StepList>
              {MATCH_STEPS.map((step, stepIndex) => (
                <Reveal key={step.text} order={2 + stepIndex} from="right">
                  <StepRow>
                    <StepIcon>
                      <Ionicons name={step.icon} size={22} color="#00A2FF" />
                    </StepIcon>
                    <StepText>{step.text}</StepText>
                  </StepRow>
                  {stepIndex < MATCH_STEPS.length - 1 ? <StepLine /> : null}
                </Reveal>
              ))}
            </StepList>
          </PageBody>
        ),
      },
      {
        key: "accept-game",
        render: () => (
          <PageBody
            hero={<AcceptHero />}
            title="Accept a Match"
            cardIcons={
              pageText?.["accept-game"]?.cardIcons ?? [
                "map-outline",
                "eye-off-outline",
              ]
            }
            paragraphs={
              pageText?.["accept-game"]?.paragraphs ?? [
                <>
                  {"Rather explore? Browse "}
                  <Accent>live matches</Accent>
                  {" in the "}
                  <Accent blue>Match Making</Accent>
                  {
                    " tab at courts across the ladder and accept one that suits you."
                  }
                </>,
                <>
                  {"Your opponent is "}
                  <Accent>hidden</Accent>
                  {" until you accept the match."}
                </>,
              ]
            }
          />
        ),
      },
      {
        key: "objective",
        render: () => (
          <PageBody
            hero={<ObjectiveHero />}
            title="The Objective"
            paragraphs={[]}
          >
            <ObjectiveTiles playoffSpots={playoffSpots} />
          </PageBody>
        ),
      },
      {
        key: "cp-boosters",
        render: () => <AchievementMedalsPage />,
      },
      {
        key: "upsets",
        render: () => (
          <PageBody
            hero={<RankMattersHero />}
            title="Rank Matters"
            paragraphs={[]}
          >
            <CardList
              cards={[
                {
                  icon: "trending-up-outline",
                  gold: true,
                  text: (
                    <>
                      {"Beat a "}
                      <Accent>higher-ranked opponent</Accent>
                      {" and win "}
                      <Accent
                        gold
                      >{`up to ${UPSET_MAX_MULTIPLIER} your CP`}</Accent>
                      {"."}
                    </>
                  ),
                },
                {
                  icon: "trending-down-outline",
                  red: true,
                  text: (
                    <>
                      {"Lose against a "}
                      <Accent>lower-ranked opponent</Accent>
                      {" and "}
                      <Accent
                        red
                      >{`lose up to ${UPSET_MAX_MULTIPLIER} your CP`}</Accent>
                      {"."}
                    </>
                  ),
                },
              ]}
            />
            <Reveal order={4}>
              <FootNote>
                The bigger the CP gap, the bigger the swing. In doubles, it
                compares each team&apos;s combined CP.
              </FootNote>
            </Reveal>
          </PageBody>
        ),
      },
      {
        key: "playoffs",
        render: () => (
          <PlayoffsPage
            maxPlayers={maxPlayers}
            registeredCount={ladder?.participantCount ?? 0}
            entryFee={ladder?.entryFee ?? 0}
            currencyType={ladder?.currencyType ?? "GBP"}
            showLadderSize={showLadderSize}
          />
        ),
      },
      finalsPage,
    ],
    [
      maxPlayers,
      onReadRules,
      pageText,
      intro,
      playoffSpots,
      showLadderSize,
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

  const renderItem = ({
    item,
    index: pageIndex,
  }: ListRenderItemInfo<OnboardingPage>) => (
    <RevealContext.Provider value={pageIndex === index}>
      <PageContainer>{item.render()}</PageContainer>
    </RevealContext.Provider>
  );

  return (
    <Screen>
      <LinearGradient
        pointerEvents="none"
        colors={["rgb(3, 16, 31)", "#020b17", "#01060d"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <HowToPlayBackdrop />
      <TopBar>
        <TopBarTitle>How to Play</TopBarTitle>
      </TopBar>
      <TouchableOpacity
        onPress={onClose}
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
        extraData={index}
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
            <NavButtonText>
              {intro && index === 0 ? "Show me how" : "Next"}
            </NavButtonText>
          </NavButton>
        ) : (
          finalAction
        )}
      </NavRow>
    </Screen>
  );
};

export default HowToPlayFlow;
interface PageBodyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Shown in place of the icon. */
  hero?: React.ReactNode;
  title: string;
  paragraphs: React.ReactNode[];
  /** Shows each paragraph as a card with this icon. */
  cardIcons?: (keyof typeof Ionicons.glyphMap)[];
  children?: React.ReactNode;
  image?: ImageSourcePropType;
}

const PageBody: React.FC<PageBodyProps> = ({
  icon,
  hero,
  title,
  paragraphs,
  cardIcons,
  children,
  image,
}) => {
  const compact = useCompactScreen();
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: compact ? 14 : 20,
        paddingHorizontal: 30,
        paddingVertical: 16,
      }}
    >
      {hero ?? (icon && <PageIcon icon={icon} />)}
      {image && (
        <Reveal from="pop" style={{ width: "100%" }}>
          <ImageContainer>
            <Image source={image} resizeMode="contain" />
          </ImageContainer>
        </Reveal>
      )}
      <Reveal order={1}>
        <PageTitle compact={compact}>{title}</PageTitle>
      </Reveal>
      {cardIcons ? (
        <CardList
          cards={paragraphs.map((text, index) => ({
            icon: cardIcons[index] ?? cardIcons[cardIcons.length - 1],
            text,
          }))}
        />
      ) : paragraphs.length > 0 ? (
        <Paragraphs>
          {paragraphs.map((paragraph, index) => (
            <Reveal key={index} order={2 + index}>
              <PageText>{paragraph}</PageText>
            </Reveal>
          ))}
        </Paragraphs>
      ) : null}
      {children}
    </ScrollView>
  );
};

interface Card {
  icon: keyof typeof Ionicons.glyphMap;
  text: React.ReactNode;
  gold?: boolean;
  red?: boolean;
}

const CardList: React.FC<{ cards: Card[]; firstOrder?: number }> = ({
  cards,
  firstOrder = 2,
}) => (
  <BeatList>
    {cards.map((card, index) => (
      <Reveal key={index} order={firstOrder + index} from="right">
        <Beat>
          <BeatIcon gold={card.gold} red={card.red}>
            <Ionicons
              name={card.icon}
              size={18}
              color={accentColour({
                gold: card.gold,
                red: card.red,
                blue: true,
              })}
            />
          </BeatIcon>
          <BeatText>{card.text}</BeatText>
        </Beat>
      </Reveal>
    ))}
  </BeatList>
);

interface ObjectiveTile {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  gold?: boolean;
}

const objectiveTiles = (playoffSpots: number): ObjectiveTile[] => [
  {
    icon: "flash-outline",
    value: `${LADDER_MATCH_BEST_OF_OPTIONS[0]}–${
      LADDER_MATCH_BEST_OF_OPTIONS[LADDER_MATCH_BEST_OF_OPTIONS.length - 1]
    }`,
    label: "games a match",
  },
  { icon: "trending-up-outline", value: "Earn CP", label: "every win" },
  {
    icon: "trophy-outline",
    value: `Top ${playoffSpots}`,
    label: "go to playoffs",
    gold: true,
  },
];

const ObjectiveTiles: React.FC<{ playoffSpots: number }> = ({
  playoffSpots,
}) => (
  <>
    <Tiles>
      {objectiveTiles(playoffSpots).map((tile, index) => (
        <Reveal
          key={tile.label}
          order={2 + index}
          from="pop"
          style={{ flex: 1 }}
        >
          <Tile gold={tile.gold}>
            <Ionicons
              name={tile.icon}
              size={22}
              color={tile.gold ? "#FFC800" : "#00A2FF"}
            />
            <TileValue gold={tile.gold} numberOfLines={1} adjustsFontSizeToFit>
              {tile.value}
            </TileValue>
            <TileLabel>{tile.label}</TileLabel>
          </Tile>
        </Reveal>
      ))}
    </Tiles>
    <Reveal order={5}>
      <PageText>
        {
          "The more CP you earn, the higher you rank. But bear in mind that you are "
        }
        <Accent red>penalised CP if you lose</Accent>
        {" games."}
      </PageText>
    </Reveal>
  </>
);

const MATCHUP_AVATAR_SIZE = 72;

const HiddenOpponent: React.FC = () => (
  <MatchupAvatar>
    <Ionicons name="help" size={34} color="#7f97a8" />
  </MatchupAvatar>
);

const MatchupHero: React.FC<{ opponent: React.ReactNode }> = ({ opponent }) => (
  <Matchup>
    <Reveal from="pop">
      <MatchupAvatar user>
        <PulseRing size={MATCHUP_AVATAR_SIZE} color="#00A2FF" />
        <Ionicons name="person" size={32} color="white" />
      </MatchupAvatar>
    </Reveal>
    <Reveal order={1} from="pop">
      <Versus>VS</Versus>
    </Reveal>
    <Reveal order={2} from="pop">
      {opponent}
    </Reveal>
  </Matchup>
);

const MatchmakingHero: React.FC = () => (
  <MatchupHero opponent={<HiddenOpponent />} />
);

const FLIP_MS = 450;

/** The hidden opponent flips over to reveal them, as if the match was just accepted. */
const RevealingOpponent: React.FC = () => {
  const active = useContext(RevealContext);
  const flip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const turn = (toValue: number) =>
      Animated.timing(flip, {
        toValue,
        duration: FLIP_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        turn(1),
        Animated.delay(1800),
        turn(0),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, flip]);

  const scaleX = flip.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1],
  });
  const face = (shown: 0 | 1) =>
    flip.interpolate({
      inputRange: [0, 0.5, 0.5001, 1],
      outputRange: shown ? [0, 0, 1, 1] : [1, 1, 0, 0],
    });

  return (
    <Animated.View style={{ transform: [{ scaleX }] }}>
      <Animated.View style={{ opacity: face(0) }}>
        <HiddenOpponent />
      </Animated.View>
      <Animated.View
        style={{ position: "absolute", top: 0, left: 0, opacity: face(1) }}
      >
        <MatchupAvatar revealed>
          <Ionicons name="person" size={32} color="white" />
        </MatchupAvatar>
      </Animated.View>
    </Animated.View>
  );
};

/** The user, ranked lower, takes on a top-ranked opponent while a CP bonus floats up. */
const RankMattersHero: React.FC = () => {
  const active = useContext(RevealContext);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(rise, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, rise]);

  return (
    <Matchup>
      <Reveal from="pop">
        <RankedAvatar>
          <MatchupAvatar user>
            <PulseRing size={MATCHUP_AVATAR_SIZE} color="#00A2FF" />
            <Ionicons name="person" size={32} color="white" />
          </MatchupAvatar>
          <RankChip>
            <RankChipText>#40</RankChipText>
          </RankChip>
        </RankedAvatar>
      </Reveal>
      <Reveal order={1} from="pop">
        <VersusColumn>
          <Animated.View
            style={{
              opacity: rise.interpolate({
                inputRange: [0, 0.15, 0.7, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: rise.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, -14],
                  }),
                },
              ],
            }}
          >
            <RankGain>{`+${UPSET_MAX_MULTIPLIER} CP`}</RankGain>
          </Animated.View>
          <Versus>VS</Versus>
        </VersusColumn>
      </Reveal>
      <Reveal order={2} from="pop">
        <RankedAvatar>
          <MatchupAvatar revealed>
            <Ionicons name="person" size={32} color="white" />
            <Crown>
              <Ionicons name="ribbon" size={16} color="#FFC800" />
            </Crown>
          </MatchupAvatar>
          <RankChip gold>
            <RankChipText gold>#3</RankChipText>
          </RankChip>
        </RankedAvatar>
      </Reveal>
    </Matchup>
  );
};

const AcceptHero: React.FC = () => (
  <MatchupHero opponent={<RevealingOpponent />} />
);

const ObjectiveHero: React.FC = () => {
  const compact = useCompactScreen();
  return (
    <Reveal from="pop">
      <HowToPlayLadderClimb rowHeight={compact ? 34 : 42} />
    </Reveal>
  );
};

const PageIcon: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  gold?: boolean;
  /** For pages with a table, where the icon sits beside the title. */
  small?: boolean;
}> = ({ icon, gold, small }) => {
  const compact = useCompactScreen();
  const size = small ? 56 : compact ? 72 : 96;
  const color = gold ? "#FFC800" : "#00A2FF";
  return (
    <Reveal from="pop">
      <IconCircle gold={gold} size={size}>
        <PulseRing size={size} color={color} />
        <Ionicons name={icon} size={Math.round(size * 0.48)} color={color} />
      </IconCircle>
    </Reveal>
  );
};

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
      gap: 14,
      paddingHorizontal: 24,
      paddingVertical: 16,
    }}
  >
    <SideHeader>
      <PageIcon icon="trophy-outline" gold small />
      <Reveal order={1}>
        <PageTitle compact>Prize Distribution</PageTitle>
      </Reveal>
    </SideHeader>
    <Paragraphs>
      <Reveal order={2}>
        <PageText>{`What each ${noun} takes home, by where they finish.`}</PageText>
      </Reveal>
      <Reveal order={3}>
        <PageText>
          {isPaid
            ? "Cash is paid and CP is awarded when the playoffs end."
            : "CP is awarded when the playoffs end."}
        </PageText>
      </Reveal>
    </Paragraphs>
    <Table testID="how-to-play-prize-table">
      <TableRow header>
        <TableCell header flex={1.6}>
          Finish
        </TableCell>
        {isPaid ? <TableCell header>Cash each</TableCell> : null}
        <TableCell header>CP each</TableCell>
      </TableRow>
      {rows.map((row, index) => (
        <Reveal key={row.fromPlace} order={4 + index} from="right">
          <TableRow>
            <TableCell flex={1.6} place>
              {row.label}
            </TableCell>
            {isPaid ? (
              <TableCell gold>
                {formatCurrency(row.cash, currencyType)}
              </TableCell>
            ) : null}
            <TableCell>{row.cp.toLocaleString()}</TableCell>
          </TableRow>
        </Reveal>
      ))}
    </Table>
  </ScrollView>
);

interface PlayoffsPageProps {
  maxPlayers: number;
  registeredCount: number;
  entryFee: number;
  currencyType: string;
  showLadderSize: boolean;
}

const PlayoffsPage: React.FC<PlayoffsPageProps> = ({
  maxPlayers,
  registeredCount,
  entryFee,
  currencyType,
  showLadderSize,
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
        gap: 14,
        paddingHorizontal: 24,
        paddingVertical: 16,
      }}
    >
      <SideHeader>
        <PageIcon icon="git-network-outline" small />
        <Reveal order={1}>
          <PageTitle compact>The Playoffs</PageTitle>
        </Reveal>
      </SideHeader>
      <CardList
        cards={[
          {
            icon: "flag-outline",
            gold: true,
            text: (
              <>
                {"When the season ends, the "}
                <Accent gold>top players</Accent>
                {" go into a "}
                <Accent gold>knockout</Accent>
                {"."}
              </>
            ),
          },
          {
            icon: "hourglass-outline",
            text: (
              <>
                {"Each round has "}
                <Accent>{`${LADDER_PLAYOFF_TIE_DAYS} days`}</Accent>
                {" to be played."}
              </>
            ),
          },
        ]}
      />
      <Table>
        <TableRow header>
          <TableCell header flex={1.2}>
            Final ladder size
          </TableCell>
          <TableCell header>Playoff spots</TableCell>
          <TableCell header>In the money</TableCell>
        </TableRow>
        {LADDER_PLAYOFF_SIZES.map((size, index) => {
          const row = LADDER_PLAYOFF_STRUCTURE[size];
          const isCurrent = size === effectiveSize;
          return (
            <Reveal key={size} order={5 + index} from="right">
              <TableRow highlighted={isCurrent}>
                <TableCell flex={1.2} highlighted={isCurrent}>
                  {size}
                </TableCell>
                <TableCell highlighted={isCurrent}>
                  {row.playoffSpots}
                </TableCell>
                <TableCell highlighted={isCurrent}>{row.inTheMoney}</TableCell>
              </TableRow>
            </Reveal>
          );
        })}
      </Table>
      <FootNote testID="how-to-play-playoff-highlight">
        The bracket size depends on how many players have registered when
        registration closes.
      </FootNote>
      {showLadderSize ? (
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
      ) : null}
    </ScrollView>
  );
};

const FinalsPage: React.FC<{
  onReadRules: () => void;
  inTheMoney: number;
  isPaid: boolean;
}> = ({ onReadRules, inTheMoney, isPaid }) => {
  const compact = useCompactScreen();
  const [champion, ...placed] = ladders;
  const heroSize = compact ? 104 : 128;
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: compact ? 12 : 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
      }}
    >
      <Reveal from="pop">
        <IconCircle gold size={heroSize}>
          <PulseRing size={heroSize} color="#FFC800" />
          <TrophyImage
            source={champion}
            resizeMode="contain"
            size={heroSize * 0.66}
          />
        </IconCircle>
      </Reveal>
      <TrophyRow>
        {placed.map((trophy, index) => (
          <Reveal key={index} order={1 + index} from="pop">
            <TrophyImage source={trophy} resizeMode="contain" size={40} />
          </Reveal>
        ))}
      </TrophyRow>
      <Reveal order={4}>
        <PageTitle compact={compact}>Winning the Final</PageTitle>
      </Reveal>
      <CardList
        firstOrder={5}
        cards={[
          {
            icon: "trophy-outline",
            gold: true,
            text: (
              <>
                {"Win the Final to be crowned "}
                <Accent gold>champion</Accent>
                {`! Top\u00A0${inTheMoney} ${isPaid ? "paid" : "awarded CP"} in a full ladder.`}
              </>
            ),
          },
          {
            icon: "cash-outline",
            text: (
              <>
                <Accent gold>Cash prizes</Accent>
                {" are paid and "}
                <Accent blue>CP</Accent>
                {" is awarded once the playoffs finish."}
              </>
            ),
          },
        ]}
      />
      <Reveal order={7} style={{ alignSelf: "stretch" }}>
        <ReadRulesButton onPress={onReadRules}>
          <AntDesign name="book" size={15} color="#00A2FF" />
          <ButtonText>Read the full rules</ButtonText>
        </ReadRulesButton>
      </Reveal>
      <Reveal order={8}>
        <FootNote>
          You can also open the rules anytime from the ladder page&apos;s menu.
        </FootNote>
      </Reveal>
    </ScrollView>
  );
};

/** The cap on the extra CP when ranks are far apart. */
const UPSET_MAX_MULTIPLIER = "3×";

/** An Assassin's winning margin, worded for the sport. */
const DECISIVE_WIN_LEAD = "10\u2011point lead";

const MEDAL_GUIDE: {
  medal: ImageSourcePropType;
  name: string;
  how: string;
  boost: string;
}[] = [
  {
    medal: gameMedals.win_streak_3,
    name: "3 Win Streak",
    how: "Win 3 games in a row",
    boost: "3×",
  },
  {
    medal: gameMedals.win_streak_5,
    name: "5 Win Streak",
    how: "Win 5 games in a row",
    boost: "4×",
  },
  {
    medal: gameMedals.win_streak_7,
    name: "7 Win Streak",
    how: "Win 7 games in a row",
    boost: "5×",
  },
  {
    medal: gameMedals.demon_win,
    name: "Assassin",
    how: `Win a game with a ${DECISIVE_WIN_LEAD}`,
    boost: "2×",
  },
];

const AchievementMedalsPage: React.FC = () => {
  const compact = useCompactScreen();
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: compact ? 12 : 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
      }}
    >
      <Reveal>
        <PageTitle compact={compact}>Achievement Medals</PageTitle>
      </Reveal>
      <Reveal order={1}>
        <PageText>
          Earn bonus CP with medals for win streaks, big wins and long-distance
          wins.
        </PageText>
      </Reveal>
      <BeatList>
        {MEDAL_GUIDE.map((entry, index) => (
          <Reveal key={entry.name} order={2 + index} from="right">
            <MedalRow>
              <MedalImage source={entry.medal} resizeMode="contain" />
              <MedalInfo>
                <MedalName>{entry.name}</MedalName>
                <MedalHow>{entry.how}</MedalHow>
              </MedalInfo>
              <Boost>
                <BoostValue>{entry.boost}</BoostValue>
                <BoostUnit>CP</BoostUnit>
              </Boost>
            </MedalRow>
          </Reveal>
        ))}
      </BeatList>
      <Reveal order={2 + MEDAL_GUIDE.length}>
        <FootNote>
          {`Losses work the same way: a losing streak, or an opponent's ${DECISIVE_WIN_LEAD}, multiplies the CP you lose.`}
        </FootNote>
      </Reveal>
    </ScrollView>
  );
};

const MedalRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 7,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.06)",
});

const MedalImage = styled.Image({
  width: 42,
  height: 42,
});

const MedalInfo = styled.View({
  flex: 1,
  gap: 2,
});

const MedalName = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "bold",
});

const MedalHow = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
});

const Boost = styled.View({
  width: 70,
  marginRight: -12,
  alignItems: "center",
  paddingVertical: 6,
  borderLeftWidth: 1,
  borderLeftColor: "rgba(255, 255, 255, 0.08)",
});

const BoostValue = styled.Text({
  color: "#FFC800",
  fontSize: 22,
  fontWeight: "bold",
});

const BoostUnit = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "bold",
  letterSpacing: 1,
});

const Matchup = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 22,
});

interface MatchupAvatarStyle {
  user?: boolean;
  revealed?: boolean;
}

const matchupGlow = ({ user, revealed }: MatchupAvatarStyle) => {
  if (user) return "#00A2FF";
  if (revealed) return "#FFC800";
  return undefined;
};

const MatchupAvatar = styled.View<MatchupAvatarStyle>(
  (avatar: MatchupAvatarStyle) => {
    const glow = matchupGlow(avatar);
    return {
      width: MATCHUP_AVATAR_SIZE,
      height: MATCHUP_AVATAR_SIZE,
      borderRadius: MATCHUP_AVATAR_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: glow ? "transparent" : "rgba(255, 255, 255, 0.04)",
      borderWidth: 2,
      borderStyle: glow ? "solid" : "dashed",
      borderColor: glow ?? "#33445a",
      shadowColor: glow ?? "transparent",
      shadowOpacity: glow ? 0.9 : 0,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    };
  },
);

const RankedAvatar = styled.View({
  alignItems: "center",
});

const RankChip = styled.View<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    marginTop: -10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgb(3, 16, 31)",
    borderWidth: 1,
    borderColor: gold ? "#FFC800" : "#00A2FF",
  }),
);

const RankChipText = styled.Text<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    color: gold ? "#FFC800" : "#00A2FF",
    fontSize: 12,
    fontWeight: "bold",
  }),
);

const Crown = styled.View({
  position: "absolute",
  top: -10,
  right: -2,
  width: 26,
  height: 26,
  borderRadius: 13,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgb(3, 16, 31)",
  borderWidth: 1,
  borderColor: "#FFC800",
});

const VersusColumn = styled.View({
  alignItems: "center",
});

const RankGain = styled.Text({
  color: "#FFC800",
  fontSize: 13,
  fontWeight: "bold",
});

const Versus = styled.Text({
  color: "#FFC800",
  fontSize: 22,
  fontWeight: "bold",
  fontStyle: "italic",
});

const StepList = styled.View({
  alignSelf: "center",
});

const StepRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 16,
});

const STEP_ICON_SIZE = 50;

const StepIcon = styled.View({
  width: STEP_ICON_SIZE,
  height: STEP_ICON_SIZE,
  borderRadius: STEP_ICON_SIZE / 2,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 162, 255, 0.12)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.45)",
});

const StepLine = styled.View({
  width: 2,
  height: 26,
  marginVertical: 4,
  marginLeft: STEP_ICON_SIZE / 2 - 1,
  borderRadius: 1,
  backgroundColor: "rgba(0, 162, 255, 0.35)",
});

const BeatList = styled.View({
  alignSelf: "stretch",
  gap: 10,
});

const Beat = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.06)",
});

const beatIconTint = ({ gold, red }: AccentColour) => {
  if (red) return "rgba(255, 107, 107, 0.14)";
  if (gold) return "rgba(255, 200, 0, 0.12)";
  return "rgba(0, 162, 255, 0.15)";
};

const BeatIcon = styled.View<AccentColour>((icon: AccentColour) => ({
  width: 34,
  height: 34,
  borderRadius: 17,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: beatIconTint(icon),
}));

const BeatText = styled.Text({
  flex: 1,
  color: "#c9d6e3",
  fontSize: 15,
  lineHeight: 21,
});

interface AccentColour {
  blue?: boolean;
  gold?: boolean;
  red?: boolean;
}

const accentColour = ({ blue, gold, red }: AccentColour) => {
  if (red) return "#FF6B6B";
  if (gold) return "#FFC800";
  if (blue) return "#00A2FF";
  return "#ffffff";
};

const Accent = styled.Text<AccentColour>((accent: AccentColour) => ({
  fontWeight: "bold",
  color: accentColour(accent),
}));

const Tiles = styled.View({
  flexDirection: "row",
  alignSelf: "stretch",
  gap: 10,
});

const Tile = styled.View<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: gold ? "rgba(255, 200, 0, 0.3)" : "rgba(0, 162, 255, 0.3)",
    backgroundColor: gold
      ? "rgba(255, 200, 0, 0.08)"
      : "rgba(0, 162, 255, 0.08)",
  }),
);

const TileValue = styled.Text<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    color: gold ? "#FFC800" : "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  }),
);

const TileLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  textAlign: "center",
});

const StepText = styled.Text({
  color: "#ffffff",
  fontSize: 17,
  fontWeight: "bold",
});

const Screen = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
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

const IconCircle = styled.View<{ gold?: boolean; size: number }>(
  ({ gold, size }: { gold?: boolean; size: number }) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: gold
      ? "rgba(255, 200, 0, 0.12)"
      : "rgba(0, 162, 255, 0.12)",
    borderWidth: 1,
    borderColor: gold ? "rgba(255, 200, 0, 0.35)" : "rgba(0, 162, 255, 0.35)",
  }),
);

const SideHeader = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
});

const PageTitle = styled.Text<{ compact?: boolean }>(
  ({ compact }: { compact?: boolean }) => ({
    color: "#ffffff",
    fontSize: compact ? 23 : 27,
    fontWeight: "bold",
    textAlign: "center",
  }),
);

const PageText = styled.Text({
  color: "#cccccc",
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
});

const Paragraphs = styled.View({
  gap: 12,
});

const FootNote = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  lineHeight: 18,
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
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: "rgba(0, 162, 255, 0.08)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.45)",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
  gap: 8,
});

const TrophyRow = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  gap: 18,
});

const TrophyImage = styled.Image<{ size: number }>(
  ({ size }: { size: number }) => ({
    width: size,
    height: size,
  }),
);

const ButtonText = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
});

interface TableCellStyle {
  header?: boolean;
  highlighted?: boolean;
  gold?: boolean;
  place?: boolean;
  flex?: number;
}

const tableCellColor = ({
  header,
  highlighted,
  gold,
  place,
}: TableCellStyle) => {
  if (header) return "#9fb8c8";
  if (gold) return "#FFC800";
  if (highlighted || place) return "#00A2FF";
  return "#e2e8f0";
};

const TableCell = styled.Text<TableCellStyle>((cell: TableCellStyle) => ({
  flex: cell.flex ?? 1,
  paddingVertical: 9,
  paddingHorizontal: 10,
  fontSize: 13,
  textAlign: "center",
  fontWeight:
    cell.header || cell.highlighted || cell.gold || cell.place
      ? "bold"
      : "normal",
  color: tableCellColor(cell),
}));

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

export {
  NavButton as HowToPlayButton,
  NavButtonText as HowToPlayButtonText,
  Accent as HowToPlayAccent,
};
