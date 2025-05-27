import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  InteractionManager,
  Dimensions,
} from "react-native";
import { processLeagues } from "../../helpers/processedProfileLeagues";
import { calculateLeagueStatus } from "../../helpers/calculateLeagueStatus";
import { sortLeaguesByEndDate } from "../../helpers/sortedLeaguesByEndDate";
import Tag from "../Tag";
import RankSuffix from "../RankSuffix";
import { UserContext } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedStatFontSize = screenWidth <= 400 ? 20 : 25;

const ProfileActivity = ({ profile }) => {
  const { getLeaguesForUser } = useContext(UserContext);
  const [userLeagues, setUserLeagues] = useState([]);
  const [rankData, setRankData] = useState([]);
  const [rankLoading, setRankLoading] = useState(true);

  const navigation = useNavigation();
  const navigateTo = (leagueId) => {
    navigation.navigate("League", { leagueId });
  };

  useEffect(() => {
    const fetchLeagues = async () => {
      const userId = profile?.userId;
      if (!userId) return;

      try {
        setRankLoading(true); // Start loading here
        const leagues = await getLeaguesForUser(userId);
        setUserLeagues(leagues);
      } catch (error) {
        console.error("Error fetching leagues:", error);
      } finally {
        setRankLoading(false);
      }
    };

    fetchLeagues();
  }, [profile?.userId]);

  useEffect(() => {
    let task = null;

    if (userLeagues.length > 0 && profile) {
      setRankLoading(true);

      if (userLeagues.length > 50) {
        // Heavy processing: defer with InteractionManager
        task = InteractionManager.runAfterInteractions(() => {
          processLeagues({ userLeagues, setRankData, setRankLoading, profile });
        });
      } else {
        // Light processing: run immediately
        processLeagues({ userLeagues, setRankData, setRankLoading, profile });
      }
    }

    return () => {
      if (task) task.cancel();
    };
  }, [userLeagues, profile]);

  const sortedLeagues = useMemo(
    () => sortLeaguesByEndDate(rankData),
    [rankData] // Now sorts the processed data
  );

  const renderLeagueItem = useCallback(({ item }) => {
    const leagueStatus = calculateLeagueStatus(item);
    const isOwner = item.leagueOwner?.userId === profile?.userId;
    const isAdmin =
      !isOwner &&
      item.leagueAdmins?.some((admin) => admin.userId === profile?.userId);
    return (
      <LeagueItem key={item.id} onPress={() => navigateTo(item.id)}>
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
          }}
        >
          {isOwner ? (
            <Tag
              name={"Owner"}
              color="rgb(3, 16, 31)"
              iconColor="#FFD700"
              iconSize={10}
              fontSize={8}
              icon={"star-outline"}
              iconPosition={"right"}
              bold
            />
          ) : isAdmin ? (
            <Tag
              name={"Admin"}
              color="#16181B"
              iconColor="#00A2FF"
              iconSize={10}
              fontSize={8}
              icon={"checkmark-circle-outline"}
              iconPosition={"right"}
              bold
            />
          ) : null}
        </View>
        <View
          style={{
            padding: 5,
            width: "60%",
          }}
        >
          <Text style={styles.leagueName}>{item.leagueName}</Text>
          <Text style={styles.leagueDates}>{item.location.courtName}</Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Tag name={leagueStatus?.status} color={leagueStatus?.color} />
            <Tag name={item.leagueType} />
          </View>
        </View>

        <TableCell>
          <StatTitle>Wins</StatTitle>
          <Stat>{item.wins}</Stat>
        </TableCell>
        <TableCell>
          <StatTitle>Rank</StatTitle>
          <Stat>
            <RankSuffix
              number={item.userRank}
              numberStyle={{
                fontSize: screenAdjustedStatFontSize,
                color: "white",
              }}
              suffixStyle={{
                color: "rgba(255,255,255,0.7)",
              }}
            />
          </Stat>
        </TableCell>
      </LeagueItem>
    );
  }, []);

  const renderActivityContent = useMemo(() => {
    if (rankLoading) {
      return <ActivityIndicator color="#fff" size="large" />;
    }

    return (
      <>
        {sortedLeagues.length > 0 ? (
          <FlatList
            data={sortedLeagues}
            renderItem={renderLeagueItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingBottom: 20,
            }}
          />
        ) : (
          <NoActivityText>
            Here you can find all of the leagues you are participating in.
            Please create or join a league for details 🏟️
          </NoActivityText>
        )}
      </>
    );
  }, [rankLoading, sortedLeagues, renderLeagueItem]);

  return <>{renderActivityContent}</>;
};

const LeagueItem = styled.TouchableOpacity`
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgb(26, 28, 54);
  padding: ${screenWidth <= 400 ? 12 : 17}px;
  border-radius: 8px;
  margin-bottom: 10px;
  flex-direction: row;
  justify-content: space-between;
`;

const Stat = styled.Text`
  font-size: ${screenAdjustedStatFontSize}px;
  font-weight: bold;
  color: white;
`;

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
  color: "#696969",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});

const styles = {
  container: {
    flex: 1,
    padding: 10,
  },
  leagueName: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  leagueDates: {
    color: "#ccc",
    fontSize: 12,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
  },
};

export default React.memo(ProfileActivity);
