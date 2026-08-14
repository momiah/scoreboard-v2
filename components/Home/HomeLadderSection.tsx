import React, { useContext } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";

import SubHeader from "../SubHeader";
import Tag from "../Tag";
import ActionPlaceholder from "../ActionPlaceholder";
import { HorizontalLeagueCarouselSkeleton } from "../Skeletons/HomeSkeleton";
import HorizontalCardCarousel, {
  CardTagContainer,
  CardTitle,
  CardSubtitle,
  CardRow,
} from "./HorizontalCardCarousel";
import { LadderContext } from "../../context/LadderContext";
import { ccDefaultImage } from "../../mockImages/index";
import type { Ladder } from "@shared/types";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  registrationOpen: { label: "Registration Open", color: "#FAB234" },
  registrationClosed: { label: "Registration Closed", color: "#FF9800" },
  playoffs: { label: "Playoffs", color: "#286EFA" },
  completed: { label: "Completed", color: "#1A6B1A" },
  cancelled: { label: "Cancelled", color: "#FF4757" },
};

interface HomeLadderSectionProps {
  loading: boolean;
}

const HomeLadderSection: React.FC<HomeLadderSectionProps> = ({ loading }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { upcomingLadders } = useContext(LadderContext);

  return (
    <>
      <SubHeader title="Ladders" />
      {loading ? (
        <HorizontalLeagueCarouselSkeleton />
      ) : upcomingLadders.length > 0 ? (
        <HorizontalCardCarousel
          cards={upcomingLadders.map((ladder: Ladder, index) => {
            const status = STATUS_LABELS[ladder.status];
            const numberOfPlayers = `${ladder.participantCount} / ${ladder.maxPlayers}`;

            return {
              key: ladder.ladderId || String(index),
              source: ladder.image ? { uri: ladder.image } : ccDefaultImage,
              onPress: () =>
                navigation.navigate("Ladder", { ladderId: ladder.ladderId }),
              content: (
                <>
                  <CardTagContainer>
                    <Tag name={ladder.ladderType} />
                    {status ? (
                      <Tag name={status.label} color={status.color} />
                    ) : null}
                  </CardTagContainer>

                  <PlayersRow>
                    <Tag
                      name={numberOfPlayers}
                      color="rgba(0, 0, 0, 0.7)"
                      iconColor="#00A2FF"
                      iconSize={15}
                      icon="person"
                      iconPosition="right"
                      bold
                    />
                  </PlayersRow>

                  <CardTitle>{ladder.name}</CardTitle>
                  <CardRow>
                    <CardSubtitle>{ladder.region || ""}</CardSubtitle>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <CardSubtitle>{ladder.countryCode || ""}</CardSubtitle>
                      <Ionicons
                        name="location"
                        size={15}
                        color="#286EFA"
                        style={{ marginLeft: 5 }}
                      />
                    </View>
                  </CardRow>
                </>
              ),
            };
          })}
        />
      ) : (
        <ActionPlaceholder
          message="No ladders in your area yet. Check back soon!"
          icon="trophy-outline"
          height={200}
          disabled
          onPress={() => {}}
        />
      )}
    </>
  );
};

const PlayersRow = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      paddingBottom: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    }}
  >
    {children}
  </View>
);

export default HomeLadderSection;
