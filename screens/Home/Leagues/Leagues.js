import React, {
  useRef,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
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

const FILTERS_STORAGE_KEY = "@courtchamp_league_filters";

const Leagues = () => {
  const navigation = useNavigation();
  const bottomSheetRef = useRef(null);
  const [addLeagueModalVisible, setAddLeagueModalVisible] = useState(false);

  const [isFiltering, setIsFiltering] = useState(false);
  const [isFilterModalReady, setIsFilterModalReady] = useState(false);

  const { currentUser } = useContext(UserContext);
  const { fetchLeagues } = useContext(LeagueContext);

  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [leagues, setLeagues] = useState([]);
  const [filteredLeagues, setFilteredLeagues] = useState([]);

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

  // Load saved filters on component mount
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        setLoadingLeagues(true);
        const savedFilters = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters);
          setAppliedFilters(parsedFilters);

          // Update form with saved filters
          Object.keys(parsedFilters).forEach((key) => {
            setValue(key, parsedFilters[key]);
          });
        }
      } catch (error) {
        console.error("Error loading saved filters:", error);
      } finally {
        setLoadingLeagues(false);
      }
    };

    loadSavedFilters();
  }, [setValue]);

  // Fetch leagues effect
  useEffect(() => {
    const fetchAndSetLeagues = async () => {
      try {
        setLoadingLeagues(true);
        const fetchedLeagues = await fetchLeagues();
        const publicLeagues = fetchedLeagues.filter(
          (l) => l.privacy === "Public"
        );
        setLeagues(publicLeagues);
      } catch (error) {
        console.error("Error fetching leagues:", error);
        setLeagues([]);
      } finally {
        setLoadingLeagues(false);
      }
    };

    fetchAndSetLeagues();
  }, [fetchLeagues]);

  // Apply filters whenever leagues or appliedFilters change
  useEffect(() => {
    if (leagues.length === 0) {
      setFilteredLeagues([]);
      return;
    }

    setIsFiltering(true);

    const filtered = leagues.filter((league) => {
      const leagueType = String(league.leagueType).toLowerCase();
      const filterLeagueType = appliedFilters.leagueType?.toLowerCase() || "";

      return (
        // Country filter
        (!appliedFilters.country ||
          league.location.country === appliedFilters.country) &&
        // City filter
        (!appliedFilters.city ||
          league.location.city === appliedFilters.city) &&
        // League type filter
        (!appliedFilters.leagueType || leagueType === filterLeagueType) &&
        // Max players filter
        (!appliedFilters.maxPlayers ||
          league.maxPlayers === appliedFilters.maxPlayers)
      );
    });

    console.log(
      `Filtered ${leagues.length} leagues to ${filtered.length} leagues`
    );
    setFilteredLeagues(filtered);
    setIsFiltering(false);
  }, [leagues, appliedFilters]);

  const handleApplyFilters = async () => {
    const currentValues = getValues();
    console.log("Applying new filters:", currentValues);

    // Save filters to AsyncStorage
    try {
      await AsyncStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify(currentValues)
      );
    } catch (error) {
      console.error("Error saving filters:", error);
    }

    setAppliedFilters(currentValues);
  };

  const addLeague = async () => {
    const token = await AsyncStorage.getItem("userToken");

    if (token && currentUser) {
      setAddLeagueModalVisible(true);
    } else {
      navigation.navigate("Login");
    }
  };

  const showFilterSheet = useCallback(() => {
    // Pre-load the form with applied filters BEFORE opening
    reset(appliedFilters);

    // Set ready state first
    setIsFilterModalReady(true);

    // Small delay to ensure form is ready
    setTimeout(() => {
      bottomSheetRef.current?.present();
    }, 50);
  }, [appliedFilters, reset]);

  // Add callback to handle modal dismiss
  const handleModalDismiss = useCallback(() => {
    // Keep modal mounted but mark as not ready to prevent unnecessary re-renders
    setTimeout(() => {
      setIsFilterModalReady(false);
    }, 300); // Wait for dismiss animation
  }, []);

  const hasActiveFilters =
    appliedFilters.country ||
    appliedFilters.city ||
    appliedFilters.leagueType ||
    appliedFilters.maxPlayers;

  // Sort leagues by start date
  const sortedLeagues = [...filteredLeagues].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateA - dateB;
  });

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
          title="Leagues"
          onIconPress={addLeague}
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

      {isFiltering || loadingLeagues ? (
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
            {hasActiveFilters
              ? "No leagues match your current filters. Try adjusting your search criteria or create your own league! 🏟️"
              : "No leagues available in your area. Help grow the community by creating your own league! 🏟️"}
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
        {/* Always render the modal, but control its internal loading with isVisible prop */}
        <FilterSheetModal
          bottomSheetRef={bottomSheetRef}
          control={control}
          setValue={setValue}
          onApplyFilters={handleApplyFilters}
          watchedCountryCode={watchedCountryCode}
          initialValues={appliedFilters}
          isFiltering={isFiltering}
          isVisible={isFilterModalReady} // Add this prop
        />
      </BottomSheetModal>

      {addLeagueModalVisible && (
        <AddLeagueModel
          addLeagueModalVisible={addLeagueModalVisible}
          setAddLeagueModalVisible={setAddLeagueModalVisible}
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
  paddingHorizontal: 20,
});

export default Leagues;
