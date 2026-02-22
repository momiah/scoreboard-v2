import React, {
  useRef,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { View, Image, ScrollView } from "react-native";
import styled from "styled-components/native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useForm, Control } from "react-hook-form";

import { CourtChampLogo } from "../../../assets";
import SubHeader from "../../../components/SubHeader";
import AddTournamentModal from "../../../components/Modals/AddTournamentModal";
import TournamentGrid from "../../../components/Tournaments/TournamentGrid";
import FilterSheetModal from "../../../components/Modals/FilterSheetModal";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import { Tournament } from "../../../types/competition";
import { UserProfile } from "../../../types/player";
import TournamentsSkeleton from "../../../components/Skeletons/TournamentsSkeleton";

interface TournamentWithId extends Tournament {
  id?: string;
  tournamentId?: string;
}

interface FilterValues {
  country: string;
  countryCode: string;
  city: string;
  tournamentType: string;
  maxPlayers: number | null;
}

type RootStackParamList = {
  Tournament: { tournamentId: string };
  Login: undefined;
};

const FILTERS_STORAGE_KEY = "@courtchamp_tournament_filters";

const Tournaments: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [addTournamentModalVisible, setAddTournamentModalVisible] =
    useState<boolean>(false);

  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [isFilterModalReady, setIsFilterModalReady] = useState<boolean>(false);

  const { currentUser } = useContext(UserContext) as {
    currentUser: UserProfile | null;
  };
  const { fetchTournaments } = useContext(LeagueContext);

  const [loadingTournaments, setLoadingTournaments] = useState<boolean>(true);
  const [tournaments, setTournaments] = useState<TournamentWithId[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<
    TournamentWithId[]
  >([]);

  const initialFilterValues: FilterValues = {
    country: currentUser?.location?.country || "",
    countryCode: currentUser?.location?.countryCode || "",
    city: "",
    tournamentType: "",
    maxPlayers: null,
  };

  const [appliedFilters, setAppliedFilters] =
    useState<FilterValues>(initialFilterValues);

  const { control, getValues, setValue, watch, reset } = useForm<FilterValues>({
    defaultValues: initialFilterValues,
  });

  const watchedCountryCode = watch("countryCode");

  // Load saved filters on component mount
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedFilters = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters);
          setAppliedFilters(parsedFilters);
          (Object.keys(parsedFilters) as Array<keyof FilterValues>).forEach(
            (key) => {
              setValue(key, parsedFilters[key]);
            },
          );
        }
      } catch (error) {
        console.error("Error loading saved filters:", error);
      }
    };
    loadSavedFilters();
  }, [setValue]);

  // Fetch tournaments effect
  useEffect(() => {
    const fetchAndSetTournaments = async () => {
      try {
        setLoadingTournaments(true);
        const fetchedTournaments = await fetchTournaments({
          countryCode: appliedFilters.countryCode || null,
        });
        setTournaments(
          fetchedTournaments.filter((t: Tournament) => t.privacy === "Public"),
        );
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        setTournaments([]);
      } finally {
        setLoadingTournaments(false);
      }
    };
    fetchAndSetTournaments();
  }, [appliedFilters.countryCode]);

  // Apply filters whenever tournaments or appliedFilters change
  useEffect(() => {
    if (tournaments.length === 0) {
      setFilteredTournaments([]);
      return;
    }

    setIsFiltering(true);

    const filtered = tournaments.filter((tournament) => {
      const tournamentType = String(tournament.tournamentType).toLowerCase();
      const filterTournamentType =
        appliedFilters.tournamentType?.toLowerCase() || "";

      return (
        // Country filter
        (!appliedFilters.country ||
          tournament.location.country === appliedFilters.country) &&
        // City filter
        (!appliedFilters.city ||
          tournament.location.city === appliedFilters.city) &&
        // Tournament type filter
        (!appliedFilters.tournamentType ||
          tournamentType === filterTournamentType) &&
        // Max players filter
        (!appliedFilters.maxPlayers ||
          tournament.maxPlayers === appliedFilters.maxPlayers)
      );
    });

    setFilteredTournaments(filtered);
    setIsFiltering(false);
  }, [tournaments, appliedFilters]);

  const handleApplyFilters = async (): Promise<void> => {
    const currentValues = getValues();
    console.log("Applying new filters:", currentValues);

    // Save filters to AsyncStorage
    try {
      await AsyncStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify(currentValues),
      );
    } catch (error) {
      console.error("Error saving filters:", error);
    }

    setAppliedFilters(currentValues);
  };

  const addTournament = async (): Promise<void> => {
    const token = await AsyncStorage.getItem("userToken");

    if (token && currentUser) {
      setAddTournamentModalVisible(true);
    } else {
      navigation.navigate("Login");
    }
  };

  const showFilterSheet = useCallback((): void => {
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
  const handleModalDismiss = useCallback((): void => {
    // Keep modal mounted but mark as not ready to prevent unnecessary re-renders
    setTimeout(() => {
      setIsFilterModalReady(false);
    }, 300); // Wait for dismiss animation
  }, []);

  const hasActiveFilters: boolean =
    !!appliedFilters.country ||
    !!appliedFilters.city ||
    !!appliedFilters.tournamentType ||
    !!appliedFilters.maxPlayers;

  // Sort tournaments by start date
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <TournamentContainer>
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
          title="Tournaments"
          onIconPress={addTournament}
          showIcon
          actionText=""
          navigationRoute=""
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

      {isFiltering || loadingTournaments ? (
        <TournamentsSkeleton />
      ) : filteredTournaments.length > 0 ? (
        <ScrollView style={{ flex: 1, marginTop: 20 }}>
          <TournamentGrid
            navigationRoute="Tournament"
            tournaments={sortedTournaments}
          />
        </ScrollView>
      ) : (
        <EmptyState>
          <EmptyText>
            {hasActiveFilters
              ? "No tournaments match your current filters. Try adjusting your search criteria or create your own tournament! 🏆"
              : "No tournaments available in your area. Help grow the community by creating your own tournament! 🏆"}
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
          control={control as Control<FilterValues>}
          setValue={setValue}
          onApplyFilters={handleApplyFilters}
          watchedCountryCode={watchedCountryCode}
          initialValues={appliedFilters}
          isFiltering={isFiltering}
          isVisible={isFilterModalReady}
        />
      </BottomSheetModal>

      {addTournamentModalVisible && (
        <AddTournamentModal
          modalVisible={addTournamentModalVisible}
          setModalVisible={setAddTournamentModalVisible}
          onSuccess={() => {
            fetchTournaments();
          }}
        />
      )}
    </TournamentContainer>
  );
};

const TournamentContainer = styled.View({
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

export default Tournaments;
