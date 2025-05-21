import React, { useRef, useContext, useEffect, useState } from "react";
import { View, Image, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { useForm } from "react-hook-form";

import { CourtChampLogo } from "../../../assets";
import SubHeader from "../../../components/SubHeader";
import AddLeagueModel from "../../../components/Modals/AddLeagueModal";
import VerticalLeagueCarousel from "../../../components/Leagues/VerticalLeagueCarousel";
import FilterSheetModal from "../../../components/Modals/FilterSheetModal";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";

const Leagues = () => {
  const navigation = useNavigation();
  const bottomSheetRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const { currentUser } = useContext(UserContext);
  const { leagues } = useContext(LeagueContext);

  // Initial form values with the user's country
  const initialFilterValues = {
    country: currentUser?.location?.country || "",
    countryCode: currentUser?.location?.countryCode || "",
    city: "",
    matchType: "",
    maxPlayers: null,
  };

  const { control, getValues, setValue, watch, reset } = useForm({
    defaultValues: initialFilterValues,
  });

  const watchedCountryCode = watch("countryCode");
  const [filteredLeagues, setFilteredLeagues] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(initialFilterValues);

  //  const [loadingLeagues, setLoadingLeagues] = useState(false);

  // Initialize leagues only on first load with country filter only
  useEffect(() => {
    // Only filter by country on initial load
    const publicLeagues = leagues.filter(
      (league) =>
        league.privacy === "Public" &&
        (!appliedFilters.country ||
          league.location.country === appliedFilters.country)
    );
    setFilteredLeagues(publicLeagues);
  }, [leagues]);

  const handleApplyFilters = () => {
    const currentValues = getValues();
    setAppliedFilters(currentValues);
    setIsFiltering(true);

    setTimeout(() => {
      const publicLeagues = leagues.filter(
        (league) => league.privacy === "Public"
      );

      const filtered = publicLeagues.filter((league) => {
        return (
          (!currentValues.country ||
            league.location.country === currentValues.country) &&
          (!currentValues.city ||
            league.location.city === currentValues.city) &&
          (!currentValues.matchType ||
            league.leagueType === currentValues.matchType.toLowerCase()) &&
          (!currentValues.maxPlayers ||
            league.maxPlayers === currentValues.maxPlayers)
        );
      });

      setFilteredLeagues(filtered);
      setIsFiltering(false);
    }, 200); // slight delay to allow UI to update
  };

  const addLeague = async () => {
    const token = await AsyncStorage.getItem("userToken");

    if (token) {
      setModalVisible(true);
    } else {
      navigation.navigate("Login");
    }
  };

  const showFilterSheet = () => {
    // Reset form to last applied filters when opening filter sheet
    reset(appliedFilters);
    setFilterSheetVisible(true);
    bottomSheetRef.current?.present();
  };

  return (
    <LeagueContainer>
      <Overview>
        <Image
          source={CourtChampLogo}
          style={{ width: 175, height: 175, resizeMode: "contain" }}
        />
      </Overview>

      <View
        style={{
          marginTop: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 10,
        }}
      >
        <SubHeader
          paddingTop={0}
          paddingBottom={0}
          title="Leagues"
          onIconPress={addLeague}
          showIcon
        />
        <Ionicons
          name="filter"
          size={25}
          color={"white"}
          onPress={showFilterSheet}
        />
      </View>

      {isFiltering ? (
        <LoadingWrapper>
          <ActivityIndicator size="large" color="#00A2FF" />
        </LoadingWrapper>
      ) : filteredLeagues.length > 0 ? (
        <VerticalLeagueCarousel
          navigationRoute={"League"}
          leagues={filteredLeagues}
        />
      ) : (
        <EmptyState>
          <EmptyText>
            There are no leagues matching your criteria, please try broaden your
            search or you can help grow the community by creating your own
            league! 🏟️
          </EmptyText>
        </EmptyState>
      )}

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["75%"]}
        onDismiss={() => setFilterSheetVisible(false)}
        backdropComponent={({ style }) => (
          <View style={[style, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
        )}
        backgroundStyle={{ backgroundColor: "#020D18" }}
        handleIndicatorStyle={{ backgroundColor: "white" }}
      >
        {filterSheetVisible && (
          <FilterSheetModal
            bottomSheetRef={bottomSheetRef}
            control={control}
            setValue={setValue}
            onApplyFilters={handleApplyFilters}
            watchedCountryCode={watchedCountryCode}
            initialValues={appliedFilters}
            isFiltering={isFiltering}
          />
        )}
      </BottomSheetModal>

      {modalVisible && (
        <AddLeagueModel
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
        />
      )}
    </LeagueContainer>
  );
};

const LeagueContainer = styled.View({
  flex: 1,
  backgroundColor: " rgb(3, 16, 31)",
  width: "100%",
  paddingHorizontal: 20,
});

const Overview = styled.View({
  flexDirection: "row",
  height: 100,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingRight: 15,
});

const LoadingWrapper = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const EmptyState = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const EmptyText = styled.Text({
  color: "#aaa",
  fontSize: 16,
  fontStyle: "italic",
  textAlign: "center",
});

export default Leagues;
