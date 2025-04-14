// LeagueItem.js
import React, { useContext } from "react";
import { ModalContext } from "../../context/ModalContext";
import { LeagueContext } from "../../context/LeagueContext";
import { Button } from "react-native";

const LeagueItem = ({ league }) => {
  const { setModalVisible, setSelectedLeague } = useContext(ModalContext);
  const { fetchLeagueById } = useContext(LeagueContext);

  const handleEdit = () => {
    setSelectedLeague(league); // Set the league to be edited
    setModalVisible(true); // Open the modal
    fetchLeagueById(league.id); // Optionally fetch detailed data for the league
  };

  return (
    <Button title="Edit" onPress={handleEdit} />
  );
};

export default LeagueItem;
