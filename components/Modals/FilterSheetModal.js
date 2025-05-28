import React, { useState, useEffect, useMemo, useCallback } from "react";
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

// Create a singleton cache to persist data across modal opens/closes
const dataCache = {
  countries: null,
  cities: {},
};

const FilterSheetModal = ({
  bottomSheetRef,
  control,
  setValue,
  onApplyFilters,
  watchedCountryCode,
  initialValues,
  isFiltering,
  isVisible,
}) => {
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [shouldLoadData, setShouldLoadData] = useState(false);

  // Store the initially applied values
  const [appliedValues, setAppliedValues] = useState(initialValues || {});

  // Watch form values
  const currentValues = useWatch({ control });

  // Reset loading state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setShouldLoadData(false);
    }
  }, [isVisible]);

  // Start loading data after modal animation completes
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShouldLoadData(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Check if there are any changes compared to applied values
  const hasChanges = useMemo(() => {
    if (!appliedValues) return false;

    return (
      currentValues.country !== appliedValues.country ||
      currentValues.city !== appliedValues.city ||
      currentValues.leagueType !== appliedValues.leagueType ||
      currentValues.maxPlayers !== appliedValues.maxPlayers
    );
  }, [currentValues, appliedValues]);

  // Determine if clear button should be disabled
  const isClearDisabled = useMemo(() => {
    return (
      !currentValues.country &&
      !currentValues.city &&
      !currentValues.leagueType &&
      !currentValues.maxPlayers
    );
  }, [currentValues]);

  // Memoized country loading function
  const loadCountriesData = useCallback(async () => {
    if (dataCache.countries) {
      setCountries(dataCache.countries);
      return;
    }

    setLoadingCountries(true);
    try {
      const storedCountries = await AsyncStorage.getItem(COUNTRIES_STORAGE_KEY);
      if (storedCountries) {
        const parsedCountries = JSON.parse(storedCountries);
        dataCache.countries = parsedCountries;
        setCountries(parsedCountries);
      } else {
        const countryData = loadCountries();
        dataCache.countries = countryData;
        setCountries(countryData);
        await AsyncStorage.setItem(
          COUNTRIES_STORAGE_KEY,
          JSON.stringify(countryData)
        );
      }
    } catch (error) {
      console.error("Error loading countries:", error);
      const countryData = loadCountries();
      dataCache.countries = countryData;
      setCountries(countryData);
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  // Load countries only when modal becomes visible and data loading is enabled
  useEffect(() => {
    if (shouldLoadData) {
      loadCountriesData();
    }
  }, [shouldLoadData, loadCountriesData]);

  // Memoized city loading function
  const loadCitiesForCountry = useCallback(async (countryCode) => {
    if (!countryCode) {
      setCities([]);
      return;
    }

    // Check cache first
    if (dataCache.cities[countryCode]) {
      setCities(dataCache.cities[countryCode]);
      return;
    }

    setLoadingCities(true);
    try {
      const storageCitiesKey = `${CITIES_STORAGE_KEY}${countryCode}`;
      const storedCities = await AsyncStorage.getItem(storageCitiesKey);

      if (storedCities) {
        const parsedCities = JSON.parse(storedCities);
        dataCache.cities[countryCode] = parsedCities;
        setCities(parsedCities);
      } else {
        const cityData = loadCities(countryCode);
        dataCache.cities[countryCode] = cityData;
        setCities(cityData);
        await AsyncStorage.setItem(storageCitiesKey, JSON.stringify(cityData));
      }
    } catch (error) {
      console.error(`Error loading cities for ${countryCode}:`, error);
      try {
        const cityData = loadCities(countryCode);
        dataCache.cities[countryCode] = cityData;
        setCities(cityData);
      } catch {
        setCities([]);
      }
    } finally {
      setLoadingCities(false);
    }
  }, []);

  // Load cities when country changes, but only if modal is visible and data loading is enabled
  useEffect(() => {
    if (shouldLoadData && watchedCountryCode) {
      loadCitiesForCountry(watchedCountryCode);
    } else if (!watchedCountryCode) {
      setCities([]);
    }
  }, [watchedCountryCode, shouldLoadData, loadCitiesForCountry]);

  // Update applied values when initialValues change (on modal open)
  useEffect(() => {
    if (initialValues) {
      setAppliedValues(initialValues);
    }
  }, [initialValues]);

  const handleApply = useCallback(async () => {
    setAppliedValues({ ...currentValues });
    await onApplyFilters();
    bottomSheetRef.current?.dismiss();
  }, [currentValues, onApplyFilters, bottomSheetRef]);

  const handleClear = useCallback(() => {
    setValue("country", "");
    setValue("countryCode", "");
    setValue("city", "");
    setValue("leagueType", "");
    setValue("maxPlayers", null);
    setCities([]);
  }, [setValue]);

  const handleCountryChange = useCallback(
    (val) => {
      setValue("country", val);
      setValue("city", "");
      setValue(
        "countryCode",
        countries.find((c) => c.value === val)?.key || ""
      );
    },
    [setValue, countries]
  );

  // Don't render content if not visible (helps with performance)
  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheetView style={{ padding: 20 }}>
      <HeaderRow>
        <Title>Filter Leagues</Title>
      </HeaderRow>

      <Controller
        name="country"
        control={control}
        render={({ field }) => (
          <ListDropdown
            label="Country"
            setSelected={(val) => {
              field.onChange(val);
              handleCountryChange(val);
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
      <RadioTitle>League Type</RadioTitle>
      <Controller
        name="leagueType"
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
        <ApplyButton
          onPress={handleApply}
          disabled={!hasChanges || isFiltering}
        >
          {isFiltering ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ApplyButtonText>Apply Filters</ApplyButtonText>
          )}
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

// Styled components remain the same...
const screenWidth = Dimensions.get("window").width;

const HeaderRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
});

const Title = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "#fff",
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

const RadioLabel = styled.Text({
  color: "#fff",
  fontSize: 14,
});

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
  padding: 15,
  borderRadius: 8,
  width: screenWidth <= 400 ? 200 : 240,
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
  flexDirection: "row",
  justifyContent: "center",
  marginRight: 5,
  opacity: disabled ? 0.6 : 1,
  minWidth: 80,
}));

const ClearButtonText = styled.Text({
  color: "red",
  fontSize: 16,
});

export default React.memo(FilterSheetModal);
