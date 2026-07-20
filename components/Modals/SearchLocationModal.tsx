// components/Modals/SearchCourt.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  Dimensions,
  Platform,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
} from "react-native";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { courtSchema } from "@shared";
import { Court } from "@shared/types";
import Icon from "react-native-ico-flags";
import AddCourtModal from "./AddCourtModal";

const { width: screenWidth } = Dimensions.get("window");

const ADD_COURT_KEY = "__add_court__";

export interface CourtListItem {
  key: string;
  value: string;
  description?: string;
  countryCode?: string;
  city?: string;
  country?: string;
  address?: string;
  postCode?: string;
}

export type CourtDetails = Pick<Court, "courtName" | "location">;

interface SearchCourtProps {
  visible: boolean;
  onClose: () => void;
  courts: CourtListItem[];
  selectedCourtKey?: string;
  onSelectCourt: (value: string) => void;
  getCourts: () => Promise<Court[]>;
  addCourt: (courtDetails: CourtDetails) => Promise<string | null>;
  onCourtsRefreshed: (rawCourtData: Court[]) => void;
}

const SearchCourt = ({
  visible,
  onClose,
  courts,
  selectedCourtKey,
  onSelectCourt,
  getCourts,
  addCourt,
  onCourtsRefreshed,
}: SearchCourtProps) => {
  const [search, setSearch] = useState("");
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [courtDetails, setCourtDetails] = useState<CourtDetails>(courtSchema);

  useEffect(() => {
    if (!visible) setSearch("");
  }, [visible]);

  const filteredCourts = useMemo(() => {
    const term = search.toLowerCase().trim();

    const matched = term
      ? courts.filter((c) =>
          [c.value, c.city, c.country, c.address].some((field) =>
            field?.toLowerCase().startsWith(term),
          ),
        )
      : courts;

    const rank = (c: CourtListItem) => {
      if (c.value.toLowerCase().startsWith(term)) return 0;
      if (c.city?.toLowerCase().startsWith(term)) return 1;
      if (c.country?.toLowerCase().startsWith(term)) return 2;
      return 3;
    };

    const sorted = [...matched].sort(
      (a, b) => rank(a) - rank(b) || a.value.localeCompare(b.value),
    );

    if (!selectedCourtKey) return sorted;

    const selected = sorted.find((c) => c.key === selectedCourtKey);
    if (!selected) return sorted;

    return [selected, ...sorted.filter((c) => c.key !== selectedCourtKey)];
  }, [search, courts, selectedCourtKey]);

  const listData = useMemo<CourtListItem[]>(
    () => [...filteredCourts, { key: ADD_COURT_KEY, value: "Add Court" }],
    [filteredCourts],
  );

  const handleSelect = useCallback(
    (value: string) => {
      onSelectCourt(value);
      onClose();
    },
    [onSelectCourt, onClose],
  );

  const renderItem: ListRenderItem<CourtListItem> = useCallback(
    ({ item }) => {
      if (item.key === ADD_COURT_KEY) {
        return (
          <AddCourtItem onPress={() => setShowAddCourtModal(true)}>
            <AntDesign name="plus-circle" size={18} color="#00A2FF" />
            <AddCourtText>Add Court</AddCourtText>
          </AddCourtItem>
        );
      }

      const isSelected = item.key === selectedCourtKey;
      return (
        <CourtItem
          isSelected={isSelected}
          onPress={() => handleSelect(item.value)}
        >
          <CourtTextWrap>
            <CourtName isSelected={isSelected}>{item.value}</CourtName>
            <CourtLocation isSelected={isSelected}>
              {item?.address}, {item?.city}, {item?.country}
            </CourtLocation>
          </CourtTextWrap>
          <ItemRight>
            {isSelected && <AntDesign name="check" size={18} color="#00A2FF" />}
            {item.countryCode ? (
              <FlagCircle>
                <Icon name={item.countryCode} height="40" width="40" />
              </FlagCircle>
            ) : null}
          </ItemRight>
        </CourtItem>
      );
    },
    [selectedCourtKey, handleSelect],
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
            <ModalTitle>Select Court</ModalTitle>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AntDesign name="close-circle" size={26} color="red" />
            </TouchableOpacity>
          </Header>

          <SearchInput
            placeholder="Search courts..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
          />

          <FlatList
            data={listData}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          />
        </Wrapper>

        {showAddCourtModal && (
          <AddCourtModal
            visible={showAddCourtModal}
            courtDetails={courtDetails}
            setCourtDetails={setCourtDetails}
            onClose={() => setShowAddCourtModal(false)}
            addCourt={addCourt}
            onCourtAdded={async (newCourt: CourtDetails) => {
              const courtData = await getCourts();
              onCourtsRefreshed(courtData);
              handleSelect(newCourt.courtName);
            }}
          />
        )}
      </ModalContainer>
    </Modal>
  );
};

const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(2, 13, 24, 0.9)",
});

const Wrapper = styled.View({
  width: screenWidth - 40,
  height: "80%",
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

const CourtItem = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: isSelected
      ? "rgba(0, 162, 255, 0.12)"
      : "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: isSelected ? "#00A2FF" : "transparent",
  }),
);

const CourtTextWrap = styled.View({
  flex: 1,
});

const CourtName = styled.Text<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    color: isSelected ? "#00A2FF" : "#fff",
    fontSize: 15,
    fontWeight: "600",
  }),
);

const CourtLocation = styled.Text<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    color: isSelected ? "rgba(0, 162, 255, 0.7)" : "#888",
    fontSize: 12,
    marginTop: 2,
  }),
);

const AddCourtItem = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: 14,
  marginBottom: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderStyle: "dashed",
  backgroundColor: "rgba(0, 162, 255, 0.08)",
});

const AddCourtText = styled.Text({
  color: "#00A2FF",
  fontWeight: "600",
  fontSize: 15,
});

const ItemRight = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
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

export default SearchCourt;
