import React, { useState, useEffect, useMemo } from "react";
import {
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import styled from "styled-components/native";
import ListDropdown from "../ListDropdown/ListDropdown";
import { loadCountries, loadCities } from "../../utils/locationData";
import {
  leagueTypes,
  maxPlayers as maxPlayersOptions,
} from "../../schemas/schema";
import { Controller, useWatch } from "react-hook-form";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const COUNTRIES_STORAGE_KEY = "@courtchamp_countries";
const CITIES_STORAGE_KEY = "@courtchamp_cities_";

const FilterSheetModal = ({
  bottomSheetRef,
  control,
  setValue,
  onApplyFilters,
  watchedCountryCode,
  initialValues,
}) => {
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Store the initially applied values
  const [appliedValues, setAppliedValues] = useState(initialValues || {});

  // Watch form values
  const currentValues = useWatch({ control });

  // Check if there are any changes compared to applied values
  const hasChanges = useMemo(() => {
    if (!appliedValues) return false;

    return (
      currentValues.country !== appliedValues.country ||
      currentValues.city !== appliedValues.city ||
      currentValues.matchType !== appliedValues.matchType ||
      currentValues.maxPlayers !== appliedValues.maxPlayers
    );
  }, [currentValues, appliedValues]);

  // Determine if clear button should be disabled
  const isClearDisabled = useMemo(() => {
    return (
      !currentValues.country &&
      !currentValues.city &&
      !currentValues.matchType &&
      !currentValues.maxPlayers
    );
  }, [currentValues]);

  // Load countries on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        // Try to get countries from AsyncStorage first
        const storedCountries = await AsyncStorage.getItem(
          COUNTRIES_STORAGE_KEY
        );
        if (storedCountries) {
          setCountries(JSON.parse(storedCountries));
        } else {
          // If not in storage, load from source and save to AsyncStorage
          const countryData = loadCountries();
          setCountries(countryData);
          await AsyncStorage.setItem(
            COUNTRIES_STORAGE_KEY,
            JSON.stringify(countryData)
          );
        }
      } catch (error) {
        console.error("Error loading countries:", error);
        // Fallback to direct loading if storage fails
        const countryData = loadCountries();
        setCountries(countryData);
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Load cities when country changes
  useEffect(() => {
    const loadCitiesForCountry = async () => {
      if (!watchedCountryCode) {
        setCities([]);
        return;
      }

      setLoadingCities(true);
      try {
        // Try to get cities from AsyncStorage first
        const storageCitiesKey = `${CITIES_STORAGE_KEY}${watchedCountryCode}`;
        const storedCities = await AsyncStorage.getItem(storageCitiesKey);

        if (storedCities) {
          setCities(JSON.parse(storedCities));
        } else {
          // If not in storage, load from source and save to AsyncStorage
          const cityData = loadCities(watchedCountryCode);
          setCities(cityData);
          await AsyncStorage.setItem(
            storageCitiesKey,
            JSON.stringify(cityData)
          );
        }
      } catch (error) {
        console.error(`Error loading cities for ${watchedCountryCode}:`, error);
        // Fallback to direct loading if storage fails
        try {
          const cityData = loadCities(watchedCountryCode);
          setCities(cityData);
        } catch {
          setCities([]);
        }
      } finally {
        setLoadingCities(false);
      }
    };

    if (watchedCountryCode) {
      loadCitiesForCountry();
    }
  }, [watchedCountryCode]);

  // Update applied values when initialValues change (on modal open)
  useEffect(() => {
    if (initialValues) {
      setAppliedValues(initialValues);
    }
  }, [initialValues]);

  const handleApply = () => {
    onApplyFilters();
    setAppliedValues({ ...currentValues });
    bottomSheetRef.current?.dismiss();
  };

  const handleClear = () => {
    setValue("country", "");
    setValue("countryCode", "");
    setValue("city", "");
    setValue("matchType", "");
    setValue("maxPlayers", null);
    setCities([]);

    // The parent component will handle filtering when onApplyFilters is called
    // onApplyFilters();
    // bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetView style={{ padding: 20 }}>
      <Title>Filter Leagues</Title>

      <Controller
        name="country"
        control={control}
        render={({ field }) => (
          <ListDropdown
            label="Country"
            setSelected={(val) => {
              field.onChange(val);
              setValue("city", "");
              setValue(
                "countryCode",
                countries.find((c) => c.value === val)?.key || ""
              );
            }}
            data={countries}
            save="value"
            placeholder={loadingCountries ? "Loading..." : "Select country"}
            selectedOption={
              field.value ? { key: field.value, value: field.value } : null
            }
            loading={loadingCountries}
          />
        )}
      />

      <Spacer />

      <Controller
        name="city"
        control={control}
        render={({ field }) => (
          <ListDropdown
            label="City"
            setSelected={field.onChange}
            data={cities}
            save="value"
            placeholder={
              watchedCountryCode ? "Search cities..." : "Select country first"
            }
            selectedOption={
              field.value ? { key: field.value, value: field.value } : null
            }
            loading={loadingCities}
            disabled={!watchedCountryCode}
          />
        )}
      />

      <Spacer />
      <RadioTitle>Match Type</RadioTitle>
      <Controller
        name="matchType"
        control={control}
        render={({ field }) => (
          <RadioGroup>
            {leagueTypes.map((type) => (
              <RadioOption key={type} onPress={() => field.onChange(type)}>
                <RadioCircle selected={field.value === type} />
                <RadioLabel>{type}</RadioLabel>
              </RadioOption>
            ))}
          </RadioGroup>
        )}
      />

      <Spacer />
      <RadioTitle>Max Players</RadioTitle>
      <Controller
        name="maxPlayers"
        control={control}
        render={({ field }) => (
          <RadioGroup>
            {maxPlayersOptions.map((num) => (
              <RadioOption key={num} onPress={() => field.onChange(num)}>
                <RadioCircle selected={field.value === num} />
                <RadioLabel>{num}</RadioLabel>
              </RadioOption>
            ))}
          </RadioGroup>
        )}
      />

      <Spacer />
      <ButtonRow>
        <ApplyButton onPress={handleApply} disabled={!hasChanges}>
          <ApplyButtonText>Apply</ApplyButtonText>
        </ApplyButton>
        <ClearButton onPress={handleClear} disabled={isClearDisabled}>
          <ClearButtonText>Clear</ClearButtonText>
          <Ionicons
            name="refresh"
            size={20}
            color={isClearDisabled ? "rgba(255, 0, 0, 0.5)" : "red"}
            style={{ marginLeft: 5 }}
          />
        </ClearButton>
      </ButtonRow>
    </BottomSheetView>
  );
};

const screenWidth = Dimensions.get("window").width;

const Title = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "#fff",
  marginBottom: 15,
});

const Spacer = styled.View({ height: 20 });
const RadioTitle = styled.Text({
  color: "#fff",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 10,
});
const RadioGroup = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 15,
});
const RadioOption = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
  marginRight: 15,
});
const RadioCircle = styled.View(({ selected }) => ({
  height: 18,
  width: 18,
  borderRadius: 9,
  borderWidth: 2,
  borderColor: "#fff",
  backgroundColor: selected ? "#fff" : "transparent",
  marginRight: 8,
}));
const RadioLabel = styled.Text({ color: "#fff", fontSize: 14 });

const ButtonRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  marginTop: 20,
  marginBottom: 20,
});
const ApplyButton = styled.TouchableOpacity(({ disabled }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 8,
  width: screenWidth <= 400 ? 250 : 300,
  backgroundColor: disabled ? "#444" : "#00A2FF",
  flex: 1,
  opacity: disabled ? 0.6 : 1,
}));
const ApplyButtonText = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  fontSize: 16,
});
const ClearButton = styled.TouchableOpacity(({ disabled }) => ({
  padding: 15,
  borderRadius: 10,
  alignItems: "center",
  flex: 0.2,
  flexDirection: "row",
  justifyContent: "center",
  marginRight: 5,
  opacity: disabled ? 0.6 : 1,
}));
const ClearButtonText = styled.Text({
  color: "red",
  //   fontWeight: "bold",
  fontSize: 16,
});

export default FilterSheetModal;
