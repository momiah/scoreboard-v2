import React, { useRef, useContext, useEffect, useState, useCallback } from "react";
import { View, Image } from "react-native";
import styled from "styled-components/native";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { useForm } from "react-hook-form";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { CourtChampLogo } from "../../../assets";
import SubHeader from "../../../components/SubHeader";
import AddClubModal from "../../../components/Modals/AddClubModal";
import VerticalClubsCarousel from "../../../components/Clubs/VerticalClubsCarousel";
import FilterSheetModal from "../../../components/Modals/FilterSheetModal";
import LeaguesSkeleton from "../../../components/Skeletons/LeaguesSkeleton";

import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import type { Club } from "@shared/types";

const FILTERS_STORAGE_KEY = "@courtchamp_club_filters";

const Clubs = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [addClubModalVisible, setAddClubModalVisible] = useState(false);

  const [isFiltering, setIsFiltering] = useState(false);
  const [isFilterModalReady, setIsFilterModalReady] = useState(false);

  const { currentUser } = useContext(UserContext);
  const { fetchClubs } = useContext(LeagueContext);

  const [loadingClubs, setLoadingClubs] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);

  // Clubs only carry a "City, Country" location string, so only the location
  // fields apply (leagueType / maxPlayers are hidden in the filter sheet).
  const initialFilterValues = {
    country: currentUser?.location?.country || "",
    countryCode: currentUser?.location?.countryCode || "",
    city: "",
    leagueType: "",
    maxPlayers: null,
  };

  const [appliedFilters, setAppliedFilters] = useState(initialFilterValues);

  const { control, getValues, setValue, watch, reset } = useForm({
    defaultValues: initialFilterValues,
  });

  const watchedCountryCode = watch("countryCode");

  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedFilters = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters);
          setAppliedFilters(parsedFilters);
          (
            Object.keys(parsedFilters) as (keyof typeof initialFilterValues)[]
          ).forEach((key) => setValue(key, parsedFilters[key]));
        }
      } catch (error) {
        console.error("Error loading saved club filters:", error);
      }
    };

    loadSavedFilters();
  }, [setValue]);

  // Clubs have no country field to query on, so fetch all and filter locally.
  useEffect(() => {
    const fetchAndSetClubs = async () => {
      try {
        setLoadingClubs(true);
        const fetchedClubs = await fetchClubs();
        setClubs(fetchedClubs);
      } catch (error) {
        console.error("Error fetching clubs:", error);
        setClubs([]);
      } finally {
        setLoadingClubs(false);
      }
    };

    fetchAndSetClubs();
  }, [fetchClubs]);

  // Apply location filters (matched against the club's "City, Country" string)
  useEffect(() => {
    if (clubs.length === 0) {
      setFilteredClubs([]);
      return;
    }

    setIsFiltering(true);

    const filtered = clubs.filter((club) => {
      const location = club.clubLocation;
      return (
        // Country filter
        (!appliedFilters.country ||
          location?.country === appliedFilters.country) &&
        // City filter
        (!appliedFilters.city || location?.city === appliedFilters.city)
      );
    });

    setFilteredClubs(filtered);
    setIsFiltering(false);
  }, [clubs, appliedFilters]);

  const handleApplyFilters = async () => {
    const currentValues = getValues();

    try {
      await AsyncStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify(currentValues),
      );
    } catch (error) {
      console.error("Error saving club filters:", error);
    }

    setAppliedFilters(currentValues);
  };

  const addClub = async () => {
    const token = await AsyncStorage.getItem("userToken");

    if (token && currentUser) {
      setAddClubModalVisible(true);
    } else {
      navigation.navigate("Login");
    }
  };

  const showFilterSheet = useCallback(() => {
    reset(appliedFilters);
    setIsFilterModalReady(true);
    setTimeout(() => {
      bottomSheetRef.current?.present();
    }, 50);
  }, [appliedFilters, reset]);

  const handleModalDismiss = useCallback(() => {
    setTimeout(() => {
      setIsFilterModalReady(false);
    }, 300);
  }, []);

  // Only location filters apply to clubs.
  const hasActiveFilters = Boolean(appliedFilters.country || appliedFilters.city);

  return (
    <ClubsContainer>
      <Overview>
        <Image
          source={CourtChampLogo}
          style={{ width: 175, height: 175, resizeMode: "contain" }}
        />
      </Overview>

      <View
        style={{
          marginTop: 20,
          marginBottom: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 10,
        }}
      >
        <SubHeader
          paddingTop={0}
          paddingBottom={0}
          title="Clubs"
          onIconPress={addClub}
          showIcon
        />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {hasActiveFilters && (
            <View
              style={{
                backgroundColor: "#00A2FF",
                borderRadius: 10,
                width: 8,
                height: 8,
                marginRight: 5,
              }}
            />
          )}
          <Ionicons
            name="filter"
            size={25}
            color={"white"}
            onPress={showFilterSheet}
          />
        </View>
      </View>

      {isFiltering || loadingClubs ? (
        <LeaguesSkeleton />
      ) : filteredClubs.length > 0 ? (
        <VerticalClubsCarousel clubs={filteredClubs} />
      ) : (
        <EmptyState>
          <EmptyText>
            {hasActiveFilters
              ? "No clubs match your current filters. Try adjusting your search or create your own club! 🏸"
              : "No clubs available in your area. Help grow the community by creating your own club! 🏸"}
          </EmptyText>
        </EmptyState>
      )}

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["75%"]}
        onDismiss={handleModalDismiss}
        backdropComponent={({ style }) => (
          <View style={[style, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
        )}
        backgroundStyle={{ backgroundColor: "#020D18" }}
        handleIndicatorStyle={{ backgroundColor: "white" }}
        enablePanDownToClose={true}
        enableOverDrag={false}
      >
        <FilterSheetModal
          bottomSheetRef={bottomSheetRef}
          control={control}
          setValue={setValue}
          onApplyFilters={handleApplyFilters}
          watchedCountryCode={watchedCountryCode}
          initialValues={appliedFilters}
          isFiltering={isFiltering}
          isVisible={isFilterModalReady}
          hideCompetitionFilters
          title="Filter Clubs"
        />
      </BottomSheetModal>

      {addClubModalVisible && (
        <AddClubModal
          modalVisible={addClubModalVisible}
          setModalVisible={setAddClubModalVisible}
        />
      )}
    </ClubsContainer>
  );
};

const ClubsContainer = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
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
  paddingHorizontal: 20,
});

export default Clubs;
