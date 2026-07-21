// components/Modals/CountryCitySelectionModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Dimensions,
  Platform,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ListRenderItem,
} from "react-native";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import Icon from "react-native-ico-flags";
import { loadCountries, loadCities } from "../../utils/locationData";

const { width: screenWidth } = Dimensions.get("window");

export interface LocationOption {
  key: string;
  value: string;
}

/* -------------------------------------------------------------------------- */
/*                               CountrySelector                              */
/* -------------------------------------------------------------------------- */

interface CountrySelectorProps {
  visible: boolean;
  onClose: () => void;
  /** Fires with the chosen country. `key` is the ISO code, `value` is the name. */
  onSelect: (country: LocationOption) => void;
}

export const CountrySelector = ({
  visible,
  onClose,
  onSelect,
}: CountrySelectorProps) => {
  const [search, setSearch] = useState("");
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      return;
    }

    if (countries.length) return;

    setLoading(true);
    const timeout = setTimeout(() => {
      try {
        setCountries(loadCountries());
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [visible, countries.length]);

  const filteredCountries = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return countries;
    return countries.filter((c) => c.value.toLowerCase().startsWith(term));
  }, [search, countries]);

  const renderItem: ListRenderItem<LocationOption> = ({ item }) => (
    <LocationItem
      onPress={() => {
        onSelect(item);
        setSearch("");
      }}
    >
      <FlagCircle>
        <Icon name={item.key} height="40" width="40" />
      </FlagCircle>
      <LocationName>{item.value}</LocationName>
    </LocationItem>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ModalContainer behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Wrapper>
          <Header>
            <ModalTitle>Select Country</ModalTitle>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AntDesign name="close-circle" size={26} color="red" />
            </TouchableOpacity>
          </Header>

          <SearchInput
            placeholder="Search countries..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
          />

          {loading ? (
            <LoadingWrap>
              <ActivityIndicator size="small" color="#00A2FF" />
            </LoadingWrap>
          ) : (
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EmptyText>No countries found</EmptyText>}
            />
          )}
        </Wrapper>
      </ModalContainer>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/*                                CitySelector                                */
/* -------------------------------------------------------------------------- */

interface CitySelectorProps {
  visible: boolean;
  onClose: () => void;
  /** ISO code of the previously selected country; drives which cities load. */
  countryCode: string | null;
  /** Fires with the chosen city. */
  onSelect: (city: LocationOption) => void;
}

export const CitySelector = ({
  visible,
  onClose,
  countryCode,
  onSelect,
}: CitySelectorProps) => {
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      return;
    }

    if (!countryCode) {
      setCities([]);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      try {
        setCities(loadCities(countryCode));
      } catch (e) {
        console.error(e);
        setCities([]);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [visible, countryCode]);

  const filteredCities = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return cities;
    return cities.filter((c) => c.value.toLowerCase().startsWith(term));
  }, [search, cities]);

  const renderItem: ListRenderItem<LocationOption> = ({ item }) => (
    <LocationItem
      onPress={() => {
        onSelect(item);
        setSearch("");
      }}
    >
      <LocationName>{item.value}</LocationName>
    </LocationItem>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ModalContainer behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Wrapper>
          <Header>
            <ModalTitle>Select City</ModalTitle>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AntDesign name="close-circle" size={26} color="red" />
            </TouchableOpacity>
          </Header>

          <SearchInput
            placeholder="Search cities..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
          />

          {loading ? (
            <LoadingWrap>
              <ActivityIndicator size="small" color="#00A2FF" />
            </LoadingWrap>
          ) : (
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<EmptyText>No cities found</EmptyText>}
            />
          )}
        </Wrapper>
      </ModalContainer>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Styles                                    */
/* -------------------------------------------------------------------------- */

const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const Wrapper = styled.View({
  width: screenWidth - 40,
  height: "75%",
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.95)",
  padding: 20,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
});

const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
});

const SearchInput = styled.TextInput({
  height: 42,
  borderRadius: 8,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  color: "white",
  paddingHorizontal: 12,
  marginBottom: 16,
  fontSize: 15,
});

const LocationItem = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 14,
  marginBottom: 8,
  borderRadius: 8,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
});

const LocationName = styled.Text({
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
  flexShrink: 1,
});

const FlagCircle = styled.View({
  width: 28,
  height: 28,
  borderRadius: 14,
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255, 255, 255, 0.08)",
});

const LoadingWrap = styled.View({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
});

const EmptyText = styled.Text({
  color: "#888",
  textAlign: "center",
  marginTop: 20,
});
