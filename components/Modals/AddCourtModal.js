import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import {
  Modal,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  View,
} from "react-native";
import { loadCountries, loadCities } from "../../utils/locationData";
import ListDropdown from "../ListDropdown/ListDropdown";
import { Ionicons } from "@expo/vector-icons";

const AddCourtModal = ({
  visible,
  onClose,
  courtDetails,
  setCourtDetails,
  addCourt,
  onCourtAdded,
}) => {
  const [courtCreationLoading, setCourtCreationLoading] = useState(false);

  // Coutry and city state
  const [countries, setCountries] = useState([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);

  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  useEffect(() => {
    if (countries.length) return;

    setLoadingCountries(true);
    setTimeout(() => {
      try {
        const all = loadCountries();
        setCountries(all);
      } finally {
        setLoadingCountries(false);
      }
    }, 0);
  }, [countries]);

  const handleCityDropdownOpen = useCallback(async () => {
    if (!selectedCountryCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const list = loadCities(selectedCountryCode);
      setCities(list);
    } catch (e) {
      console.error(e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, [selectedCountryCode]);

  const handleChange = (key, value) => {
    setCourtDetails((prev) => ({ ...prev, [key]: value }));
  };

  const allFieldsFilled = useMemo(() => {
    return (
      courtDetails.courtName?.trim() &&
      courtDetails.location.city?.trim() &&
      courtDetails.location.country?.trim() &&
      courtDetails.location.postCode?.trim() &&
      courtDetails.location.address?.trim()
    );
  }, [courtDetails]);

  const handleAddCourt = async () => {
    try {
      setCourtCreationLoading(true);
      const newCourtId = await addCourt(courtDetails);
      console.log("courtDetails", JSON.stringify(courtDetails, null, 2));
      if (newCourtId) {
        onCourtAdded(courtDetails, newCourtId);
        onClose();
      }
    } catch (error) {
      console.error("Court creation failed:", error);
    } finally {
      setCourtCreationLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalContainer>
        <CourtLocationWrapper>
          <AddCourtScrollContainer
            data={[1]} // Dummy single item
            keyExtractor={() => "court"}
            renderItem={() => (
              <>
                <ModalTitle>Add Court Details</ModalTitle>

                <Label>Court Name</Label>
                <Input
                  value={courtDetails.courtName}
                  onChangeText={(v) => handleChange("courtName", v)}
                />
                <ListDropdown
                  label="Country"
                  setSelected={(val) => {
                    const selectedCountry = countries.find(
                      (c) => c.value === val
                    );
                    handleChange("location", {
                      ...courtDetails.location,
                      country: val,
                      countryCode: selectedCountry?.key,
                    });

                    setSelectedCountryCode(selectedCountry?.key);
                    setCities([]);
                  }}
                  data={countries}
                  save="value"
                  placeholder={
                    loadingCountries ? "Loading countries..." : "Select country"
                  }
                  selectedOption={
                    courtDetails.location.country
                      ? {
                          key: courtDetails.location.countryCode,
                          value: courtDetails.location.country,
                        }
                      : null
                  }
                  loading={loadingCountries}
                />

                {/* City Dropdown */}
                <ListDropdown
                  label="City"
                  setSelected={(val) => {
                    handleChange("location", {
                      ...courtDetails.location,
                      city: val,
                    });
                  }}
                  data={cities}
                  save="value"
                  placeholder={
                    selectedCountryCode
                      ? "Search cities..."
                      : "Select country first"
                  }
                  searchPlaceholder="Start typing..."
                  selectedOption={
                    courtDetails.location.city
                      ? {
                          key: courtDetails.location.city,
                          value: courtDetails.location.city,
                        }
                      : null
                  }
                  loading={loadingCities}
                  onDropdownOpen={handleCityDropdownOpen}
                  disabled={loadingCountries || !selectedCountryCode}
                />
                <Label>Post Code/ ZIP Code</Label>
                <Input
                  value={courtDetails.location.postCode}
                  onChangeText={(v) =>
                    handleChange("location", {
                      ...courtDetails.location,
                      postCode: v,
                    })
                  }
                />
                <Label>Address</Label>
                <Input
                  value={courtDetails.location.address}
                  onChangeText={(v) =>
                    handleChange("location", {
                      ...courtDetails.location,
                      address: v,
                    })
                  }
                />

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={"#00A2FF"}
                  />

                  <DisclaimerText>
                    Adding a new court will help other users to find this
                    location so please ensure the details are correct!
                  </DisclaimerText>
                </View>
                <ButtonContainer>
                  <CancelButton onPress={onClose}>
                    <CancelText>Cancel</CancelText>
                  </CancelButton>
                  <CreateButton
                    disabled={!allFieldsFilled}
                    onPress={handleAddCourt}
                  >
                    {courtCreationLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <CreateText>Add Court</CreateText>
                    )}
                  </CreateButton>
                </ButtonContainer>
              </>
            )}
          />
        </CourtLocationWrapper>
      </ModalContainer>
    </Modal>
  );
};

const screenWidth = Dimensions.get("window").width;

const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const CourtLocationWrapper = styled(SafeAreaView)({
  width: screenWidth - 40,
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.7)",
});

const AddCourtScrollContainer = styled.FlatList({
  padding: "40px 20px",
});

const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 20,
  textAlign: "center",
});

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 6,
});

const Input = styled.TextInput({
  height: 40,
  borderRadius: 6,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "white",
  paddingLeft: 12,
  marginBottom: 16,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 20,
});

const CancelButton = styled.TouchableOpacity({
  width: "45%",
  padding: 12,
  backgroundColor: "#9e9e9e",
  borderRadius: 6,
});

const CancelText = styled.Text({
  textAlign: "center",
  color: "white",
  fontSize: 16,
});

const CreateButton = styled.TouchableOpacity(({ disabled }) => ({
  width: "45%",
  padding: 12,
  borderRadius: 6,
  backgroundColor: disabled ? "#9e9e9e" : "#00A2FF",
  opacity: disabled ? 0.6 : 1,
}));

const CreateText = styled.Text({
  textAlign: "center",
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});

const DisclaimerText = styled.Text({
  color: "white",
  fontStyle: "italic",
  fontSize: 12,
});

export default AddCourtModal;
