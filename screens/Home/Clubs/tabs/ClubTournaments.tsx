import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import { FlatList, Dimensions } from "react-native";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";

import Tag from "../../../../components/Tag";
import { UserContext } from "../../../../context/UserContext";
import { calculateCompetitionStatus } from "../../../../helpers/calculateCompetitionStatus";
import { sortLeaguesByEndDate } from "../../../../helpers/sortedLeaguesByEndDate";
import { normalizeCompetitionData } from "../../../../helpers/normalizeCompetitionData";
import ProfileActivitySkeleton from "../../../../components/Skeletons/ProfileActivitySkeleton";
import AddTournamentModal from "../../../../components/Modals/AddTournamentModal";
import { db } from "../../../../services/firebase.config";
import { COMPETITION_TYPES } from "@shared";
import type { NormalizedCompetition } from "@shared/types";
import { MOCK_TOURNAMENTS, USE_MOCK_DATA } from "../mockClubData";

const { width: screenWidth } = Dimensions.get("window");

interface ClubTournamentsProps {
  clubId: string;
}

const ClubTournaments: React.FC<ClubTournamentsProps> = ({ clubId }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser } = useContext(UserContext);

  const [tournaments, setTournaments] = useState<NormalizedCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTournamentModalVisible, setAddTournamentModalVisible] =
    useState(false);

  const fetchClubTournaments = useCallback(async () => {
    if (USE_MOCK_DATA) {
      const normalized = MOCK_TOURNAMENTS.map((item) =>
        normalizeCompetitionData({
          rawData: item,
          competitionType: COMPETITION_TYPES.TOURNAMENT,
        }),
      ) as NormalizedCompetition[];
      setTournaments(normalized);
      setLoading(false);
      return;
    }
    if (!clubId) return;
    setLoading(true);
    try {
      const ref = collection(db, "tournaments");
      const q = query(
        ref,
        where("clubId", "==", clubId),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const raw = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const normalized = raw.map((item) =>
        normalizeCompetitionData({
          rawData: item,
          competitionType: COMPETITION_TYPES.TOURNAMENT,
        }),
      ) as NormalizedCompetition[];
      setTournaments(normalized);
    } catch (e) {
      console.error("Error fetching club tournaments:", e);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClubTournaments();
  }, [fetchClubTournaments]);

  const sorted = useMemo(
    () => sortLeaguesByEndDate(tournaments),
    [tournaments],
  );

  const renderItem = useCallback(
    ({ item }: { item: NormalizedCompetition }) => {
      const status = calculateCompetitionStatus(item);
      const isOwner = item.owner?.userId === currentUser?.userId;
      const isAdmin =
        !isOwner &&
        item.admins?.some((admin) => admin.userId === currentUser?.userId);

      return (
        <CompetitionItem
          onPress={() =>
            navigation.navigate("Tournament", { tournamentId: item.id })
          }
        >
          <RoleBadgeContainer>
            {isOwner ? (
              <Tag
                name="Owner"
                color="rgb(3, 16, 31)"
                iconColor="#FFD700"
                iconSize={10}
                fontSize={8}
                icon="star-outline"
                iconPosition="right"
                bold
              />
            ) : isAdmin ? (
              <Tag
                name="Admin"
                color="#16181B"
                iconColor="#00A2FF"
                iconSize={10}
                fontSize={8}
                icon="checkmark-circle-outline"
                iconPosition="right"
                bold
              />
            ) : null}
          </RoleBadgeContainer>

          <InfoContainer>
            <CompetitionName>{item.name}</CompetitionName>
            <CourtName>{item.location?.courtName}</CourtName>
            <TagRow>
              <Tag name={status?.status} color={status?.color} />
              <Tag name={item.type} />
            </TagRow>
          </InfoContainer>

          <TableCell>
            <StatTitle>Players</StatTitle>
            <Stat>{item.participants?.length ?? 0}</Stat>
          </TableCell>
        </CompetitionItem>
      );
    },
    [navigation, currentUser?.userId],
  );

  const renderContent = useMemo(() => {
    if (loading) {
      return <ProfileActivitySkeleton itemCount={4} />;
    }
    if (sorted.length === 0) {
      return (
        <NoActivityText>
          No tournaments in this club yet. Create one to get started!
        </NoActivityText>
      );
    }
    return (
      <FlatList
        data={sorted}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  }, [loading, sorted, renderItem]);

  return (
    <Container>
      <HeaderRow>
        <CreateButton onPress={() => setAddTournamentModalVisible(true)}>
          <CreateButtonText>+ Create Tournament</CreateButtonText>
        </CreateButton>
      </HeaderRow>

      {renderContent}

      <AddTournamentModal
        modalVisible={addTournamentModalVisible}
        setModalVisible={setAddTournamentModalVisible}
        clubId={clubId as never}
        onSuccess={() => {
          setAddTournamentModalVisible(false);
          fetchClubTournaments();
        }}
      />
    </Container>
  );
};

export default ClubTournaments;

const Container = styled.View({
  flex: 1,
});

const HeaderRow = styled.View({
  marginBottom: 14,
  paddingTop: 4,
});

const CreateButton = styled.TouchableOpacity({
  backgroundColor: "#00A2FF",
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
});

const CreateButtonText = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
});

const CompetitionItem = styled.TouchableOpacity({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  padding: screenWidth <= 400 ? 12 : 17,
  borderRadius: 8,
  marginBottom: 10,
  flexDirection: "row",
  justifyContent: "space-between",
});

const RoleBadgeContainer = styled.View({
  position: "absolute",
  top: 0,
  right: 0,
});

const InfoContainer = styled.View({
  padding: 5,
  width: "70%",
});

const CompetitionName = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
  marginBottom: 4,
});

const CourtName = styled.Text({
  color: "#ccc",
  fontSize: 12,
  marginBottom: 15,
});

const TagRow = styled.View({
  flexDirection: "row",
  gap: 10,
});

const Stat = styled.Text({
  fontSize: screenWidth <= 400 ? 20 : 25,
  fontWeight: "bold",
  color: "white",
});

const StatTitle = styled.Text({
  fontSize: 12,
  color: "#aaa",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
});

const NoActivityText = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});
