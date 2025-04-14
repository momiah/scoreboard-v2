import React, { useContext, useEffect, useState } from "react";
import { LeagueContext } from "../../context/LeagueContext";
import EditLeagueModal from "../../components/Modals/EditLeagueModal";
import { useRoute, useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity } from "react-native";

const EditLeagueScreen = () => {
  const { leagues } = useContext(LeagueContext);
  const route = useRoute();
  const navigation = useNavigation();
  const [leagueData, setLeagueData] = useState(null);
  const leagueId = route?.params?.leagueId;

  useEffect(() => {
    if (leagueId) {
      const league = leagues.find((l) => l.id === leagueId);
      if (league) {
        setLeagueData(league);
      }
    }
  }, [leagueId, leagues]);

  if (!leagueId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "black" }}>
        <Text style={{ color: "white", fontSize: 18, marginBottom: 10 }}>
          No league selected.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          style={{
            backgroundColor: "#2196F3",
            padding: 12,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "white", fontSize: 16 }}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    leagueData && (
      <View style={{ flex: 1, backgroundColor: "black" }}>
        <EditLeagueModal
          visible={true}
          onClose={() => navigation.goBack()}
          leagueData={leagueData}
        />
      </View>
    )
  );
};

export default EditLeagueScreen;
