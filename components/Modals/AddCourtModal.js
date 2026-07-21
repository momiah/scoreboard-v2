import React, { useState, useMemo } from "react";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import {
  Modal,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  View,
  Platform,
} from "react-native";
import {
  CountrySelector,
  CitySelector,
} from "./CountryCitySelectionModal";
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

  // Country and city state
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);

  const handleChange = (key, value) => {
    setCourtDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleCountrySelected = (selectedCountry) => {
    handleChange("location", {
      ...courtDetails.location,
      country: selectedCountry.value,
      countryCode: selectedCountry.key,
      city: "",
    });
    setSelectedCountryCode(selectedCountry.key);
    setShowCitySelector(true);
  };

  const handleCitySelected = (selectedCity) => {
    handleChange("location", {
      ...courtDetails.location,
      city: selectedCity.value,
    });
    setShowCitySelector(false);
    setShowCountrySelector(false);
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
        <CourtLocationWrapper
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
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
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Label>Country / City</Label>
                <LocationButton onPress={() => setShowCountrySelector(true)}>
                  <LocationButtonText
                    selected={
                      !!(
                        courtDetails.location.country &&
                        courtDetails.location.city
                      )
                    }
                  >
                    {courtDetails.location.country && courtDetails.location.city
                      ? `${courtDetails.location.city}, ${courtDetails.location.country}`
                      : "Select country & city"}
                  </LocationButtonText>
                  <Ionicons name="chevron-forward" size={18} color="#888" />
                </LocationButton>
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
                    Adding a new court will help other players find this
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

        <CountrySelector
          visible={showCountrySelector}
          onClose={() => setShowCountrySelector(false)}
          onSelect={handleCountrySelected}
        >
          <CitySelector
            visible={showCitySelector}
            onBack={() => setShowCitySelector(false)}
            countryCode={selectedCountryCode}
            onSelect={handleCitySelected}
          />
        </CountrySelector>
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

const CourtLocationWrapper = styled(KeyboardAvoidingView)({
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

const LocationButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  height: 40,
  borderRadius: 6,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  paddingHorizontal: 12,
  marginBottom: 16,
});

const LocationButtonText = styled.Text(({ selected }) => ({
  color: selected ? "white" : "#ccc",
  fontSize: 14,
  flexShrink: 1,
}));

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
