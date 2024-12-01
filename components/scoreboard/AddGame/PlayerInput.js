import React from "react";
import { Modal, TextInput, Button } from "react-native";

const PlayerInputs = ({
  visible,
  selectedPlayers,
  setSelectedPlayers,
  team1Score,
  team2Score,
  setTeam1Score,
  setTeam2Score,
  onClose,
  onAddGame,
}) => (
  <PlayerInputContainer>
    <PlayerInput
      onChangeText={(newPlayer) => settingPlayer(newPlayer)}
      value={player}
      placeholder="register player"
      placeholderTextColor="#00A2FF"
    />
    <RegisterPlayerButton onPress={() => registerPlayer(player)}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "bold",
          color: "white",
        }}
      >
        Register Player
      </Text>
    </RegisterPlayerButton>
  </PlayerInputContainer>
);

const PlayerInput = styled.TextInput({
  fontSize: 15,
  padding: 15,
  borderRadius: 8,
  color: "#00A2FF",
  backgroundColor: "#001123",
  flex: 1,
  borderTopLeftRadius: 8,
  borderBottomLeftRadius: 8,
});

const PlayerInputContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#001123",
  borderRadius: 8,
  padding: 5,
});

const RegisterPlayerButton = styled.TouchableOpacity({
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 8,
  width: 130,
  backgroundColor: "#00A2FF",
  marginLeft: 5,
  borderTopRightRadius: 8,
  borderBottomRightRadius: 8,
});

export default PlayerInputs;
