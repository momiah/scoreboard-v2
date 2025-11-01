import React, {
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import DatePicker from "../DatePicker";
import {
  tournamentSchema,
  scoreboardProfileSchema,
  courtSchema,
  gameTypes,
  tournamentModes,
  maxPlayers,
  privacyTypes,
  COMPETITION_TYPES,
} from "../../schemas/schema";
import ListDropdown from "../../components/ListDropdown/ListDropdown";
import { AntDesign } from "@expo/vector-icons";
import { uploadLeagueImage } from "../../utils/UploadLeagueImageToFirebase";
import { useForm, Controller } from "react-hook-form";
import { getLeagueLocationDetails } from "../../helpers/getLeagueLocationDetails";
import AddCourtModal from "./AddCourtModal";
import { prizeTypes } from "../../schemas/schema";
import { generateLeagueId } from "../../helpers/generateLeagueId";
import OptionSelector from "../OptionSelector";

const { width: screenWidth } = Dimensions.get("window");

// Main component
const AddTournamentModal = ({ modalVisible, setModalVisible }) => {
  // Context
  const { addCompetition, getCourts, addCourt } = useContext(LeagueContext);
  const { getUserById } = useContext(UserContext);

  // State
  const [selectedImage, setSelectedImage] = useState(null);

  // Modal state
  const [showTournamentSettingsModal, setShowTournamentSettingsModal] =
    useState(false);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);

  const [tournamentCreationLoading, setTournamentCreationLoading] =
    useState(false);

  // Court state
  const [courtsList, setCourtsList] = useState([]);
  const [courtData, setCourtData] = useState([]);
  const [courtDetails, setCourtDetails] = useState(courtSchema);
  const [selectedLocation, setSelectedLocation] = useState(
    courtDetails.location
  );

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: tournamentSchema,
  });

  // Watch form values for validation
  const tournamentName = watch("tournamentName");
  const location = watch("location");
  const startDate = watch("startDate");
  const maxPlayers = watch("maxPlayers");
  const tournamentType = watch("tournamentType");
  const tournamentMode = watch("tournamentMode");
  const privacy = watch("privacy");

  const formatCourtDetailsForList = (courtsList) =>
    courtsList.map((court) => ({
      key: court.id,
      value: court.courtName.trim(),
      description: `${court.location?.city}, ${court.location?.country}`,
      countryCode: court.location?.countryCode,
    }));

  // Load courts on component mount
  useEffect(() => {
    const loadCourts = async () => {
      const courtData = await getCourts();

      const formattedCourts = formatCourtDetailsForList(courtData);

      setCourtData(courtData);
      setCourtsList(formattedCourts);
    };
    loadCourts();
  }, []);

  const handleCourtSelect = (key) => {
    if (key === "add-new-court") {
      setShowAddCourtModal(true);
    } else {
      // Update form value
      setValue("location", key);
    }
  };
  // Get tournament admin information
  const assignTournamentAdmin = async () => {
    const currentUserId = await AsyncStorage.getItem("userId");
    if (!currentUserId) return null;

    const userInfo = await getUserById(currentUserId);
    const tournamentCreatorProfile = {
      ...scoreboardProfileSchema,
      username: userInfo.username,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      userId: userInfo.userId,
      memberSince: userInfo.profileDetail?.memberSince || "",
    };

    const tournamentOwner = {
      userId: userInfo.userId,
      username: userInfo.username,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      location: userInfo.location,
    };

    return {
      tournamentAdmin: { userId: userInfo.userId, username: userInfo.username },
      tournamentParticipant: tournamentCreatorProfile,
      tournamentOwner,
    };
  };

  // Handle image selection
  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const cropped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setSelectedImage(cropped.uri);
    }
  };

  // Handle tournament creation
  const onSubmit = async (data) => {
    console.log("Submitting tournament data:", JSON.stringify(data, null, 2));
    setTournamentCreationLoading(true);
    const tournamentId = generateLeagueId(data.tournamentName, data.startDate);

    try {
      const adminData = await assignTournamentAdmin();
      if (!adminData) return;

      let imageDownloadUrl = null;
      if (selectedImage) {
        imageDownloadUrl = await uploadLeagueImage(selectedImage, tournamentId);
      }

      const location = getLeagueLocationDetails(courtData, selectedLocation);

      const newTournament = {
        ...data,
        tournamentAdmins: [adminData.tournamentAdmin],
        tournamentsParticipants: [adminData.tournamentParticipant],
        tournamentImage: imageDownloadUrl || null,
        prizeType: prizeTypes.TROPHY,
        location,
        tournamentOwner: adminData.tournamentOwner,
        tournamentId,
      };

      console.log(
        "Creating tournament:",
        JSON.stringify(newTournament, null, 2)
      );

      await addCompetition({
        data: newTournament,
        competitionType: COMPETITION_TYPES.TOURNAMENT,
      });
      setTournamentCreationLoading(false);
      setModalVisible(false);
    } catch (err) {
      console.error("Error creating league:", err);
      setTournamentCreationLoading(false);
    }
  };

  // Step 1 validation check
  const canProceedToNext =
    tournamentName?.trim() &&
    selectedLocation &&
    Object.values(selectedLocation).some((value) => value.trim() !== "");

  // Step 2 validation check
  const confirmDisabled = !(
    startDate &&
    maxPlayers &&
    tournamentType &&
    tournamentMode &&
    privacy &&
    !tournamentCreationLoading
  );

  useEffect(() => {
    const updatedOption = courtsList.find((court) => court.value === location);
    setSelectedLocation(updatedOption || {});
  }, [location, courtsList]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <ModalContainer>
        <SafeAreaWrapper
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollContainer
            data={[1]} // Dummy single item
            keyExtractor={() => "main"}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            renderItem={() => (
              <>
                <ModalTitle>Create Tournament</ModalTitle>

                <ImagePickerContainer onPress={handleImagePick}>
                  {selectedImage ? (
                    <>
                      <TournamentImage source={{ uri: selectedImage }} />
                      <OverlayIcon>
                        <AntDesign name="pluscircleo" size={32} color="#fff" />
                      </OverlayIcon>
                    </>
                  ) : (
                    <ImagePlaceholder>
                      <AntDesign name="pluscircleo" size={32} color="#ccc" />
                      <Text style={{ color: "#ccc", marginTop: 6 }}>
                        Add Image
                      </Text>
                    </ImagePlaceholder>
                  )}
                </ImagePickerContainer>

                <FormField
                  label="Tournament Name"
                  name="tournamentName"
                  control={control}
                  error={errors.tournamentName}
                  required
                />

                <ListDropdown
                  label="Location"
                  data={courtsList}
                  selectedOption={selectedLocation || {}}
                  boxStyles={[
                    styles.box,
                    errors.location ? styles.errorBox : null,
                  ]}
                  dropdownStyles={styles.dropdown}
                  dropdownTextStyles={styles.dropdownText}
                  placeholder="Select or Add Court"
                  setSelected={(key) => handleCourtSelect(key)}
                  notFoundText="Add court location..."
                  notFoundTextFunction={() => setShowAddCourtModal(true)}
                  onDropdownOpen={() => [
                    setCourtDetails(courtSchema),
                    getCourts(),
                  ]}
                  save="value"
                />
                {errors.location && (
                  <ErrorText>{errors.location.message}</ErrorText>
                )}

                <FormField
                  label="Description"
                  name="tournamentDescription"
                  control={control}
                  error={errors.tournamentDescription}
                  multiline
                />

                <DisclaimerText>
                  Please ensure you have arranged court reservation directly
                  with the venue. Court Champs does not reserve any courts when
                  you post a game or add a tournament.
                </DisclaimerText>

                <ButtonContainer>
                  <CancelButton onPress={() => setModalVisible(false)}>
                    <CancelText>Cancel</CancelText>
                  </CancelButton>

                  <CreateButton
                    disabled={!canProceedToNext}
                    onPress={() => setShowTournamentSettingsModal(true)}
                  >
                    <CreateText>Next</CreateText>
                  </CreateButton>
                </ButtonContainer>
              </>
            )}
          />
        </SafeAreaWrapper>
      </ModalContainer>

      {showTournamentSettingsModal && (
        <ConfirmTournamentSettingsModal
          visible={showTournamentSettingsModal}
          tournamentCreationLoading={tournamentCreationLoading}
          onBack={() => setShowTournamentSettingsModal(false)}
          onConfirm={handleSubmit(onSubmit)}
          confirmDisabled={confirmDisabled}
          control={control}
          watch={watch}
          errors={errors}
          setValue={setValue}
        />
      )}

      {showAddCourtModal && (
        <AddCourtModal
          visible={showAddCourtModal}
          courtDetails={courtDetails}
          setCourtDetails={setCourtDetails}
          onClose={() => setShowAddCourtModal(false)}
          addCourt={addCourt}
          onCourtAdded={async (courtDetails) => {
            // Refresh courts list
            const courtData = await getCourts();
            const formattedCourts = formatCourtDetailsForList(courtData);
            setCourtsList(formattedCourts);
            setCourtData(courtData);
            handleCourtSelect(courtDetails.courtName);
          }}
        />
      )}
    </Modal>
  );
};

// Form Field Component for reuse
const FormField = ({
  label,
  name,
  control,
  error,
  multiline = false,
  required = false,
}) => (
  <>
    <LabelContainer>
      <Label>
        {label}
        {required && <ErrorText>*</ErrorText>}
      </Label>
      {error && <ErrorText>{error.message}</ErrorText>}
    </LabelContainer>
    <Controller
      control={control}
      name={name}
      rules={{ required: required ? `${label} is required` : false }}
      render={({ field: { onChange, onBlur, value } }) =>
        multiline ? (
          <TextAreaInput
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#ccc"
            multiline
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        ) : (
          <Input
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#ccc"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )
      }
    />
  </>
);

// Settings Modal Component
const ConfirmTournamentSettingsModal = ({
  visible,
  onBack,
  tournamentCreationLoading,
  onConfirm,
  confirmDisabled,
  watch,
  errors,
  setValue,
}) => {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <ModalContainer>
        <TournamentSettingsWrapper>
          <SupportModalScrollContainer>
            <ModalTitle>Confirm Tournament Settings</ModalTitle>
            <DatePicker
              setValue={setValue}
              watch={watch}
              errorText={errors.startDate?.message}
              hasEndDate={false}
            />

            <OptionSelector
              setValue={setValue}
              watch={watch}
              name="maxPlayers"
              label="Max Players"
              options={maxPlayers}
              errorText={errors.maxPlayers?.message}
            />

            <OptionSelector
              setValue={setValue}
              watch={watch}
              name="tournamentType"
              label="Type"
              options={gameTypes}
              errorText={errors.tournamentType?.message}
            />

            <OptionSelector
              setValue={setValue}
              watch={watch}
              name="tournamentMode"
              label="Mode"
              options={tournamentModes}
              errorText={errors.tournamentMode?.message}
            />

            <OptionSelector
              setValue={setValue}
              watch={watch}
              name="privacy"
              label="Privacy"
              options={privacyTypes}
              errorText={errors.privacy?.message}
            />
            <ButtonContainer>
              <CancelButton onPress={onBack}>
                <CancelText>Back</CancelText>
              </CancelButton>
              <CreateButton disabled={confirmDisabled} onPress={onConfirm}>
                {tournamentCreationLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <CreateText>Create</CreateText>
                )}
              </CreateButton>
            </ButtonContainer>
          </SupportModalScrollContainer>
        </TournamentSettingsWrapper>
      </ModalContainer>
    </Modal>
  );
};

const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ScrollContainer = styled.FlatList({
  padding: "40px 20px",
});

const SafeAreaWrapper = styled(KeyboardAvoidingView)({
  width: screenWidth - 40,
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.7)",
});

const TournamentSettingsWrapper = styled(SafeAreaView)({
  width: screenWidth - 40,
  margin: 20,
  borderRadius: 20,
  backgroundColor: "rgba(2, 13, 24, 0.7)",
});

const SupportModalScrollContainer = styled.ScrollView({
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

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  marginTop: 4,
});

const Input = styled.TextInput({
  height: 40,
  borderRadius: 6,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "white",
  paddingLeft: 12,
  marginBottom: 16,
});

const TextAreaInput = styled.TextInput({
  height: 100,
  borderRadius: 6,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "white",
  paddingLeft: 12,
  marginBottom: 16,
});

const LabelContainer = styled.View({
  marginBottom: 4,
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

const ImagePickerContainer = styled.TouchableOpacity({
  position: "relative",
  marginBottom: 20,
});

const TournamentImage = styled.Image({
  width: "100%",
  height: 200,
  borderRadius: 8,
});

const OverlayIcon = styled.View({
  position: "absolute",
  right: 10,
  bottom: 10,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  borderRadius: 16,
  padding: 2,
});

const DisclaimerText = styled.Text({
  color: "white",
  fontStyle: "italic",
  fontSize: 12,
});

const ImagePlaceholder = styled.View({
  width: "100%",
  height: 200,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "#ccc",
});

const styles = StyleSheet.create({
  box: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#ff7675",
  },
  dropdown: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    marginTop: 5,
  },
  dropdownText: {
    color: "#fff",
  },
});

export default AddTournamentModal;
