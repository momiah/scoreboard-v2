import React, { useContext } from "react";
import { View, Text } from "react-native";
import { LeagueContext } from "../context/LeagueContext";

const Profile = () => {
  const { calculateParticipantTotals } = useContext(LeagueContext);
  calculateParticipantTotals();

  console.log("Profile screen rendered");

  return (
    <View>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Profile</Text>
      <Text>This is the profile screen.</Text>
    </View>
  );
};

export default Profile;
